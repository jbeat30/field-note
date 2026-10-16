import { errorResponseSchema, monthlyHoursSchema, optionsResponseSchema } from '@field-note/shared';
import ExcelJS from 'exceljs';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { createMonthlyService } from '../monthly/monthlyService';
import { createCompanySettingsService } from '../company/companySettingsService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createDocumentService } from '../document/documentService';
import { createEmployeeService } from '../employee/employeeService';
import { createFileService } from '../file/fileService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createMaterialService } from '../material/materialService';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createProjectService } from '../project/projectService';
import { createMemoryQueue } from '../queue/jobQueue';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';
import { createMemoryStorage } from '../storage/objectStorage';
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
    files: createFileService({
      app: db.app,
      storage: createMemoryStorage().storage,
      queue: createMemoryQueue().queue,
      now: () => NOW,
    }),
    materials: createMaterialService(db.app, () => NOW),
    documents: createDocumentService(db.app, createMemoryStorage().storage, () => NOW),
    monthly: createMonthlyService(db.app, () => NOW),
    companySettings: createCompanySettingsService(db.app),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `월공수회사${sequence}`,
    adminName: '월공수관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `mh-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `mh${sequence}@example.com`,
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
    id: async (path: string, body: object) => (await send('post', path, body)).body.id as string,
    month: (month: string) => get(`/monthly-hours?month=${month}`),
    close: (body: object) => send('post', '/monthly-hours/close', body),
    reopen: (body: object) => send('post', '/monthly-hours/reopen', body),
    settings: (body: object) => send('put', '/company/settings', body),
    download: (month: string) =>
      get(`/monthly-hours.xlsx?month=${month}`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];

          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        }),
    saveLog: (projectId: string, date: string, body: object) =>
      send('put', `/projects/${projectId}/work-logs/${date}`, body),
    projectStatus: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/status`, body),
  };
};

const setup = async () => {
  const instance = app();
  const cookie = await signedUp(instance);
  const client = api(instance, cookie);
  const clientId = await client.id('/partners', { kind: 'CLIENT', name: '가나다건설' });
  const managerId = await client.id('/employees', { name: '박소장' });
  const kim = await client.id('/employees', { name: '김작업' });
  const lee = await client.id('/employees', { name: '이설치' });
  const category = optionsResponseSchema
    .parse((await client.get('/company/options')).body)
    .items.find((item) => item.kind === 'WORK_CATEGORY')!.id;
  const create = async (name: string) => {
    const project = await client.id('/projects', {
      name,
      siteName: `${name} 현장`,
      clientId,
      managerId,
      contractDate: '2026-08-01',
      plannedStart: '2026-09-01',
      plannedEnd: '2026-12-31',
    });

    await client.projectStatus(project, { toStatus: 'IN_PROGRESS', effectiveOn: '2026-09-01' });

    for (const employeeId of [kim, lee]) {
      await client.id(`/projects/${project}/assignments`, {
        employeeId,
        startDate: '2026-09-01',
        endDate: '2026-12-31',
      });
    }

    return project;
  };
  const a = await create('A동');
  const b = await create('B동');
  const log = (project: string, date: string, entries: [string, number][], status = 'SAVED') =>
    client.saveLog(project, date, {
      status,
      content: `${date} 작업 내역`,
      entries: entries.map(([employeeId, minutes]) => ({
        employeeId,
        categoryId: category,
        minutes,
      })),
    });

  return { instance, client, a, b, kim, lee, category, log };
};

const errorPath = (body: unknown) => errorResponseSchema.parse(body).error.details?.[0]?.path;

const hours = (res: { body: unknown }) => monthlyHoursSchema.parse(res.body);

describe('월 공수표', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const { instance } = await setup();

    expect((await request(instance).get('/api/v1/monthly-hours?month=2026-09')).status).toBe(401);
    expect(
      (
        await request(instance)
          .post('/api/v1/monthly-hours/close')
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ month: '2026-09' })
      ).status,
    ).toBe(401);
  });

  it('프로젝트 × 직원별로 저장된 작업 내역 공수만 합산하고 다른 달·임시 저장은 뺀다', async () => {
    const { client, a, b, kim, lee, log } = await setup();

    await log(a, '2026-09-10', [
      [kim, 480],
      [lee, 240],
    ]);
    await log(a, '2026-09-11', [[kim, 480]]);
    await log(b, '2026-09-10', [[kim, 120]]);
    // 임시 저장과 다른 달은 합산 제외
    await log(a, '2026-09-12', [[lee, 999]], 'DRAFT');
    await log(a, '2026-10-02', [[kim, 480]]);

    const data = hours(await client.month('2026-09'));

    expect(data).toMatchObject({
      month: '2026-09',
      isClosed: false,
      closedAt: null,
      standardWorkMinutes: 480,
      monthlyWorkDays: 26,
      draftLogCount: 1,
      events: [],
    });
    expect(data.rows.map((row) => `${row.projectName}:${row.employeeName}:${row.minutes}`)).toEqual(
      ['A동:김작업:960', 'A동:이설치:240', 'B동:김작업:120'],
    );
    expect(data.drafts).toEqual([
      expect.objectContaining({ projectName: 'A동', workDate: '2026-09-12' }),
    ]);
    // 비어 있는 달
    expect(hours(await client.month('2026-08'))).toMatchObject({ rows: [], draftLogCount: 0 });
  });

  it('월 형식이 아니면 400이다', async () => {
    const { client } = await setup();

    for (const month of ['2026-13', '2026-9', 'abc']) {
      expect((await client.month(month)).status).toBe(400);
    }
  });
});

describe('월 공수 확정·재오픈', () => {
  it('임시 저장 작업 내역이 있으면 확인해야 확정하고 확정하면 이력과 확정 당시 기준값이 남는다', async () => {
    const { client, a, kim, log } = await setup();

    await log(a, '2026-09-10', [[kim, 480]]);
    await log(a, '2026-09-12', [[kim, 120]], 'DRAFT');

    const blocked = await client.close({ month: '2026-09' });

    expect(blocked.status).toBe(400);
    expect(errorPath(blocked.body)).toBe('body.confirmDrafts');

    const closed = hours(await client.close({ month: '2026-09', confirmDrafts: true }));

    expect(closed).toMatchObject({ isClosed: true, standardWorkMinutes: 480, monthlyWorkDays: 26 });
    expect(closed.closedAt).not.toBeNull();
    expect(closed.events).toEqual([
      expect.objectContaining({ kind: 'CLOSED', reason: null, draftLogCount: 1 }),
    ]);
  });

  it('이미 확정한 달·오지 않은 달은 확정할 수 없다', async () => {
    const { client } = await setup();

    expect((await client.close({ month: '2026-09' })).status).toBe(200);

    const again = await client.close({ month: '2026-09' });

    expect(again.status).toBe(400);
    expect(errorPath(again.body)).toBe('body.month');
    expect((await client.close({ month: '2026-11' })).status).toBe(400);
    // 이번 달은 확정 가능
    expect((await client.close({ month: '2026-10' })).status).toBe(200);
  });

  it('확정된 달의 작업 내역은 저장할 수 없고 다른 달은 저장할 수 있다', async () => {
    const { client, a, kim, log } = await setup();

    await log(a, '2026-09-10', [[kim, 480]]);
    await client.close({ month: '2026-09' });

    const blocked = await log(a, '2026-09-10', [[kim, 240]]);

    expect(blocked.status).toBe(400);
    expect(errorPath(blocked.body)).toBe('body.workDate');
    // 새 일자·임시 저장도 차단
    expect((await log(a, '2026-09-15', [[kim, 60]])).status).toBe(400);
    expect((await log(a, '2026-09-15', [[kim, 60]], 'DRAFT')).status).toBe(400);
    expect((await log(a, '2026-10-05', [[kim, 60]])).status).toBe(200);
  });

  it('확정 뒤 회사 기준시간을 바꿔도 확정된 달의 환산 기준은 그대로이다', async () => {
    const { client, a, kim, log } = await setup();

    await log(a, '2026-09-10', [[kim, 480]]);
    await client.close({ month: '2026-09' });
    expect(
      (
        await client.settings({
          standardWorkMinutes: 420,
          monthlyWorkDays: 20,
          workUnitMode: 'RATIO',
        })
      ).status,
    ).toBe(200);

    expect(hours(await client.month('2026-09'))).toMatchObject({
      isClosed: true,
      standardWorkMinutes: 480,
      monthlyWorkDays: 26,
    });
    // 확정하지 않은 달은 현재 설정 기준
    expect(hours(await client.month('2026-10'))).toMatchObject({
      isClosed: false,
      standardWorkMinutes: 420,
      monthlyWorkDays: 20,
    });
  });

  it('재오픈은 사유가 필수이고 재오픈하면 다시 고칠 수 있으며 이력이 남는다', async () => {
    const { client, a, kim, category, log } = await setup();

    await log(a, '2026-09-10', [[kim, 480]]);

    // 확정하지 않은 달은 재오픈 불가
    expect((await client.reopen({ month: '2026-09', reason: '정정' })).status).toBe(400);

    await client.close({ month: '2026-09' });

    expect((await client.reopen({ month: '2026-09' })).status).toBe(400);
    expect((await client.reopen({ month: '2026-09', reason: '  ' })).status).toBe(400);

    const reopened = hours(await client.reopen({ month: '2026-09', reason: ' 공수 정정 ' }));

    expect(reopened).toMatchObject({ isClosed: false, closedAt: null });
    expect(reopened.events.map((event) => `${event.kind}:${event.reason}`)).toEqual([
      'REOPENED:공수 정정',
      'CLOSED:null',
    ]);
    // 이미 저장된 작업 내역은 버전을 알려 주어야 고칠 수 있음 (낙관적 잠금)
    expect(
      (
        await client.saveLog(a, '2026-09-10', {
          status: 'SAVED',
          content: '정정',
          expectedVersion: 1,
          entries: [{ employeeId: kim, categoryId: category, minutes: 240 }],
        })
      ).status,
    ).toBe(200);

    // 다시 확정하면 정정한 값으로 집계
    const again = hours(await client.close({ month: '2026-09' }));

    expect(again.rows[0]).toMatchObject({ minutes: 240 });
    expect(again.events).toHaveLength(3);
  });
});

describe('월 공수표 엑셀 내보내기', () => {
  it('한글 시트에 프로젝트·직원별 MD·MM이 담기고 내보낸 기록이 남는다', async () => {
    const { client, a, kim, lee, log } = await setup();

    await log(a, '2026-09-10', [
      [kim, 480],
      [lee, 240],
    ]);
    await client.close({ month: '2026-09' });

    const res = await client.download('2026-09');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(
      decodeURIComponent(String(res.headers['content-disposition']).split("UTF-8''")[1]!),
    ).toBe('월공수표_2026-09.xlsx');

    const book = new ExcelJS.Workbook();

    await book.xlsx.load(res.body as never);

    const rowsOf = (name: string) =>
      book
        .getWorksheet(name)!
        .getSheetValues()
        .slice(1)
        .map((row) => (row as unknown[]).slice(1));

    expect(book.worksheets.map((sheet) => sheet.name)).toEqual([
      '요약',
      '월 공수표',
      '직원별 합계',
      '프로젝트별 합계',
    ]);
    expect(rowsOf('월 공수표')).toEqual([
      ['프로젝트 코드', '프로젝트', '직원', '공수(MD)', 'MM'],
      [expect.stringMatching(/^\d{4}-\d{3}$/), 'A동', '김작업', 1, 0.038],
      [expect.stringMatching(/^\d{4}-\d{3}$/), 'A동', '이설치', 0.5, 0.019],
    ]);
    expect(rowsOf('요약')).toContainEqual(['확정 상태', '확정']);
    expect(rowsOf('직원별 합계')[1]).toEqual(['김작업', 1, 0.038]);

    const { rows } = await db.ownerPool.query(
      `SELECT detail FROM audit_logs WHERE action = 'REPORT_EXPORTED' AND detail->>'kind' = 'MONTHLY_HOURS_XLSX'`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].detail).toMatchObject({ month: '2026-09', rows: 2, isClosed: true });
  });

  it('로그인하지 않으면 내려받을 수 없다', async () => {
    const { instance } = await setup();

    expect((await request(instance).get('/api/v1/monthly-hours.xlsx?month=2026-09')).status).toBe(
      401,
    );
  });
});
