import {
  memoCreateSchema,
  memoListQuerySchema,
  memoParamsSchema,
  memoUpdateSchema,
  todayInSeoul,
  type ErrorCode,
  type Memo,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import type { MockAccount } from './data';
import { getCurrentAccount, getProjects } from './state';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

type MockMemo = Memo & { scope: string; deletedAt?: string };

// 목업 저장소: 회사별 메모 (새로고침하면 초기화)
const memos = new Map<string, MockMemo>();
const seeded = new Set<string>();

export const resetMockMemos = () => {
  memos.clear();
  seeded.clear();
};

// 목업의 업로더 (계약 스키마가 UUID를 요구)
const MOCK_USER_ID = '0198d000-0000-7000-8000-000000000001';

// 회사 구분 값 (회사가 없는 가입 직후 계정은 계정 단위로 나눔)
const scopeOf = (account: MockAccount) => account.companyId ?? account.loginId;

// 응답에는 목업 내부 값(회사 구분, 삭제 표시)을 싣지 않음
const toMemo = (memo: MockMemo): Memo => ({
  id: memo.id,
  projectId: memo.projectId,
  content: memo.content,
  tag: memo.tag,
  memoDate: memo.memoDate,
  isDone: memo.isDone,
  doneAt: memo.doneAt,
  createdBy: memo.createdBy,
  createdAt: memo.createdAt,
  updatedAt: memo.updatedAt,
});

const add = (
  account: MockAccount,
  projectId: string | null,
  content: string,
  tag: Memo['tag'],
  memoDate: string,
  isDone = false,
) => {
  const id = crypto.randomUUID();
  const at = new Date(`${memoDate}T03:00:00.000Z`).toISOString();

  memos.set(id, {
    id,
    scope: scopeOf(account),
    projectId,
    content,
    tag,
    memoDate,
    isDone,
    doneAt: isDone ? at : null,
    createdBy: MOCK_USER_ID,
    createdAt: at,
    updatedAt: at,
  });
};

// 더미 메모: 메모함 3건(할 일 포함)과 첫 프로젝트의 메모 노트 (화면 확인용)
const seed = (account: MockAccount) => {
  if (seeded.has(scopeOf(account))) return;

  seeded.add(scopeOf(account));
  add(account, null, '301호 천장 높이 다시 확인', 'TODO', '2026-10-07');
  add(
    account,
    null,
    '발주처 담당자 전화 회신 받음 - 외장 색상 변경 가능성',
    'NEGOTIATION',
    '2026-10-06',
  );
  add(account, null, '자재 반입 시간 협의', 'OTHER', '2026-10-06');

  for (const project of getProjects(account)) {
    add(account, project.id, '철거 후 바닥 상태 불량, 보수 필요', 'ISSUE', '2026-10-05');
    add(account, project.id, '내일까지 샘플 승인받기', 'TODO', '2026-10-06');
    add(
      account,
      project.id,
      '고객이 마감 색상을 회색으로 지시',
      'INSTRUCTION',
      '2026-10-07',
      false,
    );
    add(account, project.id, '안전교육 일정 확인', 'TODO', '2026-10-04', true);
  }
};

const live = (account: MockAccount) => {
  seed(account);

  return [...memos.values()].filter((memo) => memo.scope === scopeOf(account) && !memo.deletedAt);
};

// 검색 목업이 쓰는 메모 조회 (지운 메모 제외)
export const listMockMemos = (account: MockAccount) => live(account).map(toMemo);

const newestFirst = (a: MockMemo, b: MockMemo) =>
  b.memoDate.localeCompare(a.memoDate) || b.id.localeCompare(a.id);

/**
 * @description 메모함·프로젝트 메모 노트 API 목업 핸들러 (실제 서버와 같은 규칙: 완료는 할 일만, 프로젝트 연결·메모함 되돌리기, 소프트 삭제)
 * @param helpers 공통 오류 응답과 본문 검증 함수 (handlers.ts와 같은 규칙)
 * @returns msw 핸들러 목록
 */
export const createMemoHandlers = ({ apiError, parseBody }: Helpers) => {
  const latency = () => delay(300);

  const hasProject = (account: MockAccount, projectId: string) =>
    getProjects(account).some((project) => project.id === projectId);

  return [
    http.post('/api/v1/memos', async ({ request }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const body = await parseBody(request, memoCreateSchema);

      if ('response' in body) return body.response;

      if (body.data.projectId && !hasProject(account, body.data.projectId)) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.projectId', message: '선택할 수 없는 프로젝트입니다' },
        ]);
      }

      seed(account);
      add(
        account,
        body.data.projectId ?? null,
        body.data.content,
        body.data.tag,
        body.data.memoDate ?? todayInSeoul(new Date()),
      );

      const created = [...memos.values()].at(-1)!;

      return HttpResponse.json(toMemo(created), { status: 201 });
    }),

    http.get('/api/v1/memos/summary', async () => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const items = live(account);

      return HttpResponse.json({
        inboxCount: items.filter((memo) => memo.projectId === null).length,
        openTodoCount: items.filter((memo) => memo.tag === 'TODO' && !memo.isDone).length,
      });
    }),

    http.get('/api/v1/memos', async ({ request }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const query = memoListQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      if (!query.success) {
        return apiError(
          'VALIDATION_ERROR',
          query.error.issues.map((issue) => ({
            path: ['query', ...issue.path].join('.'),
            message: issue.message,
          })),
        );
      }

      const { scope, projectId, tag, isDone, cursor, limit } = query.data;

      if (scope === 'PROJECT' && !hasProject(account, projectId!)) return apiError('NOT_FOUND');

      const sorted = live(account)
        .filter(
          (memo) =>
            (scope === 'INBOX' ? memo.projectId === null : memo.projectId === projectId) &&
            (!tag || memo.tag === tag) &&
            (isDone === undefined || memo.isDone === isDone),
        )
        .sort(newestFirst);
      // 목업의 커서는 읽은 개수
      const start = cursor ? Number(cursor) : 0;

      return HttpResponse.json({
        items: sorted.slice(start, start + limit).map(toMemo),
        nextCursor: start + limit < sorted.length ? String(start + limit) : null,
      });
    }),

    http.get('/api/v1/memos/:id', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = memoParamsSchema.safeParse(params);
      const memo = parsed.success
        ? live(account).find((item) => item.id === parsed.data.id)
        : undefined;

      return memo ? HttpResponse.json(toMemo(memo)) : apiError('NOT_FOUND');
    }),

    http.patch('/api/v1/memos/:id', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = memoParamsSchema.safeParse(params);
      const body = await parseBody(request, memoUpdateSchema);

      if ('response' in body) return body.response;

      const memo = parsed.success
        ? live(account).find((item) => item.id === parsed.data.id)
        : undefined;

      if (!memo) return apiError('NOT_FOUND');

      const input = body.data;
      const tag = input.tag ?? memo.tag;

      if (input.projectId && !hasProject(account, input.projectId)) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.projectId', message: '선택할 수 없는 프로젝트입니다' },
        ]);
      }

      if (input.isDone && tag !== 'TODO') {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.isDone', message: '완료 표시는 "할 일" 메모에만 할 수 있습니다' },
        ]);
      }

      let doneAt = memo.doneAt;

      if (tag !== 'TODO' || input.isDone === false) {
        doneAt = null;
      } else if (input.isDone && !doneAt) {
        doneAt = new Date().toISOString();
      }

      Object.assign(memo, {
        content: input.content ?? memo.content,
        tag,
        memoDate: input.memoDate ?? memo.memoDate,
        projectId: input.projectId === undefined ? memo.projectId : input.projectId,
        doneAt,
        isDone: doneAt !== null,
        updatedAt: new Date().toISOString(),
      });

      return HttpResponse.json(toMemo(memo));
    }),

    http.delete('/api/v1/memos/:id', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = memoParamsSchema.safeParse(params);
      const memo = parsed.success
        ? live(account).find((item) => item.id === parsed.data.id)
        : undefined;

      if (!memo) return apiError('NOT_FOUND');

      memo.deletedAt = new Date().toISOString();

      return HttpResponse.json({ success: true });
    }),
  ];
};
