import {
  errorResponseSchema,
  progressRecordSchema,
  progressRecordsResponseSchema,
  projectHealthSchema,
  optionsResponseSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createEmployeeService } from '../employee/employeeService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createProgressService } from '../progress/progressService';
import { createProjectService } from '../project/projectService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';
import { createWorkLogService } from '../workLog/workLogService';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

// 서울 기준 2026-10-11
const NOW = new Date('2026-10-11T03:00:00Z');

beforeAll(async () => {
  db = await startTestDatabase();

  const { rows } = await db.ownerPool.query<{ id: string }>(
    `INSERT INTO legal_documents (type, version, effective_at, content_hash, is_required) VALUES
      ('TERMS_OF_SERVICE', '2026-10-01', '2026-10-01', 'h1', true),
      ('PRIVACY_POLICY', '2026-10-01', '2026-10-01', 'h2', true)
     RETURNING id`,
  );

  documentIds = rows.map((row) => row.id);
});

afterAll(async () => {
  await db.stop();
});

const app = () =>
  createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    options: createOptionService(db.app),
    employees: createEmployeeService(db.app, () => NOW),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => NOW),
    assignments: createAssignmentService(db.app),
    workLogs: createWorkLogService(db.app, () => NOW),
    progress: createProgressService(db.app, () => NOW),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `진행회사${sequence}`,
    adminName: '진행관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `progress-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `progress${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const api = (instance: ReturnType<typeof app>, cookie: string) => {
  const send = (method: 'post' | 'put', path: string, body: object) =>
    (method === 'post'
      ? request(instance).post(`/api/v1${path}`)
      : request(instance).put(`/api/v1${path}`)
    )
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body);
  const get = (path: string) => request(instance).get(`/api/v1${path}`).set('Cookie', cookie);

  return {
    get,
    record: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/progress`, body),
    records: (projectId: string) => get(`/projects/${projectId}/progress`),
    health: (projectId: string) => get(`/projects/${projectId}/health`),
    transition: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/status`, body),
    id: async (path: string, body: object) => (await send('post', path, body)).body.id as string,
    saveLog: (projectId: string, date: string, body: object) =>
      send('put', `/projects/${projectId}/work-logs/${date}`, body),
  };
};

// 진행 중 프로젝트(2026-09-01 ~ 2026-12-31) 한 건과 직원 한 명(계획 공수 80MD)
const setup = async (
  status: 'PLANNED' | 'IN_PROGRESS' = 'IN_PROGRESS',
  plannedEnd = '2026-12-31',
) => {
  const instance = app();
  const cookie = await signedUp(instance);
  const client = api(instance, cookie);
  const clientId = await client.id('/partners', { kind: 'CLIENT', name: '가나다건설' });
  const managerId = await client.id('/employees', { name: '박소장' });
  const worker = await client.id('/employees', { name: '김작업' });
  const category = optionsResponseSchema
    .parse((await client.get('/company/options')).body)
    .items.find((item) => item.kind === 'WORK_CATEGORY')!.id;
  const project = await client.id('/projects', {
    name: 'A동 판금 공사',
    siteName: 'A동 현장',
    clientId,
    managerId,
    contractDate: '2026-08-01',
    plannedStart: '2026-09-01',
    plannedEnd,
  });

  if (status === 'IN_PROGRESS') {
    await client.transition(project, { toStatus: 'IN_PROGRESS', effectiveOn: '2026-09-01' });
  }

  await client.id(`/projects/${project}/assignments`, {
    employeeId: worker,
    startDate: '2026-09-01',
    endDate: plannedEnd,
    plannedMinutes: 80 * 480,
  });

  return { instance, client, project, worker, category };
};

describe('진행률 기록', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const { instance, project } = await setup();

    for (const [method, path] of [
      ['get', `/projects/${project}/progress`],
      ['get', `/projects/${project}/health`],
    ] as const) {
      expect((await request(instance)[method](`/api/v1${path}`)).status).toBe(401);
    }

    expect(
      (
        await request(instance)
          .post(`/api/v1/projects/${project}/progress`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ percent: 10 })
      ).status,
    ).toBe(401);
  });

  it('기준일을 정하지 않으면 서울 기준 오늘로 기록하고 최근 기준일이 맨 앞이다', async () => {
    const { client, project } = await setup();
    const first = await client.record(project, {
      percent: 20,
      recordedOn: '2026-10-01',
      note: '철거 끝',
    });

    expect(first.status).toBe(201);
    expect(progressRecordSchema.parse(first.body)).toMatchObject({
      percent: 20,
      recordedOn: '2026-10-01',
      note: '철거 끝',
    });

    await client.record(project, { percent: 45 });
    // 기준일이 더 이른 기록을 나중에 입력해도 목록·현재 값은 기준일 순
    await client.record(project, { percent: 10, recordedOn: '2026-09-20' });

    const items = progressRecordsResponseSchema.parse((await client.records(project)).body).items;

    expect(items.map((item) => [item.recordedOn, item.percent])).toEqual([
      ['2026-10-11', 45],
      ['2026-10-01', 20],
      ['2026-09-20', 10],
    ]);
  });

  it('범위·형식을 검사하고 미래 기준일은 거부한다', async () => {
    const { client, project } = await setup();

    for (const body of [
      { percent: 101 },
      { percent: -1 },
      { percent: 1.5 },
      {},
      { percent: 5, note: '  ' },
    ]) {
      expect({ body, status: (await client.record(project, body)).status }).toEqual({
        body,
        status: 400,
      });
    }

    const future = await client.record(project, { percent: 10, recordedOn: '2026-10-12' });

    expect(future.status).toBe(400);
    expect(errorResponseSchema.parse(future.body).error.details).toEqual([
      expect.objectContaining({ path: 'body.recordedOn' }),
    ]);
    expect(progressRecordsResponseSchema.parse((await client.records(project)).body).items).toEqual(
      [],
    );
  });

  it('예정·진행·중단에서만 입력할 수 있고 완료·취소에서는 거부한다', async () => {
    const planned = await setup('PLANNED');

    expect((await planned.client.record(planned.project, { percent: 5 })).status).toBe(201);

    const active = await setup();

    await active.client.transition(active.project, { toStatus: 'SUSPENDED', reason: '자재 지연' });
    expect((await active.client.record(active.project, { percent: 5 })).status).toBe(201);
    await active.client.transition(active.project, { toStatus: 'IN_PROGRESS' });
    await active.client.transition(active.project, { toStatus: 'COMPLETED' });
    expect((await active.client.record(active.project, { percent: 100 })).status).toBe(400);
    // 조회는 계속 가능
    expect((await active.client.records(active.project)).status).toBe(200);
  });

  it('없는 프로젝트는 404다', async () => {
    const { client } = await setup();
    const missing = '0198d000-0000-7000-8000-00000000dead';

    expect((await client.records(missing)).status).toBe(404);
    expect((await client.health(missing)).status).toBe(404);
    expect((await client.record(missing, { percent: 5 })).status).toBe(404);
  });

  it('기록은 DB에서도 수정·삭제할 수 없고 범위를 벗어난 값은 거부한다', async () => {
    const { client, project } = await setup();
    const id = progressRecordSchema.parse((await client.record(project, { percent: 30 })).body).id;

    await expect(
      db.app.$executeRawUnsafe('DELETE FROM project_progress_records'),
    ).rejects.toThrow();
    await expect(
      db.app.$executeRawUnsafe(
        `UPDATE project_progress_records SET percent = 90 WHERE id = '${id}'`,
      ),
    ).rejects.toThrow();
    await expect(
      db.ownerPool.query(`UPDATE project_progress_records SET percent = 101 WHERE id = $1`, [id]),
    ).rejects.toThrow(/project_progress_records_percent_range/);
  });
});

describe('진행 점검', () => {
  it('작업 내역이 없고 진행률 기록도 없으면 계획만 보이고 경고가 없다', async () => {
    const { client, project } = await setup();
    const health = projectHealthSchema.parse((await client.health(project)).body);

    expect(health).toMatchObject({
      plannedMinutes: 80 * 480,
      usedMinutes: 0,
      burnPercent: 0,
      progressPercent: null,
      forecastMinutes: null,
    });
    // 10/11까지 41일 경과(≈33.6%)인데 진행률 기록이 없으면 일정 경고 제외
    expect(health.warnings).toEqual([]);
  });

  it('저장된 작업 내역의 공수만 투입 공수로 세고 임시 저장은 뺀다', async () => {
    const { client, project, worker, category } = await setup();
    const entries = [{ employeeId: worker, categoryId: category, minutes: 480 }];

    await client.saveLog(project, '2026-10-05', { status: 'SAVED', content: '가공', entries });
    await client.saveLog(project, '2026-10-06', { status: 'SAVED', content: '설치', entries });
    await client.saveLog(project, '2026-10-07', { status: 'DRAFT', content: '임시', entries });

    expect(projectHealthSchema.parse((await client.health(project)).body).usedMinutes).toBe(960);
  });

  it('기획서 예시: 계획 80MD·투입 56MD·진행률 45%면 소진율 70%, 필요 공수 약 124MD, 소진 과다 경고', async () => {
    const { client, project, worker, category } = await setup();

    // 56MD = 3MD(1,440분) 18일 + 2MD(960분) 1일, 작업 내역은 오늘(10/11)까지만 입력 가능하므로 9월 초부터 입력
    for (let day = 0; day < 19; day += 1) {
      const date = new Date(Date.UTC(2026, 8, 1 + day)).toISOString().slice(0, 10);

      expect(
        (
          await client.saveLog(project, date, {
            status: 'SAVED',
            content: `작업 ${day + 1}`,
            entries: [{ employeeId: worker, categoryId: category, minutes: day < 18 ? 1440 : 960 }],
          })
        ).status,
      ).toBe(200);
    }

    await client.record(project, { percent: 45 });

    const health = projectHealthSchema.parse((await client.health(project)).body);

    expect(health).toMatchObject({
      plannedMinutes: 80 * 480,
      usedMinutes: 56 * 480,
      burnPercent: 70,
      progressPercent: 45,
      progressRecordedOn: '2026-10-11',
    });
    expect(Math.round(health.forecastMinutes! / 480)).toBe(124);
    expect(health.warnings).toEqual(['BURN_AHEAD']);
  });

  it('투입을 취소하면 계획 공수에서 빠지고 계획이 하나도 없으면 소진율이 없다', async () => {
    const { client, project } = await setup();
    const assignmentId = (await client.get(`/projects/${project}/assignments`)).body.items[0]
      .id as string;

    expect(
      (await client.id(`/projects/${project}/assignments/${assignmentId}/cancel`, {})) as unknown,
    ).toBeDefined();

    const health = projectHealthSchema.parse((await client.health(project)).body);

    expect(health).toMatchObject({ plannedMinutes: null, burnPercent: null });
    expect(health.warnings).toEqual([]);
  });

  it('종료 예정일이 지난 진행 중 프로젝트는 지연 경고가 뜨고 중단 중에도 이어진다', async () => {
    const { client, project } = await setup('IN_PROGRESS', '2026-10-05');

    expect(projectHealthSchema.parse((await client.health(project)).body).warnings).toEqual([
      'OVERDUE',
    ]);

    await client.transition(project, { toStatus: 'SUSPENDED', reason: '자재 지연' });
    expect(projectHealthSchema.parse((await client.health(project)).body).warnings).toEqual([
      'OVERDUE',
    ]);
  });

  it('진행률이 일정 경과율보다 많이 뒤처지면 일정 경고가 뜬다', async () => {
    const { client, project } = await setup();

    // 9/1~12/31 중 10/11까지 약 34% 경과
    await client.record(project, { percent: 5 });
    expect(projectHealthSchema.parse((await client.health(project)).body).warnings).toEqual([
      'BEHIND_SCHEDULE',
    ]);

    await client.record(project, { percent: 30 });
    expect(projectHealthSchema.parse((await client.health(project)).body).warnings).toEqual([]);
  });
});
