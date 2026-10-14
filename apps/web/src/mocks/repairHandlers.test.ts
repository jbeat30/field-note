import {
  projectsResponseSchema,
  repairRequestDetailSchema,
  repairRequestsResponseSchema,
  repairUsageSchema,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { resetMockChangeWorks } from './changeWorkHandlers';
import { DEMO_ACCOUNTS } from './data';
import { resetMockDocuments } from './documentHandlers';
import { handlers } from './handlers';
import { resetMockMaterials } from './materialHandlers';
import { resetMockPhotos } from './photoHandlers';
import { resetMockRepairs } from './repairHandlers';
import { findAccount, getProjects, getWorkLogs, resetMockState, saveProjects } from './state';
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
});
afterAll(() => server.close());

// 2026-004 옛날상가: 완료, 2025-012 C동: 종료(완료된 보수 요청 두 건), 2026-001 A동: 진행 중
const setup = async () => {
  await client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

  const projects = projectsResponseSchema.parse(
    (await client.GET('/api/v1/projects', { params: { query: {} } })).data,
  ).items;
  const idOf = (code: string) => projects.find((item) => item.code === code)!.id;

  return { completed: idOf('2026-004'), closed: idOf('2025-012'), running: idOf('2026-001') };
};

const list = async (projectId: string) =>
  repairRequestsResponseSchema.parse(
    (
      await client.GET('/api/v1/projects/{id}/repair-requests', {
        params: { path: { id: projectId }, query: {} },
      })
    ).data,
  ).items;

const create = (projectId: string, body: object = {}) =>
  client.POST('/api/v1/projects/{id}/repair-requests', {
    params: { path: { id: projectId } },
    body: { requester: '고객', content: '누수', ...body },
  });

const move = (id: string, body: object) =>
  client.POST('/api/v1/repair-requests/{id}/status', {
    params: { path: { id } },
    body: body as never,
  });

const toWarranty = (projectId: string) =>
  client.POST('/api/v1/projects/{id}/status', {
    params: { path: { id: projectId } },
    body: { toStatus: 'WARRANTY', confirmSummary: true },
  });

describe('보수 요청 목업', () => {
  it('로그인하지 않으면 거부한다', async () => {
    expect(
      (
        await client.GET('/api/v1/projects/{id}/repair-requests', {
          params: {
            path: { id: '0198d000-0000-7000-8000-000000000304' },
            query: {},
          },
        })
      ).response.status,
    ).toBe(401);
  });

  it('종료된 프로젝트는 시드의 완료된 보수 요청 두 건과 이력을 보여 주고 바꿀 수 없다', async () => {
    const { closed } = await setup();
    const items = await list(closed);

    expect(items.map((item) => `${item.seq}:${item.status}`)).toEqual(['2:DONE', '1:DONE']);
    expect(items[1]).toMatchObject({ location: '옥상 B구역', resolvedOn: '2026-01-05' });

    const detail = repairRequestDetailSchema.parse(
      (
        await client.GET('/api/v1/repair-requests/{id}', {
          params: { path: { id: items[1]!.id } },
        })
      ).data,
    );

    expect(detail.history.map((item) => item.toStatus)).toEqual(['DONE', 'IN_PROGRESS']);
    expect((await create(closed)).response.status).toBe(400);
    expect(
      (await move(items[1]!.id, { toStatus: 'IN_PROGRESS', note: '재발' })).response.status,
    ).toBe(400);
  });

  it('보증 중에만 접수하고 번호가 올라가며 상태·사유 규칙을 서버와 같이 지킨다', async () => {
    const { completed } = await setup();

    // 완료 상태에서는 접수할 수 없다
    expect((await create(completed)).response.status).toBe(400);
    expect((await toWarranty(completed)).response.status).toBe(200);

    const first = repairRequestDetailSchema.parse((await create(completed)).data);
    const second = repairRequestDetailSchema.parse(
      (await create(completed, { location: '2층' })).data,
    );

    expect([first.seq, second.seq]).toEqual([1, 2]);
    expect(first).toMatchObject({ status: 'RECEIVED', location: null });
    expect((await create(completed, { requester: '' })).response.status).toBe(400);
    expect((await create(completed, { receivedOn: '2999-01-01' })).response.status).toBe(400);

    // 보류는 사유 필수, 완료는 완료일 기록, 완료 되돌리기는 사유 필수
    expect((await move(first.id, { toStatus: 'ON_HOLD' })).response.status).toBe(400);
    expect((await move(first.id, { toStatus: 'ON_HOLD', note: '자재 대기' })).response.status).toBe(
      200,
    );
    expect((await move(first.id, { toStatus: 'DONE' })).response.status).toBe(200);
    expect((await list(completed))[1]).toMatchObject({ status: 'DONE' });
    expect((await move(first.id, { toStatus: 'IN_PROGRESS' })).response.status).toBe(400);

    const updated = await client.PATCH('/api/v1/repair-requests/{id}', {
      params: { path: { id: first.id } },
      body: { content: '수정' },
    });

    expect(updated.response.status).toBe(400);
    expect(
      (
        await client.PATCH('/api/v1/repair-requests/{id}', {
          params: { path: { id: second.id } },
          body: { content: '수정' },
        })
      ).response.status,
    ).toBe(200);
  });

  it('접수·처리 중인 보수 요청이 있으면 보증 종료를 막고 종료 점검에 알린다', async () => {
    const { completed } = await setup();

    await toWarranty(completed);

    const open = repairRequestDetailSchema.parse((await create(completed)).data);
    const close = (body: object) =>
      client.POST('/api/v1/projects/{id}/status', {
        params: { path: { id: completed } },
        body: { toStatus: 'CLOSED', ...body } as never,
      });
    const notices = await client.GET('/api/v1/projects/{id}/transition-notices', {
      params: { path: { id: completed }, query: { to: 'CLOSED' } },
    });

    expect(notices.data?.items).toContainEqual({ type: 'OPEN_REPAIRS', count: 1 });
    expect((await close({ reason: '조기 종료' })).response.status).toBe(400);

    await move(open.id, { toStatus: 'ON_HOLD', note: '고객 일정' });

    expect((await close({ reason: '조기 종료' })).response.status).toBe(200);
  });

  it('사후 작업 작업 내역·자재 기록을 연결하면 건별 공수가 합계되고 프로젝트 합계에 잡힌다', async () => {
    const { running } = await setup();
    const account = findAccount(demo.loginId)!;

    // 작업 내역이 있는 A동을 보증 중으로 맞추고 저장된 작업 내역 한 건을 사후 작업으로 표시한다
    saveProjects(
      account,
      getProjects(account).map((project) =>
        project.id === running ? { ...project, status: 'WARRANTY' as const } : project,
      ),
    );

    const [log, other] = getWorkLogs(account).filter(
      (item) => item.projectId === running && item.status === 'SAVED',
    );

    log!.isAfterService = true;

    const repair = repairRequestDetailSchema.parse((await create(running)).data);
    const link = (body: object) =>
      client.POST('/api/v1/repair-requests/{id}/links', {
        params: { path: { id: repair.id } },
        body: body as never,
      });

    expect((await link({})).response.status).toBe(400);
    // 사후 작업이 아닌 작업 내역은 연결할 수 없다
    expect((await link({ workLogId: other!.id })).response.status).toBe(400);

    const linked = repairRequestDetailSchema.parse((await link({ workLogId: log!.id })).data);
    const minutes = log!.entries.reduce((sum, entry) => sum + entry.minutes, 0);

    expect(linked.usage).toMatchObject({ workLogCount: 1, minutes });
    expect((await link({ workLogId: log!.id })).response.status).toBe(400);
    expect((await list(running))[0]!.linkCount).toBe(1);

    expect(
      repairUsageSchema.parse(
        (
          await client.GET('/api/v1/projects/{id}/after-service-usage', {
            params: { path: { id: running } },
          })
        ).data,
      ),
    ).toMatchObject({ workLogCount: 1, minutes });

    const unlinked = await client.DELETE('/api/v1/repair-requests/{id}/links/{linkId}', {
      params: { path: { id: repair.id, linkId: linked.links[0]!.id } },
    });

    expect(repairRequestDetailSchema.parse(unlinked.data).usage.minutes).toBe(0);
    expect(
      (
        await client.DELETE('/api/v1/repair-requests/{id}/links/{linkId}', {
          params: { path: { id: repair.id, linkId: linked.links[0]!.id } },
        })
      ).response.status,
    ).toBe(404);
  });
});
