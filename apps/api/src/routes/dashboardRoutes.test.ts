import {
  alertSettingsSchema,
  dashboardResponseSchema,
  optionsResponseSchema,
  type DashboardResponse,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createChangeWorkService } from '../changeWork/changeWorkService';
import { createOptionService } from '../company/optionService';
import { createCredentialService } from '../credential/credentialService';
import { createDocumentService } from '../document/documentService';
import { createFileService } from '../file/fileService';
import { createMonthlyService } from '../monthly/monthlyService';
import { createRepairService } from '../repair/repairService';
import { createWarrantyService } from '../warranty/warrantyService';
import { createMemoryQueue } from '../queue/jobQueue';
import { createMemoryStorage } from '../storage/objectStorage';
import { createDashboardService } from '../dashboard/dashboardService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createEmployeeService } from '../employee/employeeService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createMemoService } from '../memo/memoService';
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

// 서울 기준 2026-10-11(일): 이번 주는 10/5 ~ 10/11
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

const app = () => {
  const assignments = createAssignmentService(db.app);
  const memory = createMemoryStorage();

  return createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    options: createOptionService(db.app),
    employees: createEmployeeService(db.app, () => NOW),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => NOW),
    assignments,
    workLogs: createWorkLogService(db.app, () => NOW),
    memos: createMemoService(db.app, () => NOW),
    progress: createProgressService(db.app, () => NOW),
    changeWorks: createChangeWorkService(db.app, () => NOW),
    files: createFileService({
      app: db.app,
      storage: memory.storage,
      queue: createMemoryQueue().queue,
      now: () => NOW,
    }),
    documents: createDocumentService(db.app, memory.storage, () => NOW),
    warranty: createWarrantyService(db.app, () => NOW),
    repairs: createRepairService(db.app, () => NOW),
    monthly: createMonthlyService(db.app, () => NOW),
    credentials: createCredentialService({ app: db.app, storage: memory.storage, now: () => NOW }),
    dashboard: createDashboardService(db.app, assignments, () => NOW),
    appOrigin: 'http://localhost:5173',
  });
};

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `대시보드회사${sequence}`,
    adminName: '대시보드관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `dash-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `dash${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const api = (instance: ReturnType<typeof app>, cookie: string) => {
  const send = (method: 'post' | 'put' | 'patch', path: string, body: object) =>
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
    get,
    send,
    id: async (path: string, body: object) => (await send('post', path, body)).body.id as string,
    dashboard: async () => dashboardResponseSchema.parse((await get('/dashboard')).body),
    saveLog: (projectId: string, date: string, body: object) =>
      send('put', `/projects/${projectId}/work-logs/${date}`, body),
  };
};

type Client = ReturnType<typeof api>;

const kinds = (response: DashboardResponse) => response.dashboard.alerts.map((alert) => alert.kind);

// 회사 하나: 직원 셋과 프로젝트 만드는 도구
const setup = async () => {
  const instance = app();
  const cookie = await signedUp(instance);
  const client = api(instance, cookie);
  const clientId = await client.id('/partners', { kind: 'CLIENT', name: '가나다건설' });
  const managerId = await client.id('/employees', { name: '박소장' });
  const worker = await client.id('/employees', { name: '김작업' });
  const worker2 = await client.id('/employees', { name: '이작업' });
  const category = optionsResponseSchema
    .parse((await client.get('/company/options')).body)
    .items.find((item) => item.kind === 'WORK_CATEGORY')!.id;
  const make = async (
    c: Client,
    name: string,
    patch: { plannedEnd?: string; start?: boolean } = {},
  ) => {
    const project = await c.id('/projects', {
      name,
      siteName: `${name} 현장`,
      clientId,
      managerId,
      contractDate: '2026-08-01',
      plannedStart: '2026-09-01',
      plannedEnd: patch.plannedEnd ?? '2026-12-31',
    });

    if (patch.start !== false) {
      await c.id(`/projects/${project}/status`, {
        toStatus: 'IN_PROGRESS',
        effectiveOn: '2026-09-01',
      });
    }

    return project;
  };
  const assign = (project: string, employeeId: string, body: object = {}) =>
    client.id(`/projects/${project}/assignments`, {
      employeeId,
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      ...body,
    });

  return { instance, client, worker, worker2, category, managerId, make, assign };
};

describe('GET /dashboard', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const instance = app();

    expect((await request(instance).get('/api/v1/dashboard')).status).toBe(401);
    expect((await request(instance).get('/api/v1/company/alert-settings')).status).toBe(401);
  });

  it('기록이 없으면 위젯이 비어 있고 알림이 없다', async () => {
    const { client } = await setup();
    const { dashboard, settings } = await client.dashboard();

    expect(dashboard).toMatchObject({
      today: '2026-10-11',
      alerts: [],
      todayAssignments: { headcount: 0, projects: [] },
      projectCounts: { planned: 0, inProgress: 0, suspended: 0 },
      activeProjects: [],
      risks: [],
      week: { from: '2026-10-05', to: '2026-10-11', conflicts: [] },
      todos: { draftLogCount: 0, staleInboxCount: 0, unclosedMonth: null },
      warranty: { ending: [], openRepairCount: 0 },
      expiring: { certificates: [], credentials: [] },
    });
    // 직원 세 명(박소장·김작업·이작업)은 이번 주 내내 비어 있다
    expect(dashboard.week.freeCount).toBe(3);
    expect(settings.items).toHaveLength(12);
    expect(settings.items.every((item) => item.enabled)).toBe(true);
  });

  it('오늘 투입된 프로젝트에 작업 내역이 없으면 알리고 작업 내역을 저장하면 사라진다', async () => {
    const { client, worker, worker2, category, make, assign } = await setup();
    const project = await make(client, 'A동 판금');

    await assign(project, worker);
    await assign(project, worker2);

    const first = await client.dashboard();

    expect(first.dashboard.todayAssignments).toMatchObject({
      headcount: 2,
      projects: [{ projectId: project, headcount: 2, hasLog: false }],
    });
    expect(kinds(first)).toEqual(['NO_LOG_TODAY']);

    await client.saveLog(project, '2026-10-11', {
      status: 'SAVED',
      content: '오늘 작업',
      entries: [{ employeeId: worker, categoryId: category, minutes: 480 }],
    });

    const second = await client.dashboard();

    expect(second.dashboard.todayAssignments.projects[0]).toMatchObject({ hasLog: true });
    expect(kinds(second)).toEqual([]);
  });

  it('임시 저장 작업 내역은 작업 내역 입력으로 보지 않고 할 일 건수에 센다', async () => {
    const { client, worker, category, make, assign } = await setup();
    const project = await make(client, 'A동 판금');

    await assign(project, worker);
    await client.saveLog(project, '2026-10-11', {
      status: 'DRAFT',
      content: '임시',
      entries: [{ employeeId: worker, categoryId: category, minutes: 480 }],
    });

    const result = await client.dashboard();

    expect(result.dashboard.todos.draftLogCount).toBe(1);
    expect(kinds(result)).toEqual(['NO_LOG_TODAY']);
  });

  it('휴직 직원과 진행 중이 아닌 프로젝트의 투입은 오늘 투입에 넣지 않는다', async () => {
    const { client, worker, worker2, make, assign } = await setup();
    const planned = await make(client, '예정 프로젝트', { start: false });
    const running = await make(client, '진행 프로젝트');

    await assign(planned, worker);
    await assign(running, worker2);
    await client.send('patch', `/employees/${worker2}`, { status: 'ON_LEAVE' });

    expect((await client.dashboard()).dashboard.todayAssignments).toEqual({
      headcount: 0,
      projects: [],
    });
  });

  it('소진율 도달·진행률 대비 과다·종료 예정일 경과 프로젝트를 위험으로 알린다', async () => {
    const { client, worker, worker2, category, make, assign } = await setup();
    const warn = await make(client, '소진 80%');
    const ahead = await make(client, '소진 과다');
    const late = await make(client, '지연', { plannedEnd: '2026-10-05' });
    const log = (project: string, date: string, employee: string) =>
      client.saveLog(project, date, {
        status: 'SAVED',
        content: date,
        entries: [{ employeeId: employee, categoryId: category, minutes: 480 }],
      });

    // 계획 10일: 8일 투입(80%), 7일 투입(70%)+진행률 40%
    await assign(warn, worker, { plannedMinutes: 10 * 480 });
    await assign(ahead, worker2, { plannedMinutes: 10 * 480 });
    await assign(late, worker, { startDate: '2026-09-01', endDate: '2026-10-05' });

    for (let day = 1; day <= 8; day += 1) {
      await log(warn, `2026-09-${String(day).padStart(2, '0')}`, worker);
    }

    for (let day = 1; day <= 7; day += 1) {
      await log(ahead, `2026-09-${String(day).padStart(2, '0')}`, worker2);
    }

    await client.send('post', `/projects/${ahead}/progress`, { percent: 40 });

    const result = await client.dashboard();
    const alerts = result.dashboard.alerts;

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'BURN_REACHED',
          projectId: warn,
          level: 'WARN',
          burnPercent: 80,
        }),
        expect.objectContaining({
          kind: 'BURN_AHEAD',
          projectId: ahead,
          burnPercent: 70,
          progressPercent: 40,
        }),
        expect.objectContaining({ kind: 'PROJECT_OVERDUE', projectId: late, daysLate: 6 }),
      ]),
    );
    expect(result.dashboard.risks.map((item) => item.id).sort()).toEqual(
      [warn, ahead, late].sort(),
    );
    expect(result.dashboard.projectCounts).toEqual({ planned: 0, inProgress: 3, suspended: 0 });
  });

  it('이번 주 같은 날 두 프로젝트에 겹친 직원을 알린다', async () => {
    const { client, worker, make, assign } = await setup();
    const a = await make(client, 'A동');
    const b = await make(client, 'B동');

    await assign(a, worker, { startDate: '2026-10-05', endDate: '2026-10-07' });
    await assign(b, worker, { startDate: '2026-10-06', endDate: '2026-10-08' });

    const result = await client.dashboard();

    expect(result.dashboard.week.conflicts).toEqual([
      { employeeId: worker, name: '김작업', dateCount: 2 },
    ]);
    expect(result.dashboard.alerts).toContainEqual(
      expect.objectContaining({
        kind: 'DOUBLE_ASSIGNED',
        employeeId: worker,
        firstDate: '2026-10-06',
      }),
    );
  });

  it('메모함에서 3일 넘게 방치된 메모와 7일 넘게 협의 중인 변경 작업을 알린다', async () => {
    const { client, make } = await setup();
    const project = await make(client, 'A동');
    const fresh = await client.id('/memos', { content: '방금 쓴 메모' });
    const old = await client.id('/memos', { content: '오래된 메모' });
    const filed = await client.id('/memos', { content: '정리된 오래된 메모', projectId: project });

    await db.ownerPool.query(`UPDATE memos SET created_at = $2 WHERE id = $1`, [
      old,
      '2026-10-06T03:00:00Z',
    ]);
    await db.ownerPool.query(`UPDATE memos SET created_at = $2 WHERE id = $1`, [
      filed,
      '2026-10-01T03:00:00Z',
    ]);
    void fresh;

    await client.send('post', `/projects/${project}/change-works`, {
      requestedOn: '2026-10-03',
      requester: '고객',
      content: '오래 방치',
    });
    await client.send('post', `/projects/${project}/change-works`, {
      requestedOn: '2026-10-09',
      requester: '고객',
      content: '최근',
    });

    const result = await client.dashboard();

    expect(result.dashboard.todos.staleInboxCount).toBe(1);
    expect(result.dashboard.alerts).toEqual(
      expect.arrayContaining([
        { kind: 'INBOX_STALE', count: 1, oldestDays: 5 },
        expect.objectContaining({ kind: 'CHANGE_STALE', projectId: project, seq: 1, days: 8 }),
      ]),
    );
    expect(result.dashboard.alerts.filter((alert) => alert.kind === 'CHANGE_STALE')).toHaveLength(
      1,
    );
  });

  it('회사마다 따로 계산한다', async () => {
    const a = await setup();
    const b = await setup();
    const project = await a.make(a.client, 'A동');

    await a.assign(project, a.worker);

    expect((await a.client.dashboard()).dashboard.projectCounts.inProgress).toBe(1);
    expect((await b.client.dashboard()).dashboard.projectCounts.inProgress).toBe(0);
    expect(kinds(await b.client.dashboard())).toEqual([]);
  });
});

describe('알림 설정', () => {
  it('종류별로 끄면 알림에서만 빠지고 위젯은 그대로이며 다시 켤 수 있다', async () => {
    const { client, worker, make, assign } = await setup();
    const project = await make(client, 'A동');

    await assign(project, worker);

    const on = await client.dashboard();

    expect(kinds(on)).toEqual(['NO_LOG_TODAY']);

    const saved = await client.send('put', '/company/alert-settings', {
      items: [{ kind: 'NO_LOG_TODAY', enabled: false }],
    });

    expect(saved.status).toBe(200);
    expect(
      alertSettingsSchema.parse(saved.body).items.find((item) => item.kind === 'NO_LOG_TODAY'),
    ).toEqual({
      kind: 'NO_LOG_TODAY',
      enabled: false,
    });
    // 보내지 않은 종류는 그대로 켜짐
    expect(alertSettingsSchema.parse(saved.body).items.filter((item) => item.enabled)).toHaveLength(
      11,
    );

    const off = await client.dashboard();

    expect(kinds(off)).toEqual([]);
    expect(off.dashboard.todayAssignments).toEqual(on.dashboard.todayAssignments);

    await client.send('put', '/company/alert-settings', {
      items: [{ kind: 'NO_LOG_TODAY', enabled: true }],
    });
    expect(kinds(await client.dashboard())).toEqual(['NO_LOG_TODAY']);
  });

  it('회사마다 독립이고 잘못된 요청은 거부한다', async () => {
    const a = await setup();
    const b = await setup();

    await a.client.send('put', '/company/alert-settings', {
      items: [{ kind: 'INBOX_STALE', enabled: false }],
    });

    const bSettings = alertSettingsSchema.parse(
      (await b.client.get('/company/alert-settings')).body,
    );

    expect(bSettings.items.every((item) => item.enabled)).toBe(true);

    for (const body of [
      { items: [] },
      { items: [{ kind: 'NOPE', enabled: false }] },
      {
        items: [
          { kind: 'INBOX_STALE', enabled: false },
          { kind: 'INBOX_STALE', enabled: true },
        ],
      },
      {},
    ]) {
      expect({
        body,
        status: (await a.client.send('put', '/company/alert-settings', body)).status,
      }).toEqual({
        body,
        status: 400,
      });
    }
  });

  it('DB에서도 알림 설정은 지울 수 없다', async () => {
    const { client } = await setup();

    await client.send('put', '/company/alert-settings', {
      items: [{ kind: 'INBOX_STALE', enabled: false }],
    });
    await expect(db.app.$executeRawUnsafe('DELETE FROM alert_preferences')).rejects.toThrow();
    await expect(
      db.app.$executeRawUnsafe(`UPDATE alert_preferences SET kind = 'NO_LOG_TODAY'`),
    ).rejects.toThrow();
  });
});

describe('4단계 알림·위젯', () => {
  it('보증 종료 임박·미처리 보수·보증서·직원 서류 만료·월 미확정을 알리고 해결하면 사라진다', async () => {
    const { client, worker, make, assign, category } = await setup();

    // 보증 중 프로젝트: 완료 → 보증 중, 보증 2개월(종료 예정일 2026-11-20)
    const warranty = await make(client, 'A동 판금 공사');

    await client.send('post', `/projects/${warranty}/status`, {
      toStatus: 'COMPLETED',
      effectiveOn: '2026-09-20',
    });
    await client.send('post', `/projects/${warranty}/status`, {
      toStatus: 'WARRANTY',
      effectiveOn: '2026-09-21',
      confirmSummary: true,
    });
    await client.send('put', `/projects/${warranty}/warranty`, {
      months: 2,
      startBasis: 'ACTUAL_END',
      reason: '시험',
    });
    await client.send('post', `/projects/${warranty}/repair-requests`, {
      receivedOn: '2026-10-05',
      requester: '고객',
      content: '누수',
    });

    const fileId = (
      await client.send('post', `/projects/${warranty}/files`, {
        name: '보증증권.pdf',
        contentType: 'application/pdf',
        purpose: 'DOCUMENT',
        size: 1000,
      })
    ).body.file.id as string;
    const documentId = await client.id(`/projects/${warranty}/documents`, {
      fileId,
      title: '보증증권',
      category: 'OTHER',
    });

    await client.send('post', `/projects/${warranty}/warranty/certificates`, {
      documentId,
      expiresOn: '2026-10-25',
    });

    // 직원 서류: 용접 기능사 만료 임박, 같은 종류의 갱신본이 있는 안전교육은 알리지 않는다
    const types = optionsResponseSchema
      .parse((await client.get('/company/options')).body)
      .items.filter((item) => item.kind === 'CREDENTIAL_TYPE');
    const typeId = (name: string) => types.find((item) => item.name === name)!.id;

    await client.send('post', `/employees/${worker}/credentials`, {
      typeId: typeId('용접 기능사'),
      expiresOn: '2026-10-20',
    });
    await client.send('post', `/employees/${worker}/credentials`, {
      typeId: typeId('안전교육 이수증'),
      expiresOn: '2026-10-01',
    });
    await client.send('post', `/employees/${worker}/credentials`, {
      typeId: typeId('안전교육 이수증'),
      expiresOn: '2027-10-01',
    });

    // 지난달(2026-09)에 저장한 작업 내역이 있는데 확정하지 않음
    const running = await make(client, 'B동 덕트 설치');

    await assign(running, worker);
    await client.saveLog(running, '2026-09-15', {
      status: 'SAVED',
      content: '9월 작업',
      entries: [{ employeeId: worker, categoryId: category, minutes: 480 }],
    });

    const result = await client.dashboard();

    expect(new Set(kinds(result))).toEqual(
      new Set([
        'WARRANTY_ENDING',
        'REPAIR_UNHANDLED',
        'CERTIFICATE_EXPIRING',
        'CREDENTIAL_EXPIRING',
        'MONTH_UNCLOSED',
        'NO_LOG_TODAY',
      ]),
    );
    expect(result.dashboard.warranty).toMatchObject({
      ending: [{ projectId: warranty, endOn: '2026-11-20', daysLeft: 40 }],
      openRepairCount: 1,
    });
    expect(result.dashboard.expiring.certificates).toMatchObject([
      { title: '보증증권', expiresOn: '2026-10-25', daysLeft: 14 },
    ]);
    expect(result.dashboard.expiring.credentials).toMatchObject([
      { employeeName: '김작업', typeName: '용접 기능사', daysLeft: 9 },
    ]);
    expect(result.dashboard.todos.unclosedMonth).toBe('2026-09');

    // 월 공수를 확정하면 월 미확정이 사라지고 서류를 지우면 서류 알림도 사라진다
    await client.send('post', '/monthly-hours/close', { month: '2026-09' });

    const after = await client.dashboard();

    expect(kinds(after)).not.toContain('MONTH_UNCLOSED');
    expect(after.dashboard.todos.unclosedMonth).toBeNull();

    // 알림을 끄면 알림에서만 빠지고 위젯은 그대로
    await client.send('put', '/company/alert-settings', {
      items: [
        { kind: 'WARRANTY_ENDING', enabled: false },
        { kind: 'CREDENTIAL_EXPIRING', enabled: false },
      ],
    });

    const off = await client.dashboard();

    expect(kinds(off)).not.toContain('WARRANTY_ENDING');
    expect(kinds(off)).not.toContain('CREDENTIAL_EXPIRING');
    expect(off.dashboard.warranty.ending).toHaveLength(1);
    expect(off.dashboard.expiring.credentials).toHaveLength(1);
  });

  it('퇴사한 직원의 서류는 알리지 않는다', async () => {
    const { client, worker2 } = await setup();
    const types = optionsResponseSchema
      .parse((await client.get('/company/options')).body)
      .items.filter((item) => item.kind === 'CREDENTIAL_TYPE');
    await client.send('post', `/employees/${worker2}/credentials`, {
      typeId: types[0]!.id,
      expiresOn: '2026-10-12',
    });

    expect(kinds(await client.dashboard())).toEqual(['CREDENTIAL_EXPIRING']);

    await client.send('patch', `/employees/${worker2}`, { status: 'LEFT' });

    expect(kinds(await client.dashboard())).toEqual([]);
  });
});
