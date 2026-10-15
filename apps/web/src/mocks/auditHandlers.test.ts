import { auditLogsResponseSchema } from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { resetMockAudit } from './auditHandlers';
import { DEMO_ACCOUNTS } from './data';
import { handlers } from './handlers';
import { resetMockMonthly } from './monthlyHandlers';
import { resetMockState } from './state';

// 목업 응답이 서버 계약(공유 스키마)을 지키는지 검사 (handlers.test.ts와 같은 방식)
Object.defineProperty(globalThis, 'location', {
  value: new URL('http://localhost/'),
  configurable: true,
});

jest.setTimeout(60_000);

const server = setupServer(...handlers);
let client: ReturnType<typeof createApiClient>;
const demo = DEMO_ACCOUNTS[0]!;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  client = createApiClient('http://localhost');
});
afterEach(() => {
  resetMockState();
  resetMockAudit();
  resetMockMonthly();
});
afterAll(() => server.close());

const login = () =>
  client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

const list = async (query: Record<string, string> = {}) =>
  auditLogsResponseSchema.parse(
    (await client.GET('/api/v1/audit-logs', { params: { query: query as never } })).data,
  );

describe('기록 조회 목업', () => {
  it('로그인하지 않으면 거부한다', async () => {
    expect(
      (await client.GET('/api/v1/audit-logs', { params: { query: {} } })).response.status,
    ).toBe(401);
  });

  it('더미 기록이 최근순으로 나온다', async () => {
    await login();

    const { items, nextCursor } = await list();

    expect(items.map((item) => item.action)).toEqual([
      'PHOTO_DELETED',
      'REPORT_EXPORTED',
      'EMPLOYEE_UPDATED',
      'WORK_LOG_UPDATED',
    ]);
    expect(items[3]!.changes).toEqual([
      { label: '작업 시간', before: '8시간', after: '10시간' },
      { label: '작업 인원', before: '2명', after: '3명' },
    ]);
    expect(nextCursor).toBeNull();

    // 종류와 프로젝트로도 필터
    expect((await list({ kind: 'DELETE' })).items.map((item) => item.action)).toEqual([
      'PHOTO_DELETED',
    ]);
    expect((await list({ kind: 'DELETE', action: 'WORK_LOG_UPDATED' })).items).toEqual([]);
    expect((await list({ projectId: '0198d000-0000-7000-8000-000000000301' })).items).toHaveLength(
      3,
    );
  });

  it('월 공수 확정·재오픈·내보내기가 기록에 쌓이고 행위·날짜·커서로 거른다', async () => {
    await login();
    await client.POST('/api/v1/monthly-hours/close', {
      body: { month: '2026-09', confirmDrafts: true },
    });
    await client.POST('/api/v1/monthly-hours/reopen', {
      body: { month: '2026-09', reason: '정정' },
    });

    const all = await list();

    expect(all.items.slice(0, 2).map((item) => item.action)).toEqual([
      'MONTH_REOPENED',
      'MONTH_CLOSED',
    ]);
    expect(all.items[0]).toMatchObject({ summary: '2026-09 · 정정' });
    expect((await list({ action: 'MONTH_CLOSED' })).items).toHaveLength(1);
    expect((await list({ from: '2000-01-01', to: '2000-01-02' })).items).toHaveLength(0);

    const first = await list({ limit: '2' });

    expect(first.items).toHaveLength(2);
    expect((await list({ limit: '2', cursor: first.nextCursor! })).items).toHaveLength(2);
    expect(
      (
        await client.GET('/api/v1/audit-logs', {
          params: { query: { cursor: 'nope' } },
        })
      ).response.status,
    ).toBe(400);
  });
});
