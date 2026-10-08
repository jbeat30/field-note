import {
  errorResponseSchema,
  materialBalanceResponseSchema,
  materialRecordSchema,
  materialRecordsResponseSchema,
  materialSchema,
  materialsResponseSchema,
  projectsResponseSchema,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { DEMO_ACCOUNTS } from './data';
import { handlers } from './handlers';
import { resetMockMaterials } from './materialHandlers';
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
  resetMockMaterials();
});
afterAll(() => server.close());

const setup = async () => {
  await client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

  const { data } = await client.GET('/api/v1/projects', { params: { query: {} } });

  return projectsResponseSchema.parse(data).items[0]!.id;
};

const list = async () =>
  materialsResponseSchema.parse(
    (await client.GET('/api/v1/materials', { params: { query: {} } })).data,
  ).items;

describe('자재 목업 서버 계약', () => {
  it('로그인하지 않으면 401이다', async () => {
    const { response } = await client.GET('/api/v1/materials', { params: { query: {} } });

    expect(response.status).toBe(401);
  });

  it('더미 자재가 최근 기록한 순서로 나온다', async () => {
    await setup();

    const items = await list();

    expect(items.map((item) => item.name)).toEqual(['실리콘 코킹', '아연도강판', '피스']);
    expect(items.at(-1)!.lastUsedOn).toBeNull();
  });

  it('즉석 추가는 이름·단위만으로 되고 같은 이름·규격은 거부한다', async () => {
    await setup();

    const created = await client.POST('/api/v1/materials', {
      body: { name: ' 리벳 ', unit: '박스' },
    });

    expect(created.response.status).toBe(201);
    expect(materialSchema.parse(created.data)).toMatchObject({
      name: '리벳',
      category: 'CONSUMABLE',
    });

    const dup = await client.POST('/api/v1/materials', {
      body: { name: '아연도 강판', spec: '1.0t', unit: '장' },
    });

    expect(dup.response.status).toBe(400);
    expect(errorResponseSchema.parse(dup.error).error.code).toBe('VALIDATION_ERROR');
    // 규격이 다르면 별도 자재
    expect(
      (
        await client.POST('/api/v1/materials', {
          body: { name: '아연도강판', spec: '0.8T', unit: '장' },
        })
      ).response.status,
    ).toBe(201);
  });

  it('기록이 있는 자재의 단위는 바꿀 수 없다', async () => {
    await setup();

    const zinc = (await list()).find((item) => item.name === '아연도강판')!;
    const { response } = await client.PATCH('/api/v1/materials/{id}', {
      params: { path: { id: zinc.id } },
      body: { unit: '박스' },
    });

    expect(response.status).toBe(400);
  });

  it('프로젝트 현황은 기획서 예시대로 잔량 15장이고 마이너스 자재는 경고 표시가 붙는다', async () => {
    const projectId = await setup();
    const items = materialBalanceResponseSchema.parse(
      (
        await client.GET('/api/v1/projects/{projectId}/material-balance', {
          params: { path: { projectId } },
        })
      ).data,
    ).items;
    const zinc = items.find((item) => item.name === '아연도강판')!;
    const caulk = items.find((item) => item.name === '실리콘 코킹')!;

    expect(zinc).toMatchObject({
      received: 100,
      used: 72,
      returned: 10,
      discarded: 3,
      remaining: 15,
      usedForChange: 32,
    });
    expect(caulk).toMatchObject({ remaining: -3, isNegative: true });
  });

  it('일괄 저장은 전부 저장하거나 전부 거부하고, 날짜·구분으로 거를 수 있다', async () => {
    const projectId = await setup();
    const zinc = (await list()).find((item) => item.name === '아연도강판')!;
    const before = (
      await client.GET('/api/v1/projects/{projectId}/material-records', {
        params: { path: { projectId }, query: {} },
      })
    ).data!.items.length;
    const bad = await client.POST('/api/v1/projects/{projectId}/material-records/batch', {
      params: { path: { projectId } },
      body: {
        records: [
          {
            materialId: zinc.id,
            recordDate: '2026-10-08',
            kind: 'USED',
            quantity: 1,
            isChange: false,
            isAfterService: false,
          },
          {
            materialId: '018f3b1e-0000-7000-8000-000000000000',
            recordDate: '2026-10-08',
            kind: 'USED',
            quantity: 1,
            isChange: false,
            isAfterService: false,
          },
        ],
      },
    });

    expect(bad.response.status).toBe(400);

    const ok = await client.POST('/api/v1/projects/{projectId}/material-records/batch', {
      params: { path: { projectId } },
      body: {
        records: [
          {
            materialId: zinc.id,
            recordDate: '2026-10-08',
            kind: 'USED',
            quantity: 2.5,
            isChange: false,
            isAfterService: false,
          },
        ],
      },
    });

    expect(ok.response.status).toBe(201);

    const day = materialRecordsResponseSchema.parse(
      (
        await client.GET('/api/v1/projects/{projectId}/material-records', {
          params: { path: { projectId }, query: { date: '2026-10-08' } },
        })
      ).data,
    );
    const all = materialRecordsResponseSchema.parse(
      (
        await client.GET('/api/v1/projects/{projectId}/material-records', {
          params: { path: { projectId }, query: { limit: 100 } },
        })
      ).data,
    );

    expect(day.items).toHaveLength(1);
    expect(all.items).toHaveLength(before + 1);
  });

  it('기록을 고치고 지우면 현황에 바로 반영된다', async () => {
    const projectId = await setup();
    const zinc = (await list()).find((item) => item.name === '아연도강판')!;
    const used = materialRecordsResponseSchema
      .parse(
        (
          await client.GET('/api/v1/projects/{projectId}/material-records', {
            params: { path: { projectId }, query: { materialId: zinc.id, kind: 'USED' } },
          })
        ).data,
      )
      .items.at(0)!;
    const changed = materialRecordSchema.parse(
      (
        await client.PATCH('/api/v1/material-records/{id}', {
          params: { path: { id: used.id } },
          body: { quantity: 1 },
        })
      ).data,
    );

    expect(changed.quantity).toBe(1);
    expect(
      (await client.DELETE('/api/v1/material-records/{id}', { params: { path: { id: used.id } } }))
        .data,
    ).toEqual({ success: true });
    expect(
      (await client.DELETE('/api/v1/material-records/{id}', { params: { path: { id: used.id } } }))
        .response.status,
    ).toBe(404);
  });
});
