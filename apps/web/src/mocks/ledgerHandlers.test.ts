import {
  errorResponseSchema,
  ledgerEntriesResponseSchema,
  ledgerEntrySchema,
  ledgerSummarySchema,
  optionsResponseSchema,
  projectsResponseSchema,
  type OptionKind,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { DEMO_ACCOUNTS } from './data';
import { handlers } from './handlers';
import { resetMockLedger } from './ledgerHandlers';
import { resetMockState } from './state';

// 목업 응답이 서버 계약(공유 스키마)을 지키는지 검사 (handlers.test.ts와 같은 방식)
Object.defineProperty(globalThis, 'location', {
  value: new URL('http://localhost/'),
  configurable: true,
});

const server = setupServer(...handlers);
let client: ReturnType<typeof createApiClient>;
const demo = DEMO_ACCOUNTS[0]!;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  client = createApiClient('http://localhost');
});
afterEach(() => {
  resetMockState();
  resetMockLedger();
});
afterAll(() => server.close());

const setup = async () => {
  await client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

  const { data } = await client.GET('/api/v1/projects', { params: { query: {} } });
  const options = optionsResponseSchema.parse(
    (await client.GET('/api/v1/company/options')).data,
  ).items;

  return {
    projectId: projectsResponseSchema.parse(data).items[0]!.id,
    optionId: (kind: OptionKind, name: string) =>
      options.find((item) => item.kind === kind && item.name === name)!.id,
  };
};

describe('지출·수입 목업 서버 계약', () => {
  it('로그인하지 않으면 401이다', async () => {
    const { response } = await client.GET('/api/v1/projects/{projectId}/ledger-entries', {
      params: { path: { projectId: '0198d000-0000-7000-8000-0000000000a1' }, query: {} },
    });

    expect(response.status).toBe(401);
  });

  it('더미 기록이 최근 날짜순으로 나오고 합계가 지출·수입을 따로 낸다', async () => {
    const { projectId } = await setup();
    const list = ledgerEntriesResponseSchema.parse(
      (
        await client.GET('/api/v1/projects/{projectId}/ledger-entries', {
          params: { path: { projectId }, query: {} },
        })
      ).data,
    );

    expect(list.items.map((item) => item.entryDate)).toEqual([
      '2026-10-09',
      '2026-10-08',
      '2026-10-06',
      '2026-10-05',
    ]);

    const summary = ledgerSummarySchema.parse(
      (
        await client.GET('/api/v1/projects/{projectId}/ledger-summary', {
          params: { path: { projectId }, query: {} },
        })
      ).data,
    );

    expect(summary).toMatchObject({ expenseTotal: 270000, incomeTotal: 70000, entryCount: 4 });

    const onlyExpense = ledgerSummarySchema.parse(
      (
        await client.GET('/api/v1/projects/{projectId}/ledger-summary', {
          params: { path: { projectId }, query: { kind: 'EXPENSE', from: '2026-10-07' } },
        })
      ).data,
    );

    expect(onlyExpense).toMatchObject({ expenseTotal: 150000, incomeTotal: 0, entryCount: 1 });
  });

  it('구분에 맞지 않는 분류와 잘못된 금액은 거부한다', async () => {
    const { projectId, optionId } = await setup();
    const wrongCategory = await client.POST('/api/v1/projects/{projectId}/ledger-entries', {
      params: { path: { projectId } },
      body: {
        entryDate: '2026-10-10',
        kind: 'INCOME',
        amount: 1000,
        categoryId: optionId('EXPENSE_CATEGORY', '부자재'),
      },
    });

    expect(wrongCategory.response.status).toBe(400);
    expect(errorResponseSchema.parse(wrongCategory.error).error.code).toBe('VALIDATION_ERROR');

    const zero = await client.POST('/api/v1/projects/{projectId}/ledger-entries', {
      params: { path: { projectId } },
      body: { entryDate: '2026-10-10', kind: 'EXPENSE', amount: 0 },
    });

    expect(zero.response.status).toBe(400);
  });

  it('구분을 바꾸면 분류가 비워지고, 지우면 목록과 합계에서 빠진다', async () => {
    const { projectId, optionId } = await setup();
    const created = ledgerEntrySchema.parse(
      (
        await client.POST('/api/v1/projects/{projectId}/ledger-entries', {
          params: { path: { projectId } },
          body: {
            entryDate: '2026-10-10',
            kind: 'EXPENSE',
            amount: 5000,
            categoryId: optionId('EXPENSE_CATEGORY', '운반'),
          },
        })
      ).data,
    );
    const changed = ledgerEntrySchema.parse(
      (
        await client.PATCH('/api/v1/ledger-entries/{id}', {
          params: { path: { id: created.id } },
          body: { kind: 'INCOME' },
        })
      ).data,
    );

    expect(changed).toMatchObject({ kind: 'INCOME', categoryId: null });

    expect(
      (
        await client.DELETE('/api/v1/ledger-entries/{id}', {
          params: { path: { id: created.id } },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (
        await client.DELETE('/api/v1/ledger-entries/{id}', {
          params: { path: { id: created.id } },
        })
      ).response.status,
    ).toBe(404);

    const summary = ledgerSummarySchema.parse(
      (
        await client.GET('/api/v1/projects/{projectId}/ledger-summary', {
          params: { path: { projectId }, query: {} },
        })
      ).data,
    );

    expect(summary.entryCount).toBe(4);
  });
});
