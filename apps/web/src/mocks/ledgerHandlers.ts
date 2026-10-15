import {
  compareLedgerEntries,
  ledgerEntryCreateSchema,
  ledgerEntryListQuerySchema,
  ledgerEntryParamsSchema,
  ledgerEntryUpdateSchema,
  ledgerSummaryQuerySchema,
  projectFileParamsSchema,
  summarizeLedger,
  type ErrorCode,
  type LedgerEntry,
  type LedgerKind,
  type OptionKind,
} from '@field-note/shared';
import { http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import type { MockAccount } from './data';
import { mockDelay } from './latency';
import { getCurrentAccount, getOptions, getPartners, getProjects } from './state';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

type MockEntry = LedgerEntry & { scope: string; deletedAt?: string };

// 목업 저장소: 회사별 지출·수입 기록 (새로고침하면 초기화), 실제 서버 동작을 모사
const entries = new Map<string, MockEntry>();
const seeded = new Set<string>();

export const resetMockLedger = () => {
  entries.clear();
  seeded.clear();
};

// 목업의 작성자 (계약 스키마가 UUID를 요구)
const MOCK_USER_ID = '0198d000-0000-7000-8000-000000000001';

// 회사 구분 값 (회사가 없는 가입 직후 계정은 계정 단위로 나눔)
const scopeOf = (account: MockAccount) => account.companyId ?? account.loginId;

// 구분마다 쓰는 분류 목록이 다르다 (서버와 같은 규칙)
const CATEGORY_KIND: Record<LedgerKind, OptionKind> = {
  EXPENSE: 'EXPENSE_CATEGORY',
  INCOME: 'INCOME_CATEGORY',
};

const addEntry = (
  account: MockAccount,
  projectId: string,
  input: {
    entryDate: string;
    kind: LedgerKind;
    amount: number;
    categoryId?: string | null;
    partnerId?: string | null;
    content?: string | null;
    documentId?: string | null;
    changeWorkId?: string | null;
  },
) => {
  const at = new Date().toISOString();
  const entry: MockEntry = {
    id: crypto.randomUUID(),
    scope: scopeOf(account),
    projectId,
    entryDate: input.entryDate,
    kind: input.kind,
    categoryId: input.categoryId ?? null,
    amount: input.amount,
    partnerId: input.partnerId ?? null,
    content: input.content ?? null,
    documentId: input.documentId ?? null,
    changeWorkId: input.changeWorkId ?? null,
    createdBy: MOCK_USER_ID,
    createdAt: at,
    updatedAt: at,
  };

  entries.set(entry.id, entry);

  return entry;
};

// 더미 기록: 프로젝트마다 지출 몇 건과 고철 판매 수입 한 건
const seed = (account: MockAccount) => {
  if (seeded.has(scopeOf(account))) return;

  seeded.add(scopeOf(account));

  const options = getOptions(account);
  const categoryOf = (kind: OptionKind, name: string) =>
    options.find((item) => item.kind === kind && item.name === name)?.id;

  for (const project of getProjects(account)) {
    addEntry(account, project.id, {
      entryDate: '2026-10-05',
      kind: 'EXPENSE',
      amount: 84000,
      categoryId: categoryOf('EXPENSE_CATEGORY', '부자재'),
      content: '실리콘 코킹 20개',
    });
    addEntry(account, project.id, {
      entryDate: '2026-10-06',
      kind: 'EXPENSE',
      amount: 36000,
      categoryId: categoryOf('EXPENSE_CATEGORY', '식대'),
      content: '점심 6명',
    });
    addEntry(account, project.id, {
      entryDate: '2026-10-08',
      kind: 'EXPENSE',
      amount: 150000,
      categoryId: categoryOf('EXPENSE_CATEGORY', '장비'),
      content: '타공기 대여',
    });
    addEntry(account, project.id, {
      entryDate: '2026-10-09',
      kind: 'INCOME',
      amount: 70000,
      categoryId: categoryOf('INCOME_CATEGORY', '고철 판매'),
      content: '철거 고철',
    });
  }
};

const toEntry = (entry: MockEntry): LedgerEntry => ({
  id: entry.id,
  projectId: entry.projectId,
  entryDate: entry.entryDate,
  kind: entry.kind,
  categoryId: entry.categoryId,
  amount: entry.amount,
  partnerId: entry.partnerId,
  content: entry.content,
  documentId: entry.documentId,
  changeWorkId: entry.changeWorkId,
  createdBy: entry.createdBy,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

/**
 * @description 한 프로젝트의 지출·수입 기록 (지운 것 제외). 다른 목업(개요 합계 등)이 쓴다
 * @param account 현재 계정
 * @param projectId 프로젝트 ID
 * @returns 기록 목록
 */
export const listMockLedgerEntries = (account: MockAccount, projectId: string) => {
  seed(account);

  return [...entries.values()].filter(
    (entry) =>
      entry.scope === scopeOf(account) && entry.projectId === projectId && !entry.deletedAt,
  );
};

type Filter = {
  kind?: LedgerKind;
  categoryId?: string;
  from?: string;
  to?: string;
  date?: string;
};

// 내역과 합계가 같은 조건을 쓰도록 한곳에서 필터링
const filtered = (list: MockEntry[], filter: Filter) =>
  list.filter(
    (entry) =>
      (!filter.kind || entry.kind === filter.kind) &&
      (!filter.categoryId || entry.categoryId === filter.categoryId) &&
      (!filter.date || entry.entryDate === filter.date) &&
      (!filter.from || entry.entryDate >= filter.from) &&
      (!filter.to || entry.entryDate <= filter.to),
  );

/**
 * @description 지출·수입 API 목업 핸들러 (실제 서버와 같은 규칙: 구분에 맞는 분류만, 구분을 바꾸면 분류 비움, 소프트 삭제, 합계는 같은 필터)
 * @param helpers 공통 오류 응답과 본문 검증 함수 (handlers.ts와 같은 규칙)
 * @returns msw 핸들러 목록
 */
export const createLedgerHandlers = ({ apiError, parseBody }: Helpers) => {
  const latency = () => mockDelay(300);

  const hasProject = (account: MockAccount, projectId: string) =>
    getProjects(account).some((project) => project.id === projectId);

  // 기록 한 건의 참조 검사: 문제가 있으면 오류 응답을 돌려줌
  const checkReferences = (
    account: MockAccount,
    ref: { kind: LedgerKind; categoryId?: string | null; partnerId?: string | null },
  ) => {
    if (
      ref.categoryId &&
      !getOptions(account).some(
        (option) => option.id === ref.categoryId && option.kind === CATEGORY_KIND[ref.kind],
      )
    ) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.categoryId', message: '선택할 수 없는 분류입니다' },
      ]);
    }

    if (ref.partnerId && !getPartners(account).some((partner) => partner.id === ref.partnerId)) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.partnerId', message: '선택할 수 없는 업체입니다' },
      ]);
    }

    return null;
  };

  const liveEntry = (account: MockAccount, id: string) => {
    seed(account);

    return [...entries.values()].find(
      (entry) => entry.scope === scopeOf(account) && entry.id === id && !entry.deletedAt,
    );
  };

  const unauthorized = () => apiError('UNAUTHORIZED');

  return [
    http.post('/api/v1/projects/:projectId/ledger-entries', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const path = projectFileParamsSchema.safeParse(params);
      const body = await parseBody(request, ledgerEntryCreateSchema);

      if ('response' in body) return body.response;

      if (!path.success || !hasProject(account, path.data.projectId)) return apiError('NOT_FOUND');

      const problem = checkReferences(account, body.data);

      if (problem) return problem;

      seed(account);

      return HttpResponse.json(toEntry(addEntry(account, path.data.projectId, body.data)), {
        status: 201,
      });
    }),

    http.get('/api/v1/projects/:projectId/ledger-entries', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const path = projectFileParamsSchema.safeParse(params);
      const query = ledgerEntryListQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      if (!query.success) return apiError('VALIDATION_ERROR');

      if (!path.success || !hasProject(account, path.data.projectId)) return apiError('NOT_FOUND');

      const { cursor, limit, ...filter } = query.data;
      const sorted = filtered(listMockLedgerEntries(account, path.data.projectId), filter).sort(
        compareLedgerEntries,
      );
      // 목업의 커서는 읽은 개수
      const start = cursor ? Number(cursor) : 0;

      return HttpResponse.json({
        items: sorted.slice(start, start + limit).map(toEntry),
        nextCursor: start + limit < sorted.length ? String(start + limit) : null,
      });
    }),

    http.get('/api/v1/projects/:projectId/ledger-summary', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const path = projectFileParamsSchema.safeParse(params);
      const query = ledgerSummaryQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      if (!query.success) return apiError('VALIDATION_ERROR');

      if (!path.success || !hasProject(account, path.data.projectId)) return apiError('NOT_FOUND');

      return HttpResponse.json(
        summarizeLedger(filtered(listMockLedgerEntries(account, path.data.projectId), query.data)),
      );
    }),

    http.patch('/api/v1/ledger-entries/:id', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const parsed = ledgerEntryParamsSchema.safeParse(params);
      const body = await parseBody(request, ledgerEntryUpdateSchema);

      if ('response' in body) return body.response;

      const entry = parsed.success ? liveEntry(account, parsed.data.id) : undefined;

      if (!entry) return apiError('NOT_FOUND');

      const kind = body.data.kind ?? entry.kind;
      // 구분이 바뀌는데 새 분류를 안 보내면 분류를 비운다 (서버와 같은 규칙)
      const categoryId =
        body.data.categoryId !== undefined
          ? body.data.categoryId
          : kind !== entry.kind
            ? null
            : undefined;
      const problem = checkReferences(account, {
        kind,
        categoryId,
        partnerId: body.data.partnerId,
      });

      if (problem) return problem;

      Object.assign(entry, {
        ...Object.fromEntries(Object.entries(body.data).filter(([, value]) => value !== undefined)),
        ...(categoryId === undefined ? {} : { categoryId }),
        updatedAt: new Date().toISOString(),
      });

      return HttpResponse.json(toEntry(entry));
    }),

    http.delete('/api/v1/ledger-entries/:id', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const parsed = ledgerEntryParamsSchema.safeParse(params);
      const entry = parsed.success ? liveEntry(account, parsed.data.id) : undefined;

      if (!entry) return apiError('NOT_FOUND');

      entry.deletedAt = new Date().toISOString();

      return HttpResponse.json({ success: true });
    }),
  ];
};
