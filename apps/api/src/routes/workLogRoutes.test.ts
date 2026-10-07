import {
  employeeWorkHistorySchema,
  errorResponseSchema,
  optionsResponseSchema,
  workLogRevisionsSchema,
  workLogSchema,
  workLogsResponseSchema,
  workSummarySchema,
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
import { createProjectService } from '../project/projectService';
import { createWorkLogService } from '../workLog/workLogService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

// 코드의 연도를 고정 (서울 기준 2026-10-07)
const NOW = new Date('2026-10-07T03:00:00Z');

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

const app = (now: Date = NOW) =>
  createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    options: createOptionService(db.app),
    employees: createEmployeeService(db.app, () => now),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => now),
    assignments: createAssignmentService(db.app),
    workLogs: createWorkLogService(db.app, () => now),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `일지회사${sequence}`,
    adminName: '일지관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `log-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `log${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const api = (instance: ReturnType<typeof app>, cookie: string) => {
  const send = (method: 'post' | 'patch' | 'put', path: string, body: object) =>
    (method === 'post'
      ? request(instance).post(`/api/v1${path}`)
      : method === 'put'
        ? request(instance).put(`/api/v1${path}`)
        : request(instance).patch(`/api/v1${path}`)
    )
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body);
  const get = (path: string) => request(instance).get(`/api/v1${path}`).set('Cookie', cookie);

  return {
    createProject: (body: object) => send('post', '/projects', body),
    transition: (id: string, body: object) => send('post', `/projects/${id}/status`, body),
    createEmployee: async (name: string) =>
      (await send('post', '/employees', { name })).body.id as string,
    updateEmployee: (id: string, body: object) => send('patch', `/employees/${id}`, body),
    createPartner: async (kind: string, name: string) =>
      (await send('post', '/partners', { kind, name })).body.id as string,
    options: async () => optionsResponseSchema.parse((await get('/company/options')).body).items,
    updateOption: (id: string, body: object) => send('patch', `/company/options/${id}`, body),
    assign: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/assignments`, body),
    assignments: (projectId: string) => get(`/projects/${projectId}/assignments`),
    put: (projectId: string, date: string, body: object) =>
      send('put', `/projects/${projectId}/work-logs/${date}`, body),
    get: (projectId: string, date: string) => get(`/projects/${projectId}/work-logs/${date}`),
    list: (projectId: string, query = '') => get(`/projects/${projectId}/work-logs${query}`),
    revisions: (projectId: string, date: string) =>
      get(`/projects/${projectId}/work-logs/${date}/revisions`),
  };
};

// 진행 중인 프로젝트(2026-10-01 ~ 2026-12-31)와 직원 두 명(투입 완료), 작업 구분 목록을 만들어 돌려줌
const setup = async (instance: ReturnType<typeof app>) => {
  const cookie = await signedUp(instance);
  const client = api(instance, cookie);
  const clientId = await client.createPartner('CLIENT', '가나다건설');
  const managerId = await client.createEmployee('박소장');
  const worker = await client.createEmployee('김작업');
  const worker2 = await client.createEmployee('이작업');
  const categories = (await client.options()).filter((item) => item.kind === 'WORK_CATEGORY');
  const projectBody = {
    name: 'A동 판금 공사',
    siteName: 'A동 현장',
    clientId,
    managerId,
    contractDate: '2026-09-01',
    plannedStart: '2026-10-01',
    plannedEnd: '2026-12-31',
  };
  const project = (await client.createProject(projectBody)).body.id as string;

  await client.transition(project, { toStatus: 'IN_PROGRESS', effectiveOn: '2026-10-01' });
  await client.assign(project, {
    employeeId: worker,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
  });
  await client.assign(project, {
    employeeId: worker2,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
  });

  const make = async (name: string) => {
    const id = (await client.createProject({ ...projectBody, name })).body.id as string;

    await client.transition(id, { toStatus: 'IN_PROGRESS', effectiveOn: '2026-10-01' });
    await client.assign(id, { employeeId: worker, startDate: '2026-10-01', endDate: '2026-12-31' });

    return id;
  };

  return {
    cookie,
    client,
    clientId,
    managerId,
    worker,
    worker2,
    categories,
    project,
    projectBody,
    make,
  };
};

const full = (setupResult: Awaited<ReturnType<typeof setup>>, extra: object = {}) => ({
  status: 'SAVED',
  content: '외장 패널 1차 설치',
  entries: [
    { employeeId: setupResult.worker, categoryId: setupResult.categories[2]!.id, minutes: 480 },
  ],
  ...extra,
});

const DAY = '2026-10-05';

describe('작업일지 저장·조회', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const instance = app();
    const s = await setup(instance);

    expect((await request(instance).get(`/api/v1/projects/${s.project}/work-logs`)).status).toBe(
      401,
    );
    expect(
      (
        await request(instance)
          .put(`/api/v1/projects/${s.project}/work-logs/${DAY}`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send(full(s))
      ).status,
    ).toBe(401);
  });

  it('그날 일지를 처음 저장하면 버전 1이고 저장 시각이 기록되며 다시 조회된다', async () => {
    const instance = app();
    const s = await setup(instance);
    const res = await s.client.put(
      s.project,
      DAY,
      full(s, { area: ' 3층 ', notes: '맑음', isChange: true }),
    );

    expect(res.status).toBe(200);
    expect(workLogSchema.parse(res.body)).toMatchObject({
      projectId: s.project,
      workDate: DAY,
      status: 'SAVED',
      content: '외장 패널 1차 설치',
      area: '3층',
      notes: '맑음',
      isChange: true,
      isAfterService: false,
      version: 1,
      isLate: false,
      entries: [{ employeeId: s.worker, categoryId: s.categories[2]!.id, minutes: 480 }],
      warnings: [],
      autoAssignedEmployeeIds: [],
    });
    expect(res.body.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(workLogSchema.parse((await s.client.get(s.project, DAY)).body)).toMatchObject({
      version: 1,
      status: 'SAVED',
    });
  });

  it('임시 저장은 비어 있어도 되고 저장 시각이 없으며 계속 고칠 수 있다', async () => {
    const instance = app();
    const s = await setup(instance);
    const draft = await s.client.put(s.project, DAY, { status: 'DRAFT', content: '', entries: [] });

    expect(draft.status).toBe(200);
    expect(draft.body).toMatchObject({ status: 'DRAFT', version: 1, savedAt: null, entries: [] });

    const edited = await s.client.put(s.project, DAY, {
      status: 'DRAFT',
      content: '작성 중',
      entries: [{ employeeId: s.worker, categoryId: s.categories[0]!.id, minutes: 240 }],
      expectedVersion: 1,
    });

    expect(edited.body).toMatchObject({ version: 2, content: '작성 중', savedAt: null });
    // 임시 저장 중의 수정은 수정 이력에 남기지 않음
    expect(
      workLogRevisionsSchema.parse((await s.client.revisions(s.project, DAY)).body).items,
    ).toHaveLength(0);
  });

  it('저장하려면 작업 내용과 공수가 있어야 한다', async () => {
    const instance = app();
    const s = await setup(instance);
    const noContent = await s.client.put(s.project, DAY, full(s, { content: '   ' }));
    const noEntries = await s.client.put(s.project, DAY, full(s, { entries: [] }));

    expect(noContent.status).toBe(400);
    expect(errorResponseSchema.parse(noContent.body).error.details?.[0]?.path).toBe('body.content');
    expect(noEntries.status).toBe(400);
    expect(errorResponseSchema.parse(noEntries.body).error.details?.[0]?.path).toBe('body.entries');
    expect((await s.client.get(s.project, DAY)).status).toBe(404);
  });

  it('목록은 최근 날짜 순이고 공수 합·임시 저장 표시를 보여 주며 날짜·상태로 거른다', async () => {
    const instance = app();
    const s = await setup(instance);

    await s.client.put(s.project, '2026-10-01', full(s));
    await s.client.put(s.project, '2026-10-02', {
      ...full(s),
      entries: [
        { employeeId: s.worker, categoryId: s.categories[0]!.id, minutes: 240 },
        { employeeId: s.worker2, categoryId: s.categories[0]!.id, minutes: 360 },
      ],
    });
    await s.client.put(s.project, '2026-10-03', { status: 'DRAFT', content: '', entries: [] });

    const all = workLogsResponseSchema.parse((await s.client.list(s.project)).body).items;

    expect(all.map((item) => item.workDate)).toEqual(['2026-10-03', '2026-10-02', '2026-10-01']);
    expect(all[1]).toMatchObject({
      status: 'SAVED',
      entryCount: 2,
      totalMinutes: 600,
      hasContent: true,
    });
    expect(all[0]).toMatchObject({
      status: 'DRAFT',
      entryCount: 0,
      totalMinutes: 0,
      hasContent: false,
    });

    const names = async (query: string) =>
      workLogsResponseSchema
        .parse((await s.client.list(s.project, query)).body)
        .items.map((item) => item.workDate);

    expect(await names('?status=DRAFT')).toEqual(['2026-10-03']);
    expect(await names('?from=2026-10-02')).toEqual(['2026-10-03', '2026-10-02']);
    expect(await names('?from=2026-10-02&to=2026-10-02')).toEqual(['2026-10-02']);
    expect((await s.client.list(s.project, '?status=NOPE')).status).toBe(400);
    expect((await s.client.list(s.project, '?from=2026-13-01')).status).toBe(400);
  });
});

describe('낙관적 잠금과 수정 이력', () => {
  it('이미 있는 일지를 버전 없이 보내거나 다른 버전으로 보내면 충돌이다', async () => {
    const instance = app();
    const s = await setup(instance);

    await s.client.put(s.project, DAY, full(s));

    const withoutVersion = await s.client.put(s.project, DAY, full(s, { content: '다른 내용' }));

    expect(withoutVersion.status).toBe(409);
    expect(errorResponseSchema.parse(withoutVersion.body).error.code).toBe('CONFLICT');
    expect(
      (await s.client.put(s.project, DAY, full(s, { content: '다른 내용', expectedVersion: 7 })))
        .status,
    ).toBe(409);
    // 충돌한 요청은 아무것도 바꾸지 않는다
    expect((await s.client.get(s.project, DAY)).body).toMatchObject({
      version: 1,
      content: '외장 패널 1차 설치',
    });
  });

  it('없는 일지에 버전을 보내면 충돌이다 (화면이 지워진 일지를 보고 있다고 믿는 경우)', async () => {
    const instance = app();
    const s = await setup(instance);

    expect((await s.client.put(s.project, DAY, full(s, { expectedVersion: 1 }))).status).toBe(409);
    expect((await s.client.get(s.project, DAY)).status).toBe(404);
  });

  it('맞는 버전이면 고쳐지고 버전이 오른다', async () => {
    const instance = app();
    const s = await setup(instance);

    await s.client.put(s.project, DAY, full(s));

    const second = await s.client.put(
      s.project,
      DAY,
      full(s, { content: '2차 수정', expectedVersion: 1 }),
    );
    const third = await s.client.put(
      s.project,
      DAY,
      full(s, { content: '3차 수정', expectedVersion: 2 }),
    );

    expect(second.body).toMatchObject({ version: 2, content: '2차 수정' });
    expect(third.body).toMatchObject({ version: 3, content: '3차 수정' });
  });

  it('같은 버전으로 동시에 두 번 고치면 한 건만 성공하고 한 건은 충돌이다', async () => {
    const instance = app();
    const s = await setup(instance);

    await s.client.put(s.project, DAY, full(s));

    const results = await Promise.all([
      s.client.put(s.project, DAY, full(s, { content: 'A 화면의 수정', expectedVersion: 1 })),
      s.client.put(s.project, DAY, full(s, { content: 'B 화면의 수정', expectedVersion: 1 })),
      s.client.put(s.project, DAY, full(s, { content: 'C 화면의 수정', expectedVersion: 1 })),
    ]);

    expect(results.map((res) => res.status).sort()).toEqual([200, 409, 409]);
    expect((await s.client.get(s.project, DAY)).body.version).toBe(2);
    // 이력도 한 건
    expect(
      workLogRevisionsSchema.parse((await s.client.revisions(s.project, DAY)).body).items,
    ).toHaveLength(1);
  });

  it('같은 날 일지를 동시에 처음 만들면 한 건만 만들어진다', async () => {
    const instance = app();
    const s = await setup(instance);
    const results = await Promise.all([1, 2, 3].map(() => s.client.put(s.project, DAY, full(s))));

    expect(results.map((res) => res.status).sort()).toEqual([200, 409, 409]);
    expect(workLogsResponseSchema.parse((await s.client.list(s.project)).body).items).toHaveLength(
      1,
    );
  });

  it('저장된 일지를 고치면 고치기 전 값이 최근순 이력으로 남는다', async () => {
    const instance = app();
    const s = await setup(instance);

    await s.client.put(s.project, DAY, full(s, { area: '1층' }));
    await s.client.put(s.project, DAY, {
      ...full(s, { content: '내용 수정', area: '2층', expectedVersion: 1 }),
      entries: [{ employeeId: s.worker, categoryId: s.categories[2]!.id, minutes: 600 }],
    });
    await s.client.put(s.project, DAY, full(s, { content: '또 수정', expectedVersion: 2 }));

    const items = workLogRevisionsSchema.parse(
      (await s.client.revisions(s.project, DAY)).body,
    ).items;

    expect(items.map((item) => item.version)).toEqual([2, 1]);
    expect(items[1]!.snapshot).toMatchObject({
      status: 'SAVED',
      content: '외장 패널 1차 설치',
      area: '1층',
      entries: [{ employeeId: s.worker, categoryId: s.categories[2]!.id, minutes: 480 }],
    });
    expect(items[0]!.snapshot).toMatchObject({
      content: '내용 수정',
      area: '2층',
      entries: [{ minutes: 600 }],
    });
    expect(items[0]!.changedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // 변경자 식별값은 응답에 없음
    expect(JSON.stringify(items)).not.toContain('changedBy');
  });

  it('임시 저장을 처음 저장하면 이력은 없고 저장 시각이 기록되며, 저장된 일지를 임시 저장으로 되돌릴 수 없다', async () => {
    const instance = app();
    const s = await setup(instance);

    await s.client.put(s.project, DAY, { status: 'DRAFT', content: '초안', entries: [] });

    const saved = await s.client.put(s.project, DAY, full(s, { expectedVersion: 1 }));

    expect(saved.body.savedAt).not.toBeNull();
    expect(
      workLogRevisionsSchema.parse((await s.client.revisions(s.project, DAY)).body).items,
    ).toHaveLength(0);

    const back = await s.client.put(s.project, DAY, {
      status: 'DRAFT',
      content: 'x',
      entries: [],
      expectedVersion: 2,
    });

    expect(back.status).toBe(400);
    expect(errorResponseSchema.parse(back.body).error.details?.[0]?.path).toBe('body.status');
  });

  it('이력은 앱 계정이 수정·삭제할 수 없고 일지도 지울 수 없다', async () => {
    const instance = app();
    const s = await setup(instance);

    await s.client.put(s.project, DAY, full(s));
    await s.client.put(s.project, DAY, full(s, { content: '수정', expectedVersion: 1 }));

    await expect(db.app.$executeRawUnsafe('DELETE FROM work_log_revisions')).rejects.toThrow();
    await expect(
      db.app.$executeRawUnsafe(`UPDATE work_log_revisions SET version = 99`),
    ).rejects.toThrow();
    await expect(db.app.$executeRawUnsafe('DELETE FROM work_logs')).rejects.toThrow();
  });
});

describe('작업 일자·프로젝트 상태', () => {
  it('프로젝트 기간 밖이거나 오늘 이후 날짜는 거부한다', async () => {
    const instance = app();
    const s = await setup(instance);

    for (const date of ['2026-09-30', '2027-01-01', '2026-10-08']) {
      const res = await s.client.put(s.project, date, full(s));

      expect(res.status).toBe(400);
      expect(errorResponseSchema.parse(res.body).error.details?.[0]?.path).toBe('body.workDate');
    }

    // 경계일(프로젝트 시작일)과 오늘은 가능
    expect((await s.client.put(s.project, '2026-10-01', full(s))).status).toBe(200);
    expect((await s.client.put(s.project, '2026-10-07', full(s))).status).toBe(200);
    expect((await s.client.put(s.project, 'not-a-date', full(s))).status).toBe(400);
  });

  it('예정·취소 프로젝트에는 일지를 쓸 수 없다', async () => {
    const instance = app();
    const s = await setup(instance);
    const planned = (await s.client.createProject(s.projectBody)).body.id as string;
    const cancelled = (await s.client.createProject(s.projectBody)).body.id as string;

    await s.client.transition(cancelled, { toStatus: 'CANCELLED', reason: '해지' });

    for (const id of [planned, cancelled]) {
      expect((await s.client.put(id, DAY, full(s))).status).toBe(400);
    }
  });

  it('중단·완료 프로젝트는 관리자 확인이 있어야 쓸 수 있다', async () => {
    const instance = app();
    const s = await setup(instance);
    const suspended = await s.make('중단될 공사');
    const completed = await s.make('완료될 공사');

    await s.client.transition(suspended, {
      toStatus: 'SUSPENDED',
      effectiveOn: '2026-10-02',
      reason: '우천',
    });
    await s.client.transition(completed, { toStatus: 'COMPLETED', effectiveOn: '2026-10-06' });

    for (const id of [suspended, completed]) {
      const blocked = await s.client.put(id, DAY, full(s));

      expect(blocked.status).toBe(400);
      expect(errorResponseSchema.parse(blocked.body).error.details?.[0]?.path).toBe(
        'body.confirmStatus',
      );
      expect((await s.client.put(id, DAY, full(s, { confirmStatus: true }))).status).toBe(200);
    }
  });

  it('보증 중에는 사후 작업 표시가 있어야 하고 종료된 프로젝트에는 쓸 수 없다', async () => {
    const instance = app();
    const s = await setup(instance);
    const warranty = await s.make('보증 공사');
    const closed = await s.make('종료 공사');

    // 보증 중·종료는 아직 전환 기능이 없어(4단계) 소유 계정으로 상태를 맞춰 준비
    await db.ownerPool.query(
      `UPDATE projects SET status = 'WARRANTY', actual_start = '2026-10-01', actual_end = '2026-10-06' WHERE id = $1`,
      [warranty],
    );
    await db.ownerPool.query(
      `UPDATE projects SET status = 'CLOSED', actual_start = '2026-10-01', actual_end = '2026-10-06' WHERE id = $1`,
      [closed],
    );

    expect((await s.client.put(warranty, DAY, full(s))).status).toBe(400);
    expect((await s.client.put(warranty, DAY, full(s, { isAfterService: true }))).status).toBe(200);
    expect(
      (await s.client.put(closed, DAY, full(s, { isAfterService: true, confirmStatus: true })))
        .status,
    ).toBe(400);
  });
});

describe('지연 입력', () => {
  it('작업일에서 3일을 넘겨 처음 저장하면 지연 입력으로 표시된다 (표시만, 저장은 된다)', async () => {
    const instance = app();
    const s = await setup(instance);
    // 오늘은 2026-10-07: 10-03은 4일 뒤 저장 → 지연, 10-04는 3일 뒤 → 아님
    const late = await s.client.put(s.project, '2026-10-03', full(s));
    const ontime = await s.client.put(s.project, '2026-10-04', full(s));

    expect(late.status).toBe(200);
    expect(late.body.isLate).toBe(true);
    expect(ontime.body.isLate).toBe(false);
    expect(
      workLogsResponseSchema
        .parse((await s.client.list(s.project)).body)
        .items.map((item) => item.isLate),
    ).toEqual([false, true]);
  });

  it('임시 저장 중에는 지연 입력이 아니고 저장하는 시점부터 계산한다', async () => {
    const instance = app();
    const s = await setup(instance);
    const draft = await s.client.put(s.project, '2026-10-01', {
      status: 'DRAFT',
      content: '',
      entries: [],
    });

    expect(draft.body.isLate).toBe(false);
    expect(
      (await s.client.put(s.project, '2026-10-01', full(s, { expectedVersion: 1 }))).body.isLate,
    ).toBe(true);
  });
});

describe('공수 항목 검증', () => {
  it('없는 직원·작업 구분이 아닌 항목·다른 회사 항목은 거부한다', async () => {
    const instance = app();
    const s = await setup(instance);
    const other = await setup(instance);
    const job = (await s.client.options()).find((item) => item.kind === 'JOB_TYPE')!;
    const category = s.categories[0]!.id;

    for (const entries of [
      [{ employeeId: '0198d000-0000-7000-8000-000000000999', categoryId: category, minutes: 60 }],
      [{ employeeId: s.worker, categoryId: job.id, minutes: 60 }],
      [{ employeeId: s.worker, categoryId: '0198d000-0000-7000-8000-000000000999', minutes: 60 }],
      [{ employeeId: other.worker, categoryId: category, minutes: 60 }],
      [{ employeeId: s.worker, categoryId: other.categories[0]!.id, minutes: 60 }],
    ]) {
      const res = await s.client.put(s.project, DAY, { status: 'DRAFT', content: '', entries });

      expect(res.status).toBe(400);
      expect(errorResponseSchema.parse(res.body).error.details?.[0]?.path).toBe('body.entries');
    }
  });

  it('같은 직원·작업 구분 조합 중복과 공수 범위를 거부하고, 같은 직원이 작업 구분을 나눠 입력할 수 있다', async () => {
    const instance = app();
    const s = await setup(instance);
    const [a, b] = s.categories;

    expect(
      (
        await s.client.put(s.project, DAY, {
          status: 'DRAFT',
          content: '',
          entries: [
            { employeeId: s.worker, categoryId: a!.id, minutes: 60 },
            { employeeId: s.worker, categoryId: a!.id, minutes: 60 },
          ],
        })
      ).status,
    ).toBe(400);

    for (const minutes of [0, 1441, 1.5]) {
      expect(
        (
          await s.client.put(s.project, DAY, {
            status: 'DRAFT',
            content: '',
            entries: [{ employeeId: s.worker, categoryId: a!.id, minutes }],
          })
        ).status,
      ).toBe(400);
    }

    const split = await s.client.put(s.project, DAY, {
      status: 'SAVED',
      content: '가공 후 설치',
      entries: [
        { employeeId: s.worker, categoryId: a!.id, minutes: 240 },
        { employeeId: s.worker, categoryId: b!.id, minutes: 240 },
      ],
    });

    expect(split.status).toBe(200);
    expect(workLogSchema.parse(split.body).entries).toHaveLength(2);
  });

  it('숨긴 작업 구분은 새로 고를 수 없지만 이 일지가 이미 쓰고 있으면 유지할 수 있다', async () => {
    const instance = app();
    const s = await setup(instance);
    const category = s.categories[1]!;

    await s.client.put(
      s.project,
      DAY,
      full(s, { entries: [{ employeeId: s.worker, categoryId: category.id, minutes: 60 }] }),
    );
    await s.client.updateOption(category.id, { isActive: false });

    expect(
      (
        await s.client.put(
          s.project,
          DAY,
          full(s, {
            content: '수정',
            expectedVersion: 1,
            entries: [{ employeeId: s.worker, categoryId: category.id, minutes: 90 }],
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await s.client.put(
          s.project,
          '2026-10-06',
          full(s, { entries: [{ employeeId: s.worker, categoryId: category.id, minutes: 60 }] }),
        )
      ).status,
    ).toBe(400);
  });
});

describe('투입이 없는 직원 (서비스 기획서 §9.3)', () => {
  it('저장할 때 투입 등록이 없으면 확인을 요구하고, 확인하면 그날 투입을 자동으로 추가한다', async () => {
    const instance = app();
    const s = await setup(instance);
    const stranger = await s.client.createEmployee('새직원');
    const body = full(s, {
      entries: [{ employeeId: stranger, categoryId: s.categories[0]!.id, minutes: 480 }],
    });
    const asked = await s.client.put(s.project, DAY, body);

    expect(asked.status).toBe(400);
    expect(errorResponseSchema.parse(asked.body).error.details?.[0]).toMatchObject({
      path: 'body.addMissingAssignments',
      message: expect.stringContaining('새직원'),
    });
    expect((await s.client.get(s.project, DAY)).status).toBe(404);

    const added = await s.client.put(s.project, DAY, { ...body, addMissingAssignments: true });

    expect(added.status).toBe(200);
    expect(added.body.autoAssignedEmployeeIds).toEqual([stranger]);

    const assignments = (await s.client.assignments(s.project)).body.items as {
      employeeId: string;
      startDate: string;
      endDate: string;
    }[];

    expect(assignments.find((item) => item.employeeId === stranger)).toMatchObject({
      startDate: DAY,
      endDate: DAY,
    });
    // 다시 고칠 때는 이미 투입이 있어 확인이 필요 없다
    expect(
      (await s.client.put(s.project, DAY, { ...body, content: '수정', expectedVersion: 1 })).body
        .autoAssignedEmployeeIds,
    ).toEqual([]);
  });

  it('임시 저장은 투입을 확인하지 않고, 퇴사한 직원은 막지 않고 경고만 한다', async () => {
    const instance = app();
    const s = await setup(instance);
    const stranger = await s.client.createEmployee('새직원');
    const left = await s.client.createEmployee('퇴사직원');

    await s.client.updateEmployee(left, { status: 'LEFT' });

    expect(
      (
        await s.client.put(s.project, '2026-10-02', {
          status: 'DRAFT',
          content: '',
          entries: [{ employeeId: stranger, categoryId: s.categories[0]!.id, minutes: 60 }],
        })
      ).status,
    ).toBe(200);

    const saved = await s.client.put(s.project, DAY, {
      status: 'SAVED',
      content: '퇴사 전 작업 기록',
      entries: [{ employeeId: left, categoryId: s.categories[0]!.id, minutes: 480 }],
    });

    expect(saved.status).toBe(200);
    expect(saved.body.warnings).toEqual([{ type: 'LEFT', employeeId: left }]);
    expect(saved.body.autoAssignedEmployeeIds).toEqual([]);
  });

  it('휴직 직원은 경고와 함께 저장된다', async () => {
    const instance = app();
    const s = await setup(instance);

    await s.client.updateEmployee(s.worker, { status: 'ON_LEAVE' });

    expect((await s.client.put(s.project, DAY, full(s))).body.warnings).toEqual([
      { type: 'ON_LEAVE', employeeId: s.worker },
    ]);
  });
});

describe('하루 합계 공수 경고', () => {
  it('같은 직원이 같은 날 다른 프로젝트에도 저장된 일지가 있어 합계가 기준시간의 1.5배를 넘으면 경고한다', async () => {
    const instance = app();
    const s = await setup(instance);
    const other = await s.make('B동 덕트');

    await s.client.put(other, DAY, full(s, { content: 'B동 작업' }));

    const res = await s.client.put(s.project, DAY, full(s));

    expect(res.body.warnings).toEqual([
      {
        type: 'DAILY_OVER',
        employeeId: s.worker,
        totalMinutes: 960,
        otherProjects: [
          expect.objectContaining({ projectId: other, projectName: 'B동 덕트', minutes: 480 }),
        ],
      },
    ]);
    // 먼저 저장한 쪽을 다시 읽어도 같은 경고가 보인다
    expect((await s.client.get(other, DAY)).body.warnings).toEqual([
      expect.objectContaining({ type: 'DAILY_OVER', totalMinutes: 960 }),
    ]);
  });

  it('연장 1.5(하루 기준의 1.5배) 한 번이나 임시 저장 일지는 경고하지 않는다', async () => {
    const instance = app();
    const s = await setup(instance);
    const other = await s.make('B동 덕트');

    // 임시 저장은 집계에서 제외되므로 다른 프로젝트 초안은 합계에 넣지 않음
    await s.client.put(other, DAY, {
      status: 'DRAFT',
      content: '',
      entries: [{ employeeId: s.worker, categoryId: s.categories[0]!.id, minutes: 480 }],
    });

    expect(
      (
        await s.client.put(
          s.project,
          DAY,
          full(s, {
            entries: [{ employeeId: s.worker, categoryId: s.categories[0]!.id, minutes: 720 }],
          }),
        )
      ).body.warnings,
    ).toEqual([]);
    expect(
      (
        await s.client.put(
          s.project,
          '2026-10-06',
          full(s, {
            entries: [{ employeeId: s.worker, categoryId: s.categories[0]!.id, minutes: 721 }],
          }),
        )
      ).body.warnings,
    ).toEqual([expect.objectContaining({ type: 'DAILY_OVER', totalMinutes: 721 })]);
  });

  it('같은 일지 안에서 작업 구분을 나눈 공수도 합쳐서 본다', async () => {
    const instance = app();
    const s = await setup(instance);
    const res = await s.client.put(s.project, DAY, {
      status: 'SAVED',
      content: '긴 하루',
      entries: [
        { employeeId: s.worker, categoryId: s.categories[0]!.id, minutes: 600 },
        { employeeId: s.worker, categoryId: s.categories[1]!.id, minutes: 600 },
      ],
    });

    expect(res.body.warnings).toEqual([
      expect.objectContaining({ type: 'DAILY_OVER', totalMinutes: 1200, otherProjects: [] }),
    ]);
  });
});

describe('회사 격리·DB 제약', () => {
  it('다른 회사의 프로젝트 일지는 조회·저장·이력 어디에도 보이지 않는다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);

    await a.client.put(a.project, DAY, full(a));

    expect((await b.client.list(a.project)).status).toBe(404);
    expect((await b.client.get(a.project, DAY)).status).toBe(404);
    expect((await b.client.put(a.project, DAY, full(b))).status).toBe(404);
    expect((await b.client.revisions(a.project, DAY)).status).toBe(404);
    expect((await a.client.get(a.project, DAY)).body.content).toBe('외장 패널 1차 설치');
  });

  it('요청에 회사 ID를 실어 보내도 무시된다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);
    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      'SELECT company_id FROM projects WHERE id = $1',
      [a.project],
    );

    expect(
      (await b.client.put(b.project, DAY, full(b, { companyId: rows[0]!.company_id }))).status,
    ).toBe(200);
    expect(workLogsResponseSchema.parse((await a.client.list(a.project)).body).items).toHaveLength(
      0,
    );
  });

  it('없는 프로젝트나 일지는 404이고 잘못된 주소 형식은 400이다', async () => {
    const instance = app();
    const s = await setup(instance);

    expect((await s.client.list('0198d000-0000-7000-8000-000000000999')).status).toBe(404);
    expect((await s.client.get(s.project, DAY)).status).toBe(404);
    expect((await s.client.revisions(s.project, DAY)).status).toBe(404);
    expect((await s.client.get(s.project, '2026-13-40')).status).toBe(400);
    expect((await s.client.list('not-a-uuid')).status).toBe(400);
  });

  it('저장됨인데 작업 내용·저장 시각이 없는 행, 공수 범위 밖, 같은 날 중복 일지, 다른 회사 연결을 DB가 거부한다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);
    const created = await a.client.put(a.project, DAY, full(a));
    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      'SELECT company_id FROM projects WHERE id = $1',
      [a.project],
    );
    const company = rows[0]!.company_id;

    await expect(
      db.ownerPool.query(
        `INSERT INTO work_logs (company_id, project_id, work_date, status, content) VALUES ($1, $2, '2026-10-02', 'SAVED', '내용')`,
        [company, a.project],
      ),
    ).rejects.toThrow(/work_logs_saved_consistency/);
    await expect(
      db.ownerPool.query(
        `INSERT INTO work_logs (company_id, project_id, work_date, status, content, saved_at) VALUES ($1, $2, '2026-10-02', 'SAVED', '  ', now())`,
        [company, a.project],
      ),
    ).rejects.toThrow(/work_logs_saved_consistency/);
    await expect(
      db.ownerPool.query(
        `INSERT INTO work_logs (company_id, project_id, work_date) VALUES ($1, $2, $3)`,
        [company, a.project, DAY],
      ),
    ).rejects.toThrow(/work_logs_company_id_project_id_work_date_key/);
    await expect(
      db.ownerPool.query(
        `INSERT INTO work_log_entries (company_id, work_log_id, employee_id, category_id, minutes) VALUES ($1, $2, $3, $4, 0)`,
        [company, created.body.id, a.worker, a.categories[0]!.id],
      ),
    ).rejects.toThrow(/work_log_entries_minutes_range/);
    await expect(
      db.ownerPool.query(
        `INSERT INTO work_log_entries (company_id, work_log_id, employee_id, category_id, minutes) VALUES ($1, $2, $3, $4, 60)`,
        [company, created.body.id, b.worker, a.categories[0]!.id],
      ),
    ).rejects.toThrow(/work_log_entries_company_id_employee_id_fkey/);
    await expect(
      db.ownerPool.query(
        `INSERT INTO work_log_entries (company_id, work_log_id, employee_id, category_id, minutes) VALUES ($1, $2, $3, $4, 60)`,
        [company, created.body.id, a.worker, b.categories[0]!.id],
      ),
    ).rejects.toThrow(/work_log_entries_company_id_category_id_fkey/);
  });
});

describe('공수 집계', () => {
  const fetch = (instance: ReturnType<typeof app>, cookie: string, path: string) =>
    request(instance).get(`/api/v1${path}`).set('Cookie', cookie);

  it('프로젝트 집계는 저장된 일지만 직원별·작업 구분별·주별로 합산하고 임시 저장은 건수만 알린다', async () => {
    const instance = app();
    const s = await setup(instance);
    const [cat1, cat2] = [s.categories[0]!.id, s.categories[1]!.id];

    await s.client.put(s.project, '2026-10-05', {
      status: 'SAVED',
      content: '월요일 작업',
      entries: [
        { employeeId: s.worker, categoryId: cat1, minutes: 240 },
        { employeeId: s.worker, categoryId: cat2, minutes: 240 },
        { employeeId: s.worker2, categoryId: cat2, minutes: 720 },
      ],
    });
    await s.client.put(s.project, '2026-10-06', {
      status: 'SAVED',
      content: '화요일 작업',
      entries: [{ employeeId: s.worker, categoryId: cat1, minutes: 480 }],
    });
    await s.client.put(s.project, '2026-10-07', {
      status: 'DRAFT',
      content: '',
      entries: [{ employeeId: s.worker2, categoryId: cat1, minutes: 480 }],
    });

    const res = await fetch(instance, s.cookie, `/projects/${s.project}/work-summary`);
    const summary = workSummarySchema.parse(res.body);

    expect(res.status).toBe(200);
    expect(summary).toMatchObject({
      totalMinutes: 1680,
      workedDays: 2,
      savedLogCount: 2,
      draftLogCount: 1,
      plannedMinutes: null,
    });
    expect(summary.byEmployee).toEqual([
      { employeeId: s.worker, workedDays: 2, totalMinutes: 960, plannedMinutes: null },
      { employeeId: s.worker2, workedDays: 1, totalMinutes: 720, plannedMinutes: null },
    ]);
    expect(summary.byCategory).toEqual([
      { categoryId: cat2, totalMinutes: 960 },
      { categoryId: cat1, totalMinutes: 720 },
    ]);
    expect(summary.byPeriod).toEqual([{ periodStart: '2026-10-05', totalMinutes: 1680 }]);

    // 기간 필터와 월별 묶음
    const ranged = workSummarySchema.parse(
      (
        await fetch(
          instance,
          s.cookie,
          `/projects/${s.project}/work-summary?from=2026-10-06&to=2026-10-31&unit=month`,
        )
      ).body,
    );

    expect(ranged.totalMinutes).toBe(480);
    expect(ranged.byPeriod).toEqual([{ periodStart: '2026-10-01', totalMinutes: 480 }]);
  });

  it('계획 공수는 취소하지 않은 투입의 합이다', async () => {
    const instance = app();
    const s = await setup(instance);
    const planner = await s.client.createEmployee('계획직원');
    const extra = await s.client.assign(s.project, {
      employeeId: planner,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      plannedMinutes: 4800,
    });

    expect(extra.status).toBe(201);

    const summary = workSummarySchema.parse(
      (await fetch(instance, s.cookie, `/projects/${s.project}/work-summary`)).body,
    );

    expect(summary.plannedMinutes).toBe(4800);
    expect(summary.byEmployee.find((row) => row.employeeId === planner)?.plannedMinutes).toBe(4800);
  });

  it('직원 이력은 프로젝트별 투입 기간·일수·공수와 이번 달·올해 공수를 준다', async () => {
    const instance = app();
    const s = await setup(instance);
    const other = await s.make('B동 설비 공사');
    const cat = s.categories[0]!.id;

    await s.client.put(
      s.project,
      '2026-10-05',
      full(s, { entries: [{ employeeId: s.worker, categoryId: cat, minutes: 480 }] }),
    );
    await s.client.put(
      s.project,
      '2026-10-06',
      full(s, { entries: [{ employeeId: s.worker, categoryId: cat, minutes: 720 }] }),
    );
    await s.client.put(
      other,
      '2026-10-02',
      full(s, { entries: [{ employeeId: s.worker, categoryId: cat, minutes: 480 }] }),
    );
    await s.client.put(other, '2026-10-03', {
      status: 'DRAFT',
      content: '',
      entries: [{ employeeId: s.worker, categoryId: cat, minutes: 480 }],
    });

    const res = await fetch(instance, s.cookie, `/employees/${s.worker}/work-history`);
    const history = employeeWorkHistorySchema.parse(res.body);

    expect(res.status).toBe(200);
    expect(history).toMatchObject({
      thisMonthMinutes: 1680,
      thisYearMinutes: 1680,
      totalMinutes: 1680,
    });
    expect(history.projects).toHaveLength(2);
    expect(history.projects[0]).toMatchObject({
      projectId: s.project,
      workedDays: 2,
      totalMinutes: 1200,
      lastWorkDate: '2026-10-06',
      assignedFrom: '2026-10-01',
      assignedTo: '2026-12-31',
    });
    expect(history.projects[1]).toMatchObject({
      projectId: other,
      workedDays: 1,
      totalMinutes: 480,
    });
  });

  it('다른 회사의 프로젝트·직원이나 없는 대상은 찾을 수 없고 로그인이 필요하다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);

    expect((await fetch(instance, b.cookie, `/projects/${a.project}/work-summary`)).status).toBe(
      404,
    );
    expect((await fetch(instance, b.cookie, `/employees/${a.worker}/work-history`)).status).toBe(
      404,
    );
    expect((await request(instance).get(`/api/v1/projects/${a.project}/work-summary`)).status).toBe(
      401,
    );
    expect((await request(instance).get(`/api/v1/employees/${a.worker}/work-history`)).status).toBe(
      401,
    );
    expect(
      errorResponseSchema.parse(
        (await fetch(instance, a.cookie, `/projects/${a.project}/work-summary?from=bad`)).body,
      ).error.code,
    ).toBe('VALIDATION_ERROR');
  });
});
