import { monthlyHoursSchema, projectsResponseSchema, workLogSchema } from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { resetMockChangeWorks } from './changeWorkHandlers';
import { DEMO_ACCOUNTS } from './data';
import { resetMockDocuments } from './documentHandlers';
import { handlers } from './handlers';
import { resetMockMaterials } from './materialHandlers';
import { resetMockMonthly } from './monthlyHandlers';
import { resetMockPhotos } from './photoHandlers';
import { resetMockRepairs } from './repairHandlers';
import { resetMockState } from './state';
import { resetMockWarranties } from './warrantyHandlers';

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
  resetMockPhotos();
  resetMockDocuments();
  resetMockMaterials();
  resetMockChangeWorks();
  resetMockWarranties();
  resetMockRepairs();
  resetMockMonthly();
});
afterAll(() => server.close());

const login = () =>
  client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

const month = async (value: string) =>
  monthlyHoursSchema.parse(
    (await client.GET('/api/v1/monthly-hours', { params: { query: { month: value } } })).data,
  );

describe('월 공수 목업', () => {
  it('로그인하지 않으면 거부한다', async () => {
    expect(
      (await client.GET('/api/v1/monthly-hours', { params: { query: { month: '2026-09' } } }))
        .response.status,
    ).toBe(401);
  });

  it('더미 작업 내역을 프로젝트·직원별로 합산하고 임시 저장은 목록으로만 알린다', async () => {
    await login();

    const data = await month('2026-09');

    expect(data).toMatchObject({ isClosed: false, draftLogCount: 1, events: [] });
    expect(data.rows.length).toBeGreaterThan(0);
    expect(data.drafts[0]).toMatchObject({ workDate: '2026-09-04' });
    expect(data.rows.every((row) => row.minutes > 0)).toBe(true);
    expect((await month('2026-07')).rows).toEqual([]);
    expect(
      (await client.GET('/api/v1/monthly-hours', { params: { query: { month: '2026-13' } } }))
        .response.status,
    ).toBe(400);
  });

  it('임시 저장 확인·오지 않은 달·중복 확정을 서버와 같이 거부한다', async () => {
    await login();

    const close = (body: object) =>
      client.POST('/api/v1/monthly-hours/close', { body: body as never });

    expect((await close({ month: '2026-09' })).response.status).toBe(400);
    expect((await close({ month: '2999-01' })).response.status).toBe(400);
    expect((await close({ month: '2026-09', confirmDrafts: true })).response.status).toBe(200);
    expect((await close({ month: '2026-09', confirmDrafts: true })).response.status).toBe(400);

    const closed = await month('2026-09');

    expect(closed).toMatchObject({ isClosed: true, standardWorkMinutes: 480 });
    expect(closed.events).toEqual([expect.objectContaining({ kind: 'CLOSED', draftLogCount: 1 })]);
  });

  it('확정된 달의 작업 내역은 저장할 수 없고 재오픈(사유 필수)하면 다시 저장할 수 있다', async () => {
    await login();

    const projects = projectsResponseSchema.parse(
      (await client.GET('/api/v1/projects', { params: { query: {} } })).data,
    ).items;
    const a = projects.find((item) => item.code === '2026-001')!.id;
    const saved = workLogSchema.parse(
      (
        await client.GET('/api/v1/projects/{id}/work-logs/{workDate}', {
          params: { path: { id: a, workDate: '2026-09-01' } },
        })
      ).data,
    );
    const save = () =>
      client.PUT('/api/v1/projects/{id}/work-logs/{workDate}', {
        params: { path: { id: a, workDate: '2026-09-01' } },
        body: {
          status: 'SAVED',
          content: '정정',
          expectedVersion: saved.version,
          entries: saved.entries.map((entry) => ({
            employeeId: entry.employeeId,
            categoryId: entry.categoryId,
            minutes: entry.minutes,
          })),
        },
      });

    await client.POST('/api/v1/monthly-hours/close', {
      body: { month: '2026-09', confirmDrafts: true },
    });

    const blocked = await save();

    expect(blocked.response.status).toBe(400);
    expect(JSON.stringify(blocked.error)).toContain('재오픈');

    const reopen = (reason?: string) =>
      client.POST('/api/v1/monthly-hours/reopen', {
        body: { month: '2026-09', ...(reason ? { reason } : {}) } as never,
      });

    expect((await reopen()).response.status).toBe(400);
    expect((await reopen('정정')).response.status).toBe(200);
    expect((await save()).response.status).toBe(200);
    expect((await month('2026-09')).events.map((event) => event.kind)).toEqual([
      'REOPENED',
      'CLOSED',
    ]);
    // 확정하지 않은 달은 재오픈할 수 없다
    expect(
      (
        await client.POST('/api/v1/monthly-hours/reopen', {
          body: { month: '2026-08', reason: '정정' },
        })
      ).response.status,
    ).toBe(400);
  });

  it('확정 뒤 회사 기준시간을 바꿔도 확정된 달은 확정 당시 값을 쓴다', async () => {
    await login();
    await client.POST('/api/v1/monthly-hours/close', {
      body: { month: '2026-09', confirmDrafts: true },
    });
    await client.PUT('/api/v1/company/settings', {
      body: { standardWorkMinutes: 420, monthlyWorkDays: 20, workUnitMode: 'RATIO' },
    });

    expect(await month('2026-09')).toMatchObject({
      isClosed: true,
      standardWorkMinutes: 480,
      monthlyWorkDays: 22,
    });
    expect(await month('2026-10')).toMatchObject({
      isClosed: false,
      standardWorkMinutes: 420,
      monthlyWorkDays: 20,
    });
  });
});
