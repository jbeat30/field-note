import {
  laborCostSchema,
  optionsResponseSchema,
  payRateSchema,
  payRateSummariesResponseSchema,
  payRatesResponseSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { createCompanySettingsService } from '../company/companySettingsService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createEmployeeService } from '../employee/employeeService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createLaborService } from '../labor/laborService';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
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
    companySettings: createCompanySettingsService(db.app),
    employees: createEmployeeService(db.app, () => NOW),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => NOW),
    assignments: createAssignmentService(db.app),
    workLogs: createWorkLogService(db.app, () => NOW),
    labor: createLaborService(db.app, () => NOW),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `인건비회사${sequence}`,
    adminName: '인건비관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `labor-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `labor${sequence}@example.com`,
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
    addRate: (employeeId: string, body: object) =>
      send('post', `/employees/${employeeId}/pay-rates`, body),
    rates: (employeeId: string) => get(`/employees/${employeeId}/pay-rates`),
    cost: (projectId: string) => get(`/projects/${projectId}/labor-cost`),
    saveLog: (projectId: string, date: string, body: object) =>
      send('put', `/projects/${projectId}/work-logs/${date}`, body),
    saveSettings: (body: object) => send('put', '/company/settings', body),
  };
};

// 진행 중 프로젝트(2026-09-01 ~ 2026-12-31)와 직원 두 명(김작업·이작업)
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
  const project = await client.id('/projects', {
    name: 'A동 판금 공사',
    siteName: 'A동 현장',
    clientId,
    managerId,
    contractDate: '2026-08-01',
    plannedStart: '2026-09-01',
    plannedEnd: '2026-12-31',
  });

  await client.id(`/projects/${project}/status`, {
    toStatus: 'IN_PROGRESS',
    effectiveOn: '2026-09-01',
  });

  // 작업 내역은 투입된 직원만 넣을 수 있다 (김작업은 계획 공수 10일)
  await client.id(`/projects/${project}/assignments`, {
    employeeId: worker,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    plannedMinutes: 10 * 480,
  });
  await client.id(`/projects/${project}/assignments`, {
    employeeId: worker2,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
  });

  const log = (date: string, employeeId: string, minutes: number, extra?: [string, number]) =>
    client.saveLog(project, date, {
      status: 'SAVED',
      content: `작업 ${date}`,
      entries: [
        { employeeId, categoryId: category, minutes },
        ...(extra ? [{ employeeId: extra[0], categoryId: category, minutes: extra[1] }] : []),
      ],
    });

  return { instance, client, project, worker, worker2, category, log };
};

describe('직원 단가표', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const { instance, worker, project } = await setup();

    expect((await request(instance).get(`/api/v1/employees/${worker}/pay-rates`)).status).toBe(401);
    expect((await request(instance).get(`/api/v1/projects/${project}/labor-cost`)).status).toBe(
      401,
    );
    expect(
      (
        await request(instance)
          .post(`/api/v1/employees/${worker}/pay-rates`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ payType: 'DAILY', amount: 200_000, effectiveFrom: '2026-10-01' })
      ).status,
    ).toBe(401);
  });

  it('단가를 추가하면 적용 시작일이 최근인 것이 맨 앞이고 기존 단가는 그대로 남는다', async () => {
    const { client, worker } = await setup();
    const first = await client.addRate(worker, {
      payType: 'DAILY',
      amount: 200_000,
      effectiveFrom: '2026-01-01',
    });

    expect(first.status).toBe(201);
    expect(payRateSchema.parse(first.body)).toMatchObject({
      payType: 'DAILY',
      amount: 200_000,
      effectiveFrom: '2026-01-01',
    });

    await client.addRate(worker, {
      payType: 'MONTHLY',
      amount: 4_400_000,
      effectiveFrom: '2026-10-11',
    });
    await client.addRate(worker, {
      payType: 'HOURLY',
      amount: 15_000,
      effectiveFrom: '2026-06-01',
    });

    const items = payRatesResponseSchema.parse((await client.rates(worker)).body).items;

    expect(items.map((item) => [item.effectiveFrom, item.payType, item.amount])).toEqual([
      ['2026-10-11', 'MONTHLY', 4_400_000],
      ['2026-06-01', 'HOURLY', 15_000],
      ['2026-01-01', 'DAILY', 200_000],
    ]);
  });

  it('종류·금액·날짜를 검사한다', async () => {
    const { client, worker } = await setup();
    const ok = { payType: 'DAILY', amount: 200_000, effectiveFrom: '2026-10-01' };

    for (const body of [
      { ...ok, payType: 'WEEKLY' },
      { ...ok, amount: 0 },
      { ...ok, amount: -1 },
      { ...ok, amount: 1.5 },
      { ...ok, amount: 1_000_000_001 },
      { ...ok, effectiveFrom: '2026-13-01' },
      { payType: 'DAILY' },
    ]) {
      expect({ body, status: (await client.addRate(worker, body)).status }).toEqual({
        body,
        status: 400,
      });
    }

    // 너무 먼 과거·미래는 입력 실수로 거부
    expect((await client.addRate(worker, { ...ok, effectiveFrom: '1999-12-31' })).status).toBe(400);
    expect((await client.addRate(worker, { ...ok, effectiveFrom: '2028-01-01' })).status).toBe(400);
    expect(payRatesResponseSchema.parse((await client.rates(worker)).body).items).toEqual([]);
  });

  it('단가표는 단가가 있는 직원마다 현재·이전·적용 예정 단가를 준다', async () => {
    const { client, worker, worker2 } = await setup();

    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 180_000,
      effectiveFrom: '2026-01-01',
    });
    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 200_000,
      effectiveFrom: '2026-06-01',
    });
    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 230_000,
      effectiveFrom: '2026-12-01',
    });

    const { items } = payRateSummariesResponseSchema.parse((await client.get('/pay-rates')).body);

    // 단가가 없는 직원은 제외
    expect(items.map((item) => item.employeeId)).toEqual([worker]);
    expect(items[0]).toMatchObject({
      current: { amount: 200_000 },
      previous: { amount: 180_000 },
      upcoming: { amount: 230_000 },
    });
    expect(items.some((item) => item.employeeId === worker2)).toBe(false);
  });

  it('없는 직원은 404다', async () => {
    const { client } = await setup();
    const missing = '0198d000-0000-7000-8000-00000000dead';

    expect((await client.rates(missing)).status).toBe(404);
    expect(
      (await client.addRate(missing, { payType: 'DAILY', amount: 1, effectiveFrom: '2026-10-01' }))
        .status,
    ).toBe(404);
  });

  it('단가 변경만 감사 기록으로 남고(금액은 복사하지 않음) 단가·인건비 조회는 남기지 않는다', async () => {
    const { client, worker, project } = await setup();

    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 777_000,
      effectiveFrom: '2026-10-01',
    });
    await client.rates(worker);
    await client.cost(project);

    const { rows } = await db.ownerPool.query<{
      action: string;
      target_id: string;
      detail: unknown;
    }>(
      `SELECT action, target_id, detail FROM audit_logs
        WHERE action IN ('PAY_RATE_VIEWED', 'PAY_RATE_CHANGED', 'LABOR_COST_VIEWED')
          AND target_id IN ($1, $2) ORDER BY created_at, id`,
      [worker, project],
    );

    // 볼 권한이 있는 관리자만 쓰는 서비스라 조회 기록은 의미가 없어 남기지 않는다 (09 문서 결정 ④)
    expect(rows.map((row) => [row.action, row.target_id])).toEqual([['PAY_RATE_CHANGED', worker]]);
    expect(JSON.stringify(rows[0]!.detail)).not.toContain('777000');
    expect(rows[0]!.detail).toEqual({ payType: 'DAILY', effectiveFrom: '2026-10-01' });
  });

  it('단가 기록은 DB에서도 수정·삭제할 수 없고 금액 범위를 어기면 거부한다', async () => {
    const { client, worker } = await setup();
    const id = payRateSchema.parse(
      (
        await client.addRate(worker, {
          payType: 'DAILY',
          amount: 200_000,
          effectiveFrom: '2026-10-01',
        })
      ).body,
    ).id;

    await expect(db.app.$executeRawUnsafe('DELETE FROM employee_pay_rates')).rejects.toThrow();
    await expect(
      db.app.$executeRawUnsafe(`UPDATE employee_pay_rates SET amount = 1 WHERE id = '${id}'`),
    ).rejects.toThrow();
    await expect(
      db.ownerPool.query(`UPDATE employee_pay_rates SET amount = 0 WHERE id = $1`, [id]),
    ).rejects.toThrow(/employee_pay_rates_amount_range/);
  });
});

describe('프로젝트 인건비 (최소 추정)', () => {
  it('작업 내역도 단가도 없으면 모두 0이다', async () => {
    const { client, project } = await setup();
    const cost = laborCostSchema.parse((await client.cost(project)).body);

    expect(cost.actual).toEqual({
      totalAmount: 0,
      totalMinutes: 0,
      unpricedMinutes: 0,
      employees: [],
    });
    expect(cost.planned.totalAmount).toBe(0);
  });

  it('단가가 중간에 바뀌면 바뀐 날부터 새 단가로 계산한다 (10/10 일급 20만원 + 10/11 일급 25만원 = 45만원)', async () => {
    const { client, project, worker, log } = await setup();

    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 200_000,
      effectiveFrom: '2026-01-01',
    });
    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 250_000,
      effectiveFrom: '2026-10-11',
    });
    await log('2026-10-10', worker, 480);
    await log('2026-10-11', worker, 480);

    const cost = laborCostSchema.parse((await client.cost(project)).body);

    expect(cost.actual).toMatchObject({
      totalAmount: 450_000,
      totalMinutes: 960,
      unpricedMinutes: 0,
    });
    expect(cost.actual.employees).toEqual([
      { employeeId: worker, minutes: 960, unpricedMinutes: 0, amount: 450_000 },
    ]);
  });

  it('늦게 알게 된 인상은 과거 적용 시작일로 입력하면 그날부터 다시 계산된다', async () => {
    const { client, project, worker, log } = await setup();

    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 200_000,
      effectiveFrom: '2026-01-01',
    });
    await log('2026-10-05', worker, 480);
    expect(laborCostSchema.parse((await client.cost(project)).body).actual.totalAmount).toBe(
      200_000,
    );

    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 220_000,
      effectiveFrom: '2026-10-01',
    });
    expect(laborCostSchema.parse((await client.cost(project)).body).actual.totalAmount).toBe(
      220_000,
    );
  });

  it('일급·시급·월급·연봉제를 직원별로 환산해 합산하고 금액 큰 순으로 돌려준다', async () => {
    const { client, project, worker, worker2, log } = await setup();

    // 월급 520만원 → 26일·8시간 기준 일 20만원, 시급 15,000원 × 4시간 = 6만원
    await client.addRate(worker, {
      payType: 'MONTHLY',
      amount: 5_200_000,
      effectiveFrom: '2026-01-01',
    });
    await client.addRate(worker2, {
      payType: 'HOURLY',
      amount: 15_000,
      effectiveFrom: '2026-01-01',
    });
    await log('2026-10-05', worker, 480);
    await log('2026-10-06', worker2, 240);

    const cost = laborCostSchema.parse((await client.cost(project)).body);

    expect(cost.actual.employees.map((row) => [row.employeeId, row.amount])).toEqual([
      [worker, 200_000],
      [worker2, 60_000],
    ]);
    expect(cost.actual.totalAmount).toBe(260_000);
  });

  it('회사 설정의 하루 기준시간·월 기준일수를 따른다', async () => {
    const { client, project, worker, log } = await setup();

    await client.saveSettings({
      standardWorkMinutes: 600,
      monthlyWorkDays: 26,
      workUnitMode: 'RATIO',
    });
    await client.addRate(worker, {
      payType: 'MONTHLY',
      amount: 2_600_000,
      effectiveFrom: '2026-01-01',
    });
    await log('2026-10-05', worker, 600);

    // 월급 260만원 ÷ 26일 = 하루 10만원, 하루 기준 600분이므로 600분 = 10만원
    expect(laborCostSchema.parse((await client.cost(project)).body).actual.totalAmount).toBe(
      100_000,
    );
  });

  it('단가가 없는 직원의 공수는 합계에서 빠지고 따로 표시한다 (최소 추정)', async () => {
    const { client, project, worker, worker2, log } = await setup();

    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 200_000,
      effectiveFrom: '2026-10-06',
    });
    await log('2026-10-05', worker, 480);
    await log('2026-10-06', worker, 480, [worker2, 240]);

    const cost = laborCostSchema.parse((await client.cost(project)).body);

    expect(cost.actual).toMatchObject({
      totalAmount: 200_000,
      totalMinutes: 480,
      unpricedMinutes: 720,
    });
    expect(cost.actual.employees.find((row) => row.employeeId === worker2)).toMatchObject({
      amount: 0,
      unpricedMinutes: 240,
    });
  });

  it('임시 저장 작업 내역은 인건비에 넣지 않는다', async () => {
    const { client, project, worker, category } = await setup();

    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 200_000,
      effectiveFrom: '2026-01-01',
    });
    await client.saveLog(project, '2026-10-05', {
      status: 'DRAFT',
      content: '임시',
      entries: [{ employeeId: worker, categoryId: category, minutes: 480 }],
    });

    expect(laborCostSchema.parse((await client.cost(project)).body).actual.totalAmount).toBe(0);
  });

  it('계획 공수 기준 예상 인건비는 투입의 계획 공수에 오늘 단가를 곱한다', async () => {
    const { client, project, worker } = await setup();

    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 200_000,
      effectiveFrom: '2026-01-01',
    });
    await client.addRate(worker, {
      payType: 'DAILY',
      amount: 250_000,
      effectiveFrom: '2026-10-11',
    });
    const cost = laborCostSchema.parse((await client.cost(project)).body);

    // 오늘(10/11)의 단가 25만원 × 10일
    expect(cost.planned).toMatchObject({ totalAmount: 2_500_000, totalMinutes: 4800 });
    expect(cost.actual.totalAmount).toBe(0);
  });

  it('없는 프로젝트는 404다', async () => {
    const { client } = await setup();

    expect((await client.cost('0198d000-0000-7000-8000-00000000dead')).status).toBe(404);
  });
});
