import {
  errorResponseSchema,
  memoSchema,
  memoSummarySchema,
  memosResponseSchema,
  projectsResponseSchema,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { DEMO_ACCOUNTS } from './data';
import { handlers } from './handlers';
import { resetMockMemos } from './memoHandlers';
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
  resetMockMemos();
});
afterAll(() => server.close());

const setup = async () => {
  await client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

  const { data } = await client.GET('/api/v1/projects', { params: { query: {} } });

  return projectsResponseSchema.parse(data).items[0]!.id;
};

const inbox = async () =>
  memosResponseSchema.parse(
    (await client.GET('/api/v1/memos', { params: { query: { scope: 'INBOX' } } })).data,
  );

describe('메모 목업 서버 계약', () => {
  it('로그인하지 않으면 401이다', async () => {
    const { response } = await client.GET('/api/v1/memos/summary');

    expect(response.status).toBe(401);
  });

  it('더미 메모함이 날짜 최근순으로 나오고 건수가 맞다', async () => {
    await setup();

    const list = await inbox();
    const summary = memoSummarySchema.parse((await client.GET('/api/v1/memos/summary')).data);

    expect(list.items.length).toBe(3);
    expect(list.items.map((item) => item.memoDate)).toEqual(
      [...list.items.map((item) => item.memoDate)].sort().reverse(),
    );
    expect(summary.inboxCount).toBe(3);
    expect(summary.openTodoCount).toBeGreaterThanOrEqual(1);
  });

  it('프로젝트 메모 노트를 태그·완료 여부로 거른다', async () => {
    const projectId = await setup();
    const open = memosResponseSchema.parse(
      (
        await client.GET('/api/v1/memos', {
          params: { query: { scope: 'PROJECT', projectId, tag: 'TODO', isDone: 'false' } },
        })
      ).data,
    );

    expect(open.items.length).toBe(1);
    expect(open.items.every((item) => item.tag === 'TODO' && !item.isDone)).toBe(true);
  });

  it('저장 → 프로젝트 연결 → 완료 → 삭제 흐름이 서버와 같다', async () => {
    const projectId = await setup();
    const created = await client.POST('/api/v1/memos', {
      body: { content: '  새 메모  ', tag: 'TODO' },
    });
    const memo = memoSchema.parse(created.data);

    expect(created.response.status).toBe(201);
    expect(memo).toMatchObject({ content: '새 메모', projectId: null, isDone: false });

    const linked = memoSchema.parse(
      (
        await client.PATCH('/api/v1/memos/{id}', {
          params: { path: { id: memo.id } },
          body: { projectId, isDone: true },
        })
      ).data,
    );

    expect(linked).toMatchObject({ projectId, isDone: true });
    expect(linked.doneAt).not.toBeNull();

    // 할 일이 아닌 태그로 바꾸면 완료 표시가 사라짐
    const retagged = memoSchema.parse(
      (
        await client.PATCH('/api/v1/memos/{id}', {
          params: { path: { id: memo.id } },
          body: { tag: 'ISSUE' },
        })
      ).data,
    );

    expect(retagged).toMatchObject({ isDone: false, doneAt: null });

    const removed = await client.DELETE('/api/v1/memos/{id}', {
      params: { path: { id: memo.id } },
    });

    expect(removed.data).toEqual({ success: true });
    expect(
      (await client.GET('/api/v1/memos/{id}', { params: { path: { id: memo.id } } })).response
        .status,
    ).toBe(404);
  });

  it('할 일이 아닌 메모의 완료·빈 내용·없는 프로젝트는 거부한다', async () => {
    await setup();

    const note = memoSchema.parse(
      (await client.POST('/api/v1/memos', { body: { content: '일반' } })).data,
    );
    const done = await client.PATCH('/api/v1/memos/{id}', {
      params: { path: { id: note.id } },
      body: { isDone: true },
    });
    const empty = await client.POST('/api/v1/memos', { body: { content: '   ' } });
    const noProject = await client.POST('/api/v1/memos', {
      body: { content: '가', projectId: '018f3b1e-0000-7000-8000-000000000000' },
    });

    for (const result of [done, empty, noProject]) {
      expect(result.response.status).toBe(400);
      expect(errorResponseSchema.parse(result.error).error.code).toBe('VALIDATION_ERROR');
    }
  });
});
