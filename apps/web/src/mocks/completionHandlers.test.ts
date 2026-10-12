import {
  projectCompletionSummarySchema,
  projectsResponseSchema,
  transitionNoticesSchema,
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

const setup = async () => {
  await client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

  return projectsResponseSchema
    .parse((await client.GET('/api/v1/projects', { params: { query: {} } })).data)
    .items.find((item) => item.code === '2026-001')!.id;
};

describe('상태 전환 안내·프로젝트 요약 목업', () => {
  it('로그인하지 않으면 거부한다', async () => {
    expect(
      (
        await client.GET('/api/v1/projects/{id}/summary', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000301' } },
        })
      ).response.status,
    ).toBe(401);
  });

  it('완료 전 안내: 진행률 40%와 협의 중 변경 작업, 임시 저장 일지를 알린다', async () => {
    const a = await setup();
    const notices = transitionNoticesSchema.parse(
      (
        await client.GET('/api/v1/projects/{id}/transition-notices', {
          params: { path: { id: a }, query: { to: 'COMPLETED' } },
        })
      ).data,
    );
    const types = notices.items.map((item) => item.type);

    // 더미: A동은 진행률 40%, 협의 중 변경 작업 1건, 임시 저장 일지 1건
    expect(types).toEqual(
      expect.arrayContaining(['DRAFT_LOGS', 'PROGRESS_BELOW_100', 'NEGOTIATING_CHANGES']),
    );
    expect(notices.items.find((item) => item.type === 'PROGRESS_BELOW_100')).toEqual({
      type: 'PROGRESS_BELOW_100',
      percent: 40,
    });
  });

  it('안내가 필요 없는 전환은 빈 목록이고 잘못된 목표 상태·없는 프로젝트는 거부한다', async () => {
    const a = await setup();

    expect(
      transitionNoticesSchema.parse(
        (
          await client.GET('/api/v1/projects/{id}/transition-notices', {
            params: { path: { id: a }, query: { to: 'SUSPENDED' } },
          })
        ).data,
      ).items,
    ).toEqual([]);
    expect(
      (
        await client.GET('/api/v1/projects/{id}/transition-notices', {
          params: { path: { id: a }, query: { to: 'NOPE' as never } },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await client.GET('/api/v1/projects/{id}/summary', {
          params: { path: { id: '0198d000-0000-7000-8000-00000000dead' } },
        })
      ).response.status,
    ).toBe(404);
  });

  it('요약: 기본정보·공수·자재·변경 작업·문서가 계약을 지키고 민감 문서는 목록에서 뺀다', async () => {
    const a = await setup();
    const summary = projectCompletionSummarySchema.parse(
      (await client.GET('/api/v1/projects/{id}/summary', { params: { path: { id: a } } })).data,
    );

    expect(summary.project).toMatchObject({ code: '2026-001', name: 'A동 외장 판금 공사' });
    expect(summary.progressPercent).toBe(40);
    expect(summary.work.totalMinutes).toBeGreaterThan(0);
    expect(summary.work.byEmployee.reduce((sum, row) => sum + row.minutes, 0)).toBe(
      summary.work.totalMinutes,
    );
    expect(summary.changeWorks.items.map((item) => item.seq)).toEqual([1, 2]);
    // 더미 문서: 도면·계약서(민감)·시방서
    expect(summary.documents.sensitiveExcluded).toBe(1);
    expect(summary.documents.items.map((item) => item.title)).not.toContain('도급 계약서');
  });
});
