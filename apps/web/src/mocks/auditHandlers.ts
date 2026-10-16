import {
  auditKindOf,
  auditLogListQuerySchema,
  type AuditChange,
  type AuditAction,
  type AuditLog,
  type AuditTargetType,
  type ErrorCode,
  VALIDATION_MESSAGES,
} from '@field-note/shared';
import { http, HttpResponse } from 'msw';

import type { MockAccount } from './data';
import { getCurrentAccount } from './state';
import { mockDelay } from './latency';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
};

const MOCK_USER_ID = '0198d000-0000-7000-8000-000000000001';

// 목업 저장소: 회사별 감사 기록 (새로고침하면 초기화), 실제 서버는 각 기능이 기록을 남기고 이 화면은 읽기 전용
const stores = new Map<string, AuditLog[]>();

export const resetMockAudit = () => stores.clear();

const scopeOf = (account: MockAccount) => account.companyId ?? account.loginId;

const PROJECT_A = '0198d000-0000-7000-8000-000000000301';

const mockLog = (
  account: MockAccount,
  entry: Omit<
    AuditLog,
    'id' | 'kind' | 'actorId' | 'actorName' | 'changes' | 'projectId' | 'projectName'
  > & {
    changes?: AuditChange[];
    projectId?: string | null;
    projectName?: string | null;
  },
): AuditLog => ({
  id: crypto.randomUUID(),
  kind: auditKindOf(entry.action),
  actorId: MOCK_USER_ID,
  actorName: account.displayName,
  changes: entry.changes ?? [],
  projectId: entry.projectId ?? null,
  projectName: entry.projectName ?? null,
  ...entry,
});

// 처음 열었을 때 보이는 더미 기록 (시드의 직원·문서 id는 쓰지 않고 이름만 보여 줌)
const seedOf = (account: MockAccount): AuditLog[] => [
  mockLog(account, {
    action: 'WORK_LOG_UPDATED',
    targetType: 'PROJECT',
    targetId: PROJECT_A,
    targetName: 'A동 외장 판금 공사',
    projectId: PROJECT_A,
    projectName: 'A동 외장 판금 공사',
    summary: '2026-10-05 · 10시간 · 3명',
    changes: [
      { label: '작업 시간', before: '8시간', after: '10시간' },
      { label: '작업 인원', before: '2명', after: '3명' },
    ],
    createdAt: '2026-10-05T01:20:00.000Z',
  }),
  mockLog(account, {
    action: 'EMPLOYEE_UPDATED',
    targetType: 'EMPLOYEE',
    targetId: '0198d000-0000-7000-8000-000000000101',
    targetName: '정판금',
    summary: '직책·연락처',
    changes: [
      { label: '직책', before: '기공', after: '반장' },
      { label: '연락처', before: null, after: null },
    ],
    createdAt: '2026-10-05T05:40:00.000Z',
  }),
  mockLog(account, {
    action: 'REPORT_EXPORTED',
    targetType: 'PROJECT',
    targetId: PROJECT_A,
    targetName: 'A동 외장 판금 공사',
    projectId: PROJECT_A,
    projectName: 'A동 외장 판금 공사',
    summary: '작업일보 엑셀 · 2026-10-01 ~ 2026-10-04',
    createdAt: '2026-10-06T08:00:00.000Z',
  }),
  mockLog(account, {
    action: 'PHOTO_DELETED',
    targetType: 'PROJECT',
    targetId: PROJECT_A,
    targetName: 'A동 외장 판금 공사',
    projectId: PROJECT_A,
    projectName: 'A동 외장 판금 공사',
    summary: '3층 301호 · 2026-10-05',
    createdAt: '2026-10-07T02:10:00.000Z',
  }),
];

const storeOf = (account: MockAccount) => {
  const existing = stores.get(scopeOf(account));

  if (existing) return existing;

  const created = seedOf(account);

  stores.set(scopeOf(account), created);

  return created;
};

/**
 * @description 다른 목업이 감사 기록을 남길 때 씀 (서버가 같은 트랜잭션에서 기록을 남기는 것을 흉내)
 * @param account 현재 계정
 * @param entry 행위와 대상
 */
export const addMockAudit = (
  account: MockAccount,
  entry: {
    action: AuditAction;
    targetType: AuditTargetType;
    targetId: string;
    targetName: string | null;
    summary: string | null;
  },
) => {
  storeOf(account).push(mockLog(account, { createdAt: new Date().toISOString(), ...entry }));
};

const DAY_MS = 86_400_000;

// 서울 기준 날짜의 시작 시각 (UTC+9)
const seoulStart = (date: string) => new Date(`${date}T00:00:00+09:00`).getTime();

/**
 * @description 기록 조회 목업 핸들러 (서버와 같은 규칙: 최근순, 행위·날짜 범위, 커서)
 * @param helpers 목업 공통 오류 응답
 */
export const createAuditHandlers = ({ apiError }: Helpers) => [
  http.get('/api/v1/audit-logs', async ({ request }) => {
    await mockDelay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const query = auditLogListQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    if (!query.success) {
      return apiError(
        'VALIDATION_ERROR',
        query.error.issues.map((issue) => ({
          path: `query.${issue.path.join('.')}`,
          message: issue.message,
        })),
      );
    }

    const { action, kind, projectId, from, to, cursor, limit } = query.data;
    const sorted = [...storeOf(account)]
      .filter(
        (item) =>
          (!action || item.action === action) &&
          (!kind || item.kind === kind) &&
          (!projectId || item.projectId === projectId) &&
          (!from || Date.parse(item.createdAt) >= seoulStart(from)) &&
          (!to || Date.parse(item.createdAt) < seoulStart(to) + DAY_MS),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    // 커서는 마지막으로 본 항목의 id
    const start = cursor ? sorted.findIndex((item) => item.id === cursor) + 1 : 0;

    if (cursor && start === 0) {
      return apiError('VALIDATION_ERROR', [
        { path: 'query.cursor', message: VALIDATION_MESSAGES.LIST_CURSOR_INVALID },
      ]);
    }

    const page = sorted.slice(start, start + limit);

    return HttpResponse.json({
      items: page,
      nextCursor: start + limit < sorted.length ? page[page.length - 1]!.id : null,
    });
  }),
];
