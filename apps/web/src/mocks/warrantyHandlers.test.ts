import {
  documentsResponseSchema,
  projectWarrantySchema,
  projectsResponseSchema,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { resetMockChangeWorks } from './changeWorkHandlers';
import { DEMO_ACCOUNTS } from './data';
import { resetMockDocuments } from './documentHandlers';
import { handlers } from './handlers';
import { resetMockMaterials } from './materialHandlers';
import { resetMockPhotos } from './photoHandlers';
import { findAccount, getProjects, resetMockState, saveProjects } from './state';
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
});
afterAll(() => server.close());

// 2026-004 옛날상가: 완료(보증 미설정), 2025-012 C동: 종료(6개월 보증 설정), 2026-001 A동: 진행 중
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

const warranty = async (id: string) =>
  projectWarrantySchema.parse(
    (await client.GET('/api/v1/projects/{id}/warranty', { params: { path: { id } } })).data,
  );

const put = (id: string, body: object) =>
  client.PUT('/api/v1/projects/{id}/warranty', {
    params: { path: { id } },
    body: body as never,
  });

describe('보증 목업', () => {
  it('로그인하지 않으면 거부한다', async () => {
    expect(
      (
        await client.GET('/api/v1/projects/{id}/warranty', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000304' } },
        })
      ).response.status,
    ).toBe(401);
  });

  it('종료된 프로젝트는 시드의 6개월 보증과 이력을 보여 주고 바꿀 수 없다', async () => {
    const { closed } = await setup();
    const data = await warranty(closed);

    expect(data).toMatchObject({
      configured: true,
      months: 6,
      startOn: '2025-12-18',
      endOn: '2026-06-18',
    });
    expect(data.changes).toHaveLength(1);
    expect(
      (await put(closed, { months: 12, startBasis: 'ACTUAL_END', reason: '수정' })).response.status,
    ).toBe(400);
  });

  it('완료했지만 설정하지 않은 프로젝트는 기본 12개월로 계산한 값을 보여 준다', async () => {
    const { completed } = await setup();

    expect(await warranty(completed)).toMatchObject({
      configured: false,
      months: 12,
      startOn: '2026-03-12',
      endOn: '2027-03-12',
      changes: [],
    });
  });

  it('진행 중 프로젝트에는 설정할 수 없다', async () => {
    const { running } = await setup();

    expect((await put(running, { months: 12, startBasis: 'ACTUAL_END' })).response.status).toBe(
      400,
    );
  });

  it('처음 저장은 사유 없이, 이후 변경은 사유가 있어야 하고 이력이 남는다', async () => {
    const { completed } = await setup();

    expect((await put(completed, { months: 24, startBasis: 'ACTUAL_END' })).response.status).toBe(
      200,
    );
    expect((await put(completed, { months: 18, startBasis: 'ACTUAL_END' })).response.status).toBe(
      400,
    );
    expect(
      (await put(completed, { months: 18, startBasis: 'ACTUAL_END', reason: '합의' })).response
        .status,
    ).toBe(200);

    const data = await warranty(completed);

    expect(data).toMatchObject({ months: 18, endOn: '2027-09-12' });
    expect(data.changes.map((item) => `${item.fromMonths}>${item.toMonths}`)).toEqual([
      '24>18',
      'null>24',
    ]);
  });

  it('보증 기간이 있으면 완료에서 바로 종료할 수 없고, 보증 시작은 요약 확인이 필요하다', async () => {
    const { completed } = await setup();
    const status = (body: object) =>
      client.POST('/api/v1/projects/{id}/status', {
        params: { path: { id: completed } },
        body: body as never,
      });

    expect((await status({ toStatus: 'CLOSED' })).response.status).toBe(400);
    expect((await status({ toStatus: 'WARRANTY' })).response.status).toBe(400);
    expect((await status({ toStatus: 'WARRANTY', confirmSummary: true })).response.status).toBe(
      200,
    );

    // 보증 중이 되면 기본값 저장
    expect(await warranty(completed)).toMatchObject({
      configured: true,
      months: 12,
      endOn: '2027-03-12',
    });
    // 종료 예정일 전의 종료는 사유 필요
    expect((await status({ toStatus: 'CLOSED' })).response.status).toBe(400);
    expect((await status({ toStatus: 'CLOSED', reason: '고객 요청' })).response.status).toBe(200);
  });

  it('보증 기간을 0개월로 바꾸면 완료에서 바로 종료할 수 있다', async () => {
    const { completed } = await setup();

    await put(completed, { months: 0, startBasis: 'ACTUAL_END' });

    expect(
      (
        await client.POST('/api/v1/projects/{id}/status', {
          params: { path: { id: completed } },
          body: { toStatus: 'CLOSED' },
        })
      ).response.status,
    ).toBe(200);
  });

  it('보증서는 같은 프로젝트의 문서만 등록하고 지울 수 있다', async () => {
    const { running } = await setup();
    const account = findAccount(demo.loginId)!;

    // 문서가 있는 A동을 완료 상태로 변경
    saveProjects(
      account,
      getProjects(account).map((project) =>
        project.id === running
          ? { ...project, status: 'COMPLETED' as const, actualEnd: '2026-10-01' }
          : project,
      ),
    );

    const documents = documentsResponseSchema.parse(
      (
        await client.GET('/api/v1/projects/{projectId}/documents', {
          params: { path: { projectId: running }, query: {} },
        })
      ).data,
    ).items;
    const add = (documentId: string) =>
      client.POST('/api/v1/projects/{id}/warranty/certificates', {
        params: { path: { id: running } },
        body: { documentId, expiresOn: '2027-03-01', issuer: ' 서울보증 ' },
      });

    expect((await add('0198d000-0000-7000-8000-00000000ffff')).response.status).toBe(400);
    expect((await add(documents[0]!.id)).response.status).toBe(201);
    expect((await add(documents[0]!.id)).response.status).toBe(400);

    const data = await warranty(running);

    expect(data.certificates).toHaveLength(1);
    expect(data.certificates[0]).toMatchObject({ issuer: '서울보증', expiresOn: '2027-03-01' });

    const certificateId = data.certificates[0]!.id;
    const params = { path: { id: running, certificateId } };

    expect(
      (
        await client.PATCH('/api/v1/projects/{id}/warranty/certificates/{certificateId}', {
          params,
          body: { expiresOn: '2027-06-30' },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (
        await client.DELETE('/api/v1/projects/{id}/warranty/certificates/{certificateId}', {
          params,
        })
      ).response.status,
    ).toBe(200);
    expect((await warranty(running)).certificates).toEqual([]);
    expect(
      (
        await client.DELETE('/api/v1/projects/{id}/warranty/certificates/{certificateId}', {
          params,
        })
      ).response.status,
    ).toBe(404);
  });
});
