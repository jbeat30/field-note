import { alertSettingsSchema, dashboardResponseSchema } from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { resetMockChangeWorks } from './changeWorkHandlers';
import { DEMO_ACCOUNTS } from './data';
import { resetMockDocuments } from './documentHandlers';
import { handlers } from './handlers';
import { resetMockMaterials } from './materialHandlers';
import { resetMockMemos } from './memoHandlers';
import { resetMockPhotos } from './photoHandlers';
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
  resetMockPhotos();
  resetMockDocuments();
  resetMockMaterials();
  resetMockChangeWorks();
  resetMockMemos();
});
afterAll(() => server.close());

const login = () =>
  client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

const dashboard = async () =>
  dashboardResponseSchema.parse((await client.GET('/api/v1/dashboard')).data);

describe('대시보드·알림 설정 목업', () => {
  it('로그인하지 않으면 거부한다', async () => {
    expect((await client.GET('/api/v1/dashboard')).response.status).toBe(401);
    expect((await client.GET('/api/v1/company/alert-settings')).response.status).toBe(401);
  });

  it('더미 기록으로 위젯과 알림이 계약대로 나온다', async () => {
    await login();

    const { dashboard: data, settings } = await dashboard();

    // 더미: 진행·예정·중단 프로젝트가 있고 A동 변경 작업 #2는 오래 협의 중이다
    expect(data.projectCounts.inProgress).toBeGreaterThan(0);
    expect(data.activeProjects.length).toBeGreaterThan(0);
    expect(data.alerts.map((item) => item.alert)).toContainEqual(
      expect.objectContaining({ kind: 'CHANGE_STALE', seq: 2 }),
    );
    expect(data.todos.draftLogCount).toBe(1);
    expect(settings.items).toHaveLength(11);
    // 더미 직원 서류: 정판금의 건강검진은 이미 만료 (날짜가 지나도 계속 알림)
    expect(data.expiring.credentials).toContainEqual(
      expect.objectContaining({ employeeName: '정판금', typeName: '건강검진' }),
    );
    expect(data.alerts.map((item) => item.alert)).toContainEqual(
      expect.objectContaining({ kind: 'CREDENTIAL_EXPIRING', typeName: '건강검진' }),
    );
    expect(settings.items.every((item) => item.enabled)).toBe(true);
  });

  it('알림을 끄면 알림에서만 빠지고 위젯은 그대로이며 보낸 종류만 바뀐다', async () => {
    await login();

    const before = await dashboard();
    const saved = await client.PUT('/api/v1/company/alert-settings', {
      body: { items: [{ kind: 'CHANGE_STALE', enabled: false }] },
    });

    expect(saved.response.status).toBe(200);
    expect(alertSettingsSchema.parse(saved.data).items.filter((item) => item.enabled)).toHaveLength(
      10,
    );

    const after = await dashboard();

    expect(after.dashboard.alerts.some((item) => item.alert.kind === 'CHANGE_STALE')).toBe(false);
    expect(after.dashboard.activeProjects).toEqual(before.dashboard.activeProjects);
  });

  it('알림을 숨기면 같은 조건에서는 다시 나오지 않고 숨긴 개수를 알려 준다', async () => {
    await login();

    const before = (await dashboard()).dashboard;
    const first = before.alerts[0]!;
    const hidden = await client.POST('/api/v1/alerts/dismiss', { body: { keys: [first.key] } });

    expect(hidden.response.status).toBe(200);

    const after = (await dashboard()).dashboard;

    expect(after.alerts.map((item) => item.key)).not.toContain(first.key);
    expect(after.hiddenAlertCount).toBe(before.hiddenAlertCount + 1);
  });

  it('잘못된 알림 설정은 거부한다', async () => {
    await login();

    expect(
      (await client.PUT('/api/v1/company/alert-settings', { body: { items: [] } })).response.status,
    ).toBe(400);
    expect(
      (
        await client.PUT('/api/v1/company/alert-settings', {
          body: { items: [{ kind: 'NOPE' as never, enabled: true }] },
        })
      ).response.status,
    ).toBe(400);
  });
});
