import {
  errorResponseSchema,
  projectsResponseSchema,
  searchResponseSchema,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { DEMO_ACCOUNTS } from './data';
import { resetMockDocuments } from './documentHandlers';
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
  resetMockDocuments();
});
afterAll(() => server.close());

const login = () =>
  client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

const search = async (query: { q: string; projectId?: string; limit?: number }) =>
  searchResponseSchema.parse(
    (await client.GET('/api/v1/search', { params: { query: { limit: 5, ...query } } })).data,
  );

describe('검색 목업 서버 계약', () => {
  it('로그인하지 않으면 401이다', async () => {
    const { response } = await client.GET('/api/v1/search', {
      params: { query: { q: '시공', limit: 5 } },
    });

    expect(response.status).toBe(401);
  });

  it('프로젝트·직원·자료를 이름으로 찾고 종류별로 나눈다', async () => {
    await login();

    const projects = await search({ q: '외장' });
    const documents = await search({ q: '시공도' });
    const employees = await search({ q: '정판금' });

    expect(projects.projects.items[0]).toMatchObject({
      type: 'PROJECT',
      title: 'A동 외장 판금 공사',
    });
    expect(documents.documents.items.length).toBeGreaterThan(0);
    expect(documents.documents.items[0]).toMatchObject({ type: 'DOCUMENT', badge: null });
    expect(employees.employees.items[0]).toMatchObject({ type: 'EMPLOYEE', title: '정판금' });
  });

  it('메모는 검색어 주변을 발췌하고 계약서는 민감 표시가 붙는다', async () => {
    await login();

    const memos = await search({ q: '천장' });
    const contract = await search({ q: '계약서' });

    expect(memos.memos.items[0]).toMatchObject({
      type: 'MEMO',
      projectId: null,
      snippet: expect.stringContaining('천장'),
    });
    expect(contract.documents.items[0]).toMatchObject({ title: '도급 계약서', badge: 'SENSITIVE' });
  });

  it('일지 내용도 찾고 프로젝트를 지정하면 그 프로젝트만 찾는다', async () => {
    await login();

    const { data } = await client.GET('/api/v1/projects', { params: { query: {} } });
    const projectId = projectsResponseSchema
      .parse(data)
      .items.find((item) => item.name === 'A동 외장 판금 공사')!.id;
    const all = await search({ q: '패널' });
    const scoped = await search({ q: '패널', projectId });

    expect(all.workLogs.items.length).toBeGreaterThan(0);
    expect(scoped.workLogs.items.every((item) => item.projectId === projectId)).toBe(true);
    expect(scoped.projects.items).toEqual([]);
    expect(scoped.employees.items).toEqual([]);
  });

  it('종류마다 개수를 제한하고 더 있으면 알려 준다', async () => {
    await login();

    const result = await search({ q: '동', limit: 1 });

    expect(result.projects.items).toHaveLength(1);
    expect(result.projects.hasMore).toBe(true);
  });

  it('없는 프로젝트는 404, 빈 검색어는 400이다', async () => {
    await login();

    const missing = await client.GET('/api/v1/search', {
      params: { query: { q: '가', projectId: '018f3b1e-0000-7000-8000-000000000000', limit: 5 } },
    });
    const empty = await client.GET('/api/v1/search', { params: { query: { q: '  ', limit: 5 } } });

    expect(missing.response.status).toBe(404);
    expect(empty.response.status).toBe(400);
    expect(errorResponseSchema.parse(empty.error).error.code).toBe('VALIDATION_ERROR');
  });
});
