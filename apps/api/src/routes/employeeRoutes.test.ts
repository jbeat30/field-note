import {
  EMPLOYEE_MAX_PER_COMPANY,
  employeeDetailSchema,
  employeesResponseSchema,
  errorResponseSchema,
  optionsResponseSchema,
  todayInSeoul,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createEmployeeService } from '../employee/employeeService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(180_000);

// 오늘을 고정해 퇴사일 자동 입력과 생년월일 검사를 확인 (서울 기준 2026-10-07)
const NOW = new Date('2026-10-07T03:00:00Z');
const TODAY = todayInSeoul(NOW);

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
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `직원회사${sequence}`,
    adminName: '직원관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `employee-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `employee${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const api = (instance: ReturnType<typeof app>, cookie: string) => {
  const write = (method: 'post' | 'patch', path: string, body: object) =>
    (method === 'post'
      ? request(instance).post(`/api/v1${path}`)
      : request(instance).patch(`/api/v1${path}`)
    )
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body);

  return {
    options: async () =>
      optionsResponseSchema.parse(
        (await request(instance).get('/api/v1/company/options').set('Cookie', cookie)).body,
      ).items,
    list: (query = '') => request(instance).get(`/api/v1/employees${query}`).set('Cookie', cookie),
    get: (id: string) => request(instance).get(`/api/v1/employees/${id}`).set('Cookie', cookie),
    create: (body: object) => write('post', '/employees', body),
    update: (id: string, body: object) => write('patch', `/employees/${id}`, body),
    hideOption: (id: string) => write('patch', `/company/options/${id}`, { isActive: false }),
  };
};

const optionId = async (client: ReturnType<typeof api>, kind: string, name: string) =>
  (await client.options()).find((item) => item.kind === kind && item.name === name)!.id;

describe('직원 등록·조회', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const instance = app();

    expect((await request(instance).get('/api/v1/employees')).status).toBe(401);
    expect(
      (
        await request(instance)
          .post('/api/v1/employees')
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ name: '김일용' })
      ).status,
    ).toBe(401);
  });

  it('이름만으로 등록할 수 있다 (재직 상태, 나머지는 비어 있음)', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const res = await client.create({ name: '  김일용 ' });

    expect(res.status).toBe(201);
    expect(employeeDetailSchema.parse(res.body)).toMatchObject({
      name: '김일용',
      status: 'ACTIVE',
      jobTypeId: null,
      workerTypeId: null,
      title: null,
      hiredOn: null,
      leftOn: null,
      birthDate: null,
      phone: null,
      memo: null,
    });
  });

  it('이름과 직종, 모든 항목을 넣어 등록하고 카드로 다시 읽는다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const jobTypeId = await optionId(client, 'JOB_TYPE', '용접공');
    const workerTypeId = await optionId(client, 'WORKER_TYPE', '정직원');
    const created = await client.create({
      name: '박용접',
      jobTypeId,
      workerTypeId,
      title: '반장',
      hiredOn: '2024-03-01',
      birthDate: '1985-05-20',
      phone: '010-1234-5678',
      memo: '용접 잘함',
    });

    expect(created.status).toBe(201);

    const card = employeeDetailSchema.parse((await client.get(created.body.id)).body);

    expect(card).toMatchObject({
      name: '박용접',
      jobTypeId,
      workerTypeId,
      title: '반장',
      hiredOn: '2024-03-01',
      birthDate: '1985-05-20',
      phone: '010-1234-5678',
      memo: '용접 잘함',
    });
  });

  it('목록에는 생년월일·연락처·메모가 내려가지 않고 카드에만 있다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    await client.create({
      name: '이개인',
      birthDate: '1990-01-01',
      phone: '010-0000-0000',
      memo: '비공개',
    });

    const res = await client.list();
    const text = JSON.stringify(res.body);

    expect(employeesResponseSchema.parse(res.body).items).toHaveLength(1);
    expect(text).not.toContain('1990-01-01');
    expect(text).not.toContain('010-0000-0000');
    expect(text).not.toContain('비공개');
    expect(Object.keys(res.body.items[0])).not.toEqual(
      expect.arrayContaining(['birthDate', 'phone', 'memo']),
    );
  });

  it('재직 → 휴직 → 퇴사 순, 같은 상태에서는 이름순으로 정렬한다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const left = await client.create({ name: '가퇴사' });
    const leave = await client.create({ name: '나휴직', status: 'ON_LEAVE' });

    await client.create({ name: '다재직' });
    await client.create({ name: '가재직' });
    await client.update(left.body.id, { status: 'LEFT' });

    expect(leave.status).toBe(201);
    expect(
      employeesResponseSchema.parse((await client.list()).body).items.map((item) => item.name),
    ).toEqual(['가재직', '다재직', '나휴직', '가퇴사']);
  });

  it('상태·직종·구분·이름으로 거른다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const weld = await optionId(client, 'JOB_TYPE', '용접공');
    const carpenter = await optionId(client, 'JOB_TYPE', '목수');
    const daily = await optionId(client, 'WORKER_TYPE', '일용');

    await client.create({ name: '김용접', jobTypeId: weld });
    await client.create({ name: '이목수', jobTypeId: carpenter, workerTypeId: daily });

    const left = await client.create({ name: '박퇴사', jobTypeId: weld });

    await client.update(left.body.id, { status: 'LEFT' });

    const names = async (query: string) =>
      employeesResponseSchema.parse((await client.list(query)).body).items.map((item) => item.name);

    expect(await names(`?jobTypeId=${weld}`)).toEqual(['김용접', '박퇴사']);
    expect(await names(`?jobTypeId=${weld}&status=ACTIVE`)).toEqual(['김용접']);
    expect(await names(`?workerTypeId=${daily}`)).toEqual(['이목수']);
    expect(await names('?status=LEFT')).toEqual(['박퇴사']);
    expect(await names(`?q=${encodeURIComponent('목')}`)).toEqual(['이목수']);
    expect((await client.list('?status=NOPE')).status).toBe(400);
    expect((await client.list('?jobTypeId=not-a-uuid')).status).toBe(400);
  });
});

describe('입력 검증', () => {
  it('빈 이름·너무 긴 값·형식이 틀린 값은 거부한다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    for (const body of [
      { name: '   ' },
      { name: '가'.repeat(51) },
      { name: '김', title: '가'.repeat(31) },
      { name: '김', phone: 'abc-def' },
      { name: '김', phone: '1'.repeat(31) },
      { name: '김', birthDate: '1985-13-40' },
      { name: '김', birthDate: '1850-01-01' },
      { name: '김', memo: 'a'.repeat(1001) },
      { name: '김', status: 'LEFT' },
      { name: '김', jobTypeId: 'not-a-uuid' },
    ]) {
      expect((await client.create(body)).status).toBe(400);
    }
  });

  it('생년월일이 미래이면 거부한다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const res = await client.create({ name: '김미래', birthDate: '2026-10-08' });

    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).error.details?.[0]?.path).toBe('body.birthDate');
    expect((await client.create({ name: '김오늘', birthDate: TODAY })).status).toBe(201);
  });

  it('직종 자리에 다른 종류 항목을 넣거나 없는 항목, 숨긴 항목을 고르면 거부한다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const work = await optionId(client, 'WORK_CATEGORY', '운반');
    const worker = await optionId(client, 'WORKER_TYPE', '정직원');
    const hidden = await optionId(client, 'JOB_TYPE', '사무');

    await client.hideOption(hidden);

    for (const body of [
      { name: '김', jobTypeId: work },
      { name: '김', jobTypeId: worker },
      { name: '김', workerTypeId: work },
      { name: '김', jobTypeId: '0198d000-0000-7000-8000-000000000999' },
      { name: '김', jobTypeId: hidden },
    ]) {
      const res = await client.create(body);

      expect(res.status).toBe(400);
      expect(errorResponseSchema.parse(res.body).error.details?.[0]?.path).toMatch(
        /jobTypeId|workerTypeId/,
      );
    }
  });

  it('이미 숨긴 직종을 쓰는 직원은 그대로 두고 다른 항목만 수정할 수 있다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const office = await optionId(client, 'JOB_TYPE', '사무');
    const created = await client.create({ name: '정사무', jobTypeId: office });

    await client.hideOption(office);

    const res = await client.update(created.body.id, { title: '과장' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ jobTypeId: office, title: '과장' });
  });

  it('회사당 500명까지만 등록할 수 있다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    await client.create({ name: '한도표식' });

    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      `SELECT company_id FROM employees WHERE name = '한도표식'`,
    );

    await db.ownerPool.query(
      `INSERT INTO employees (company_id, name) SELECT $1, '일괄' || g FROM generate_series(1, $2) g`,
      [rows[0]!.company_id, EMPLOYEE_MAX_PER_COMPANY - 1],
    );

    const res = await client.create({ name: '501번째' });

    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).error.details?.[0]?.message).toContain('500명');
  });
});

describe('수정·퇴사·재입사', () => {
  it('보낸 항목만 바꾸고 null로 항목을 비운다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const created = await client.create({
      name: '김수정',
      title: '조공',
      phone: '010-1111-2222',
      memo: '메모',
    });
    const id = created.body.id;

    const renamed = await client.update(id, { name: '김고침' });

    expect(renamed.body).toMatchObject({ name: '김고침', title: '조공', phone: '010-1111-2222' });

    const cleared = await client.update(id, { title: null, phone: null, memo: '' });

    expect(cleared.body).toMatchObject({ name: '김고침', title: null, phone: null, memo: null });
    expect((await client.update(id, {})).status).toBe(400);
    expect((await client.update(id, { name: '   ' })).status).toBe(400);
  });

  it('퇴사로 바꾸면 퇴사일이 오늘(서울)로 채워지고 과거 정보는 그대로다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const created = await client.create({ name: '김퇴사', hiredOn: '2024-01-01', title: '기공' });
    const res = await client.update(created.body.id, { status: 'LEFT' });

    expect(res.body).toMatchObject({
      status: 'LEFT',
      leftOn: TODAY,
      hiredOn: '2024-01-01',
      title: '기공',
    });
  });

  it('퇴사일을 직접 정하고 나중에 고칠 수 있으며 지울 수는 없다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const created = await client.create({ name: '김날짜', hiredOn: '2024-01-01' });
    const id = created.body.id;

    expect((await client.update(id, { status: 'LEFT', leftOn: '2026-09-30' })).body.leftOn).toBe(
      '2026-09-30',
    );
    expect((await client.update(id, { leftOn: '2026-09-28' })).body.leftOn).toBe('2026-09-28');
    expect((await client.update(id, { leftOn: null })).status).toBe(400);
  });

  it('재직 상태에서 퇴사일만 넣거나 입사일보다 빠른 퇴사일은 거부한다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const created = await client.create({ name: '김검증', hiredOn: '2026-01-01' });
    const id = created.body.id;

    expect((await client.update(id, { leftOn: '2026-09-30' })).status).toBe(400);

    const early = await client.update(id, { status: 'LEFT', leftOn: '2025-12-31' });

    expect(early.status).toBe(400);
    expect(errorResponseSchema.parse(early.body).error.details?.[0]?.path).toBe('body.leftOn');
  });

  it('재입사하면 같은 카드가 재직으로 돌아오고 퇴사일이 지워진다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const created = await client.create({ name: '김재입사' });
    const id = created.body.id;

    await client.update(id, { status: 'LEFT' });

    const back = await client.update(id, { status: 'ACTIVE' });

    expect(back.body).toMatchObject({ id, status: 'ACTIVE', leftOn: null });
  });

  it('없는 직원이나 잘못된 주소는 오류다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    expect((await client.get('0198d000-0000-7000-8000-000000000999')).status).toBe(404);
    expect(
      (await client.update('0198d000-0000-7000-8000-000000000999', { name: '김' })).status,
    ).toBe(404);
    expect((await client.get('not-a-uuid')).status).toBe(400);
  });
});

describe('회사 격리', () => {
  it('다른 회사의 직원은 목록·카드·수정 어디에도 나타나지 않는다', async () => {
    const instance = app();
    const a = api(instance, await signedUp(instance));
    const b = api(instance, await signedUp(instance));
    const created = await a.create({ name: 'A사직원', phone: '010-9999-9999' });
    const id = created.body.id;

    await b.create({ name: 'B사직원' });

    expect(
      employeesResponseSchema.parse((await b.list()).body).items.map((item) => item.name),
    ).toEqual(['B사직원']);
    expect((await b.get(id)).status).toBe(404);
    expect((await b.update(id, { name: '탈취', status: 'LEFT' })).status).toBe(404);
    expect(employeeDetailSchema.parse((await a.get(id)).body)).toMatchObject({
      name: 'A사직원',
      status: 'ACTIVE',
    });
  });

  it('다른 회사의 직종 항목을 직원에 연결할 수 없다', async () => {
    const instance = app();
    const a = api(instance, await signedUp(instance));
    const b = api(instance, await signedUp(instance));
    const aJob = await optionId(a, 'JOB_TYPE', '용접공');

    await b.options();

    const res = await b.create({ name: 'B사직원', jobTypeId: aJob });

    expect(res.status).toBe(400);
  });

  it('요청에 회사 ID를 실어 보내도 무시된다', async () => {
    const instance = app();
    const a = api(instance, await signedUp(instance));
    const b = api(instance, await signedUp(instance));

    await a.create({ name: 'A표식' });

    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      `SELECT company_id FROM employees WHERE name = 'A표식'`,
    );

    await b.create({ name: 'B침투', companyId: rows[0]!.company_id });

    expect(
      employeesResponseSchema.parse((await a.list()).body).items.map((item) => item.name),
    ).toEqual(['A표식']);
  });
});

describe('DB 제약 (API를 거치지 않아도 지켜진다)', () => {
  it('퇴사 상태와 퇴사일이 어긋난 행, 다른 회사 직종 연결은 DB가 거부한다', async () => {
    const instance = app();
    const a = api(instance, await signedUp(instance));
    const b = api(instance, await signedUp(instance));

    await a.create({ name: 'DB표식A' });
    await b.create({ name: 'DB표식B' });

    const { rows } = await db.ownerPool.query<{ company_id: string; name: string }>(
      `SELECT company_id, name FROM employees WHERE name IN ('DB표식A', 'DB표식B')`,
    );
    const companyA = rows.find((row) => row.name === 'DB표식A')!.company_id;
    const bJob = await optionId(b, 'JOB_TYPE', '목수');

    await expect(
      db.ownerPool.query(
        `INSERT INTO employees (company_id, name, status) VALUES ($1, '불일치', 'LEFT')`,
        [companyA],
      ),
    ).rejects.toThrow(/employees_left_consistency/);
    await expect(
      db.ownerPool.query(
        `INSERT INTO employees (company_id, name, left_on) VALUES ($1, '불일치2', '2026-01-01')`,
        [companyA],
      ),
    ).rejects.toThrow(/employees_left_consistency/);
    await expect(
      db.ownerPool.query(
        `INSERT INTO employees (company_id, name, job_type_id) VALUES ($1, '교차', $2)`,
        [companyA, bJob],
      ),
    ).rejects.toThrow(/employees_company_id_job_type_id_fkey/);
  });

  it('앱 계정은 직원을 삭제할 수 없다', async () => {
    await expect(db.app.$executeRawUnsafe('DELETE FROM employees')).rejects.toThrow();
  });
});
