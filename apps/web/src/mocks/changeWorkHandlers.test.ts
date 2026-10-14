import {
  changeUsageSchema,
  changeWorkDetailSchema,
  changeWorksResponseSchema,
  documentsResponseSchema,
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
});
afterAll(() => server.close());

// A동(2026-001): 더미 변경·추가 작업 두 건
const setup = async () => {
  await client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

  const projects = projectsResponseSchema.parse(
    (await client.GET('/api/v1/projects', { params: { query: {} } })).data,
  ).items;

  return { a: projects.find((item) => item.code === '2026-001')!.id, other: projects[1]!.id };
};

const list = async (
  projectId: string,
  query: { status?: 'NEGOTIATING' | 'AGREED' | 'WITHDRAWN' } = {},
) =>
  changeWorksResponseSchema.parse(
    (
      await client.GET('/api/v1/projects/{id}/change-works', {
        params: { path: { id: projectId }, query },
      })
    ).data,
  ).items;

describe('변경·추가 작업 목업', () => {
  it('로그인하지 않으면 거부한다', async () => {
    expect(
      (
        await client.GET('/api/v1/projects/{id}/change-works', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000301' }, query: {} },
        })
      ).response.status,
    ).toBe(401);
  });

  it('더미 두 건을 번호 큰 순으로 보여 주고 상태로 거른다', async () => {
    const { a } = await setup();
    const items = await list(a);

    expect(items.map((item) => [item.seq, item.status])).toEqual([
      [2, 'NEGOTIATING'],
      [1, 'AGREED'],
    ]);
    expect((await list(a, { status: 'AGREED' })).map((item) => item.seq)).toEqual([1]);
  });

  it('등록하면 협의 중으로 다음 번호가 붙고 다른 프로젝트는 1부터다', async () => {
    const { a, other } = await setup();
    const created = await client.POST('/api/v1/projects/{id}/change-works', {
      params: { path: { id: a } },
      body: { requestedOn: '2026-10-05', requester: '  고객 ', content: ' 내용 ' },
    });

    expect(created.response.status).toBe(201);
    expect(changeWorkDetailSchema.parse(created.data)).toMatchObject({
      seq: 3,
      status: 'NEGOTIATING',
      requester: '고객',
      content: '내용',
    });

    const first = await client.POST('/api/v1/projects/{id}/change-works', {
      params: { path: { id: other } },
      body: { requester: '고객', content: '내용' },
    });

    expect(changeWorkDetailSchema.parse(first.data).seq).toBe(1);
  });

  it('협의 중일 때만 고칠 수 있고 합의된 기록은 거부한다', async () => {
    const { a } = await setup();
    const [negotiating, agreed] = await list(a);
    const patch = (id: string) =>
      client.PATCH('/api/v1/change-works/{id}', {
        params: { path: { id } },
        body: { content: '수정한 내용' },
      });

    expect((await patch(negotiating!.id)).response.status).toBe(200);
    expect((await patch(agreed!.id)).response.status).toBe(400);
  });

  it('상태를 바꾸면 이력이 쌓이고 철회는 사유가 필수다', async () => {
    const { a } = await setup();
    const [negotiating] = await list(a);
    const transition = (body: {
      toStatus: 'AGREED' | 'WITHDRAWN' | 'NEGOTIATING';
      note?: string;
    }) =>
      client.POST('/api/v1/change-works/{id}/status', {
        params: { path: { id: negotiating!.id } },
        body,
      });

    expect((await transition({ toStatus: 'WITHDRAWN' })).response.status).toBe(400);
    expect((await transition({ toStatus: 'NEGOTIATING' })).response.status).toBe(400);

    const done = await transition({ toStatus: 'WITHDRAWN', note: '고객 취소' });

    expect(changeWorkDetailSchema.parse(done.data)).toMatchObject({
      status: 'WITHDRAWN',
      history: [{ fromStatus: 'NEGOTIATING', toStatus: 'WITHDRAWN', note: '고객 취소' }],
    });
  });

  it('같은 프로젝트의 문서만 증빙으로 연결·해제한다', async () => {
    const { a, other } = await setup();
    const [negotiating] = await list(a);
    const docs = async (projectId: string) =>
      documentsResponseSchema.parse(
        (
          await client.GET('/api/v1/projects/{projectId}/documents', {
            params: { path: { projectId }, query: {} },
          })
        ).data,
      ).items;
    const mine = (await docs(a))[0]!;
    const foreign = (await docs(other))[0]!;
    const link = (documentId: string) =>
      client.POST('/api/v1/change-works/{id}/documents', {
        params: { path: { id: negotiating!.id } },
        body: { documentId },
      });

    expect((await link(foreign.id)).response.status).toBe(400);

    const linked = await link(mine.id);

    expect(linked.response.status).toBe(201);
    expect(changeWorkDetailSchema.parse(linked.data).documents).toEqual([
      expect.objectContaining({ documentId: mine.id, title: mine.title }),
    ]);
    expect((await link(mine.id)).response.status).toBe(400);

    const unlink = () =>
      client.DELETE('/api/v1/change-works/{id}/documents/{documentId}', {
        params: { path: { id: negotiating!.id, documentId: mine.id }, query: {} },
      });

    expect((await unlink()).response.status).toBe(200);
    expect((await unlink()).response.status).toBe(404);
  });

  it('변경 표시한 작업 내역 공수를 합산하고 없는 프로젝트는 404다', async () => {
    const { a } = await setup();
    const usage = changeUsageSchema.parse(
      (await client.GET('/api/v1/projects/{id}/change-usage', { params: { path: { id: a } } }))
        .data,
    );

    expect(usage.workLogCount).toBeGreaterThanOrEqual(0);
    expect(usage.minutes).toBeGreaterThanOrEqual(0);
    expect(
      (
        await client.GET('/api/v1/projects/{id}/change-usage', {
          params: { path: { id: '0198d000-0000-7000-8000-00000000dead' } },
        })
      ).response.status,
    ).toBe(404);
  });
});
