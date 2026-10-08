import { dailyReportSchema, errorResponseSchema, projectsResponseSchema } from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { DEMO_ACCOUNTS } from './data';
import { handlers } from './handlers';
import { resetMockMaterials } from './materialHandlers';
import { resetMockPhotos } from './photoHandlers';
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
  resetMockPhotos();
});
afterAll(() => server.close());

const setup = async () => {
  await client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

  const { data } = await client.GET('/api/v1/projects', { params: { query: {} } });

  return projectsResponseSchema
    .parse(data)
    .items.find((item) => item.name === 'A동 외장 판금 공사')!.id;
};

const report = async (projectId: string, date: string) =>
  dailyReportSchema.parse(
    (
      await client.GET('/api/v1/projects/{projectId}/daily-reports/{date}', {
        params: { path: { projectId, date } },
      })
    ).data,
  );

describe('작업일보 목업 서버 계약', () => {
  it('로그인하지 않으면 401이다', async () => {
    const { response } = await client.GET('/api/v1/projects/{projectId}/daily-reports/{date}', {
      params: { path: { projectId: '018f3b1e-0000-7000-8000-000000000000', date: '2026-10-07' } },
    });

    expect(response.status).toBe(401);
  });

  it('일지가 있는 날은 작업 내용·인원·공수 합계를 담는다', async () => {
    const projectId = await setup();
    const data = await report(projectId, '2026-09-02');

    expect(data.project.name).toBe('A동 외장 판금 공사');
    expect(data.workLog?.content).toContain('외장 패널');
    expect(data.entries.length).toBeGreaterThan(0);
    expect(data.totals.headcount).toBe(new Set(data.entries.map((entry) => entry.employeeId)).size);
    expect(data.totals.minutes).toBe(data.entries.reduce((sum, entry) => sum + entry.minutes, 0));
  });

  it('일지가 없어도 그날의 자재·사진은 담는다', async () => {
    const projectId = await setup();
    const data = await report(projectId, '2026-10-07');

    expect(data.workLog).toBeNull();
    expect(data.materials.map((item) => item.kind).sort()).toEqual([
      'DISCARDED',
      'RETURNED',
      'USED',
      'USED',
    ]);
    expect(data.photos.length).toBeGreaterThan(0);
    expect(data.photos[0]!.thumbnailUrl).toMatch(/^data:image/);
  });

  it('아무것도 없는 날은 빈 보고서이고 없는 프로젝트는 404, 날짜 형식이 틀리면 400이다', async () => {
    const projectId = await setup();
    const empty = await report(projectId, '2026-01-01');

    expect(empty).toMatchObject({ workLog: null, entries: [], materials: [], photos: [] });

    const missing = await client.GET('/api/v1/projects/{projectId}/daily-reports/{date}', {
      params: { path: { projectId: '018f3b1e-0000-7000-8000-000000000000', date: '2026-10-07' } },
    });
    const bad = await client.GET('/api/v1/projects/{projectId}/daily-reports/{date}', {
      params: { path: { projectId, date: '어제' } },
    });

    expect(missing.response.status).toBe(404);
    expect(bad.response.status).toBe(400);
  });

  it('엑셀은 한글 파일 이름 헤더와 함께 내려오고 기간이 잘못되면 400이다', async () => {
    const projectId = await setup();
    const ok = await client.GET('/api/v1/projects/{projectId}/daily-reports.xlsx', {
      params: { path: { projectId }, query: { from: '2026-10-01', to: '2026-10-31' } },
      parseAs: 'blob',
    });

    expect(ok.response.status).toBe(200);
    expect(ok.response.headers.get('Content-Type')).toContain('spreadsheetml');
    expect(decodeURIComponent(ok.response.headers.get('Content-Disposition')!)).toContain(
      '작업일보_2026-001_2026-10-01_2026-10-31.xlsx',
    );

    const bad = await client.GET('/api/v1/projects/{projectId}/daily-reports.xlsx', {
      params: { path: { projectId }, query: { from: '2026-10-31', to: '2026-10-01' } },
    });

    expect(bad.response.status).toBe(400);
    expect(errorResponseSchema.parse(bad.error).error.code).toBe('VALIDATION_ERROR');
  });
});
