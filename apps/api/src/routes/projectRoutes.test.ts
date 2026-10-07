import {
  errorResponseSchema,
  optionsResponseSchema,
  projectDetailSchema,
  projectsResponseSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createEmployeeService } from '../employee/employeeService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createProjectService } from '../project/projectService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

// 코드의 연도를 고정 (서울 기준 2026-10-07)
const NOW = new Date('2026-10-07T03:00:00Z');
// 서울로는 2027-01-01 (UTC로는 아직 2026년)
const NEW_YEAR = new Date('2026-12-31T16:00:00Z');

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
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `프로젝트회사${sequence}`,
    adminName: '프로젝트관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `project-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `project${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const api = (instance: ReturnType<typeof app>, cookie: string) => {
  const send = (method: 'post' | 'patch', path: string, body: object) =>
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
    list: (query = '') => request(instance).get(`/api/v1/projects${query}`).set('Cookie', cookie),
    get: (id: string) => request(instance).get(`/api/v1/projects/${id}`).set('Cookie', cookie),
    create: (body: object) => send('post', '/projects', body),
    update: (id: string, body: object) => send('patch', `/projects/${id}`, body),
    createPartner: async (kind: string, name: string) =>
      (await send('post', '/partners', { kind, name })).body.id as string,
    createEmployee: async (name: string) =>
      (await send('post', '/employees', { name })).body.id as string,
    updateEmployee: (id: string, body: object) => send('patch', `/employees/${id}`, body),
    updatePartner: (id: string, body: object) => send('patch', `/partners/${id}`, body),
    updateOption: (id: string, body: object) => send('patch', `/company/options/${id}`, body),
  };
};

// 한 회사의 프로젝트 등록에 필요한 고객·담당자·공종을 만들어 기본 본문을 돌려줌
const setup = async (instance: ReturnType<typeof app>) => {
  const cookie = await signedUp(instance);
  const client = api(instance, cookie);
  const clientId = await client.createPartner('CLIENT', '가나다건설');
  const managerId = await client.createEmployee('박소장');
  const trades = (await client.options()).filter((item) => item.kind === 'TRADE');
  const body = {
    name: 'A동 판금 공사',
    siteName: 'A동 신축 현장',
    clientId,
    managerId,
    contractDate: '2026-09-01',
    plannedStart: '2026-10-01',
    plannedEnd: '2026-12-31',
  };

  return { cookie, client, clientId, managerId, trades, body };
};

const codesOf = (res: request.Response) =>
  projectsResponseSchema.parse(res.body).items.map((item) => item.code);
const namesOf = (res: request.Response) =>
  projectsResponseSchema.parse(res.body).items.map((item) => item.name);

describe('프로젝트 등록·코드 번호', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const instance = app();
    const { body } = await setup(instance);

    expect((await request(instance).get('/api/v1/projects')).status).toBe(401);
    expect(
      (
        await request(instance)
          .post('/api/v1/projects')
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send(body)
      ).status,
    ).toBe(401);
  });

  it('등록하면 예정 상태에 코드가 `연도-순번`으로 자동으로 붙는다', async () => {
    const instance = app();
    const { client, body, clientId, managerId, trades } = await setup(instance);
    const res = await client.create({
      ...body,
      tradeIds: [trades[0]!.id],
      siteAddress: '서울시 중구',
      memo: '메모',
    });

    expect(res.status).toBe(201);
    expect(projectDetailSchema.parse(res.body)).toMatchObject({
      code: '2026-001',
      name: 'A동 판금 공사',
      status: 'PLANNED',
      clientId,
      managerId,
      tradeIds: [trades[0]!.id],
      siteAddress: '서울시 중구',
      contractDate: '2026-09-01',
      plannedStart: '2026-10-01',
      plannedEnd: '2026-12-31',
    });
    expect((await client.create({ ...body, name: '두 번째' })).body.code).toBe('2026-002');
  });

  it('동시에 여러 건을 등록해도 번호가 겹치거나 빠지지 않는다', async () => {
    const instance = app();
    const { client, body } = await setup(instance);
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) => client.create({ ...body, name: `동시${index}` })),
    );

    expect(results.map((res) => res.status)).toEqual(Array(8).fill(201));
    expect(results.map((res) => res.body.code).sort()).toEqual(
      Array.from({ length: 8 }, (_, index) => `2026-${String(index + 1).padStart(3, '0')}`),
    );
  });

  it('검증에 실패한 등록은 번호를 쓰지 않는다', async () => {
    const instance = app();
    const { client, body } = await setup(instance);

    await client.create({ ...body, name: '첫째' });
    expect(
      (await client.create({ ...body, managerId: '0198d000-0000-7000-8000-000000000999' })).status,
    ).toBe(400);
    expect((await client.create({ ...body, name: '셋째' })).body.code).toBe('2026-002');
  });

  it('해가 바뀌면(서울 기준) 새 해 순번이 1부터 시작하고 이전 해 번호는 그대로다', async () => {
    const { cookie, client, body } = await setup(app());

    await client.create(body);
    await client.create({ ...body, name: '올해 둘째' });

    const nextYear = api(app(NEW_YEAR), cookie);

    expect((await nextYear.create({ ...body, name: '새해 첫째' })).body.code).toBe('2027-001');
    expect((await client.create({ ...body, name: '다시 올해' })).body.code).toBe('2026-003');
  });

  it('순번이 999를 넘어도 이어서 붙는다 (4자리)', async () => {
    const instance = app();
    const { client, body } = await setup(instance);
    const first = await client.create(body);

    await db.ownerPool.query(
      'UPDATE project_code_sequences SET last_number = 999 WHERE company_id = (SELECT company_id FROM projects WHERE id = $1)',
      [first.body.id],
    );

    expect((await client.create({ ...body, name: '천번째' })).body.code).toBe('2026-1000');
  });
});

describe('등록 검증', () => {
  it('필수 항목이 빠지거나 형식·범위가 틀리면 거부한다', async () => {
    const instance = app();
    const { client, body } = await setup(instance);

    for (const key of [
      'name',
      'siteName',
      'clientId',
      'managerId',
      'contractDate',
      'plannedStart',
      'plannedEnd',
    ]) {
      const missing: Record<string, unknown> = { ...body };

      delete missing[key];

      expect((await client.create(missing)).status).toBe(400);
    }

    for (const patch of [
      { name: '   ' },
      { plannedStart: '2026-12-31', plannedEnd: '2026-10-01' },
      { siteMapUrl: 'javascript:alert(1)' },
      { siteContactPhone: '전화' },
      { contractDate: '2026-02-30' },
    ]) {
      expect((await client.create({ ...body, ...patch })).status).toBe(400);
    }
  });

  it('고객 자리에 다른 구분의 업체, 담당자 자리에 없는 직원, 공종 자리에 다른 종류를 넣으면 거부한다', async () => {
    const instance = app();
    const { client, body } = await setup(instance);
    const supplier = await client.createPartner('SUPPLIER', '대한철강');
    const job = (await client.options()).find((item) => item.kind === 'JOB_TYPE')!;

    for (const [patch, path] of [
      [{ clientId: supplier }, 'body.clientId'],
      [{ clientId: '0198d000-0000-7000-8000-000000000999' }, 'body.clientId'],
      [{ managerId: '0198d000-0000-7000-8000-000000000999' }, 'body.managerId'],
      [{ tradeIds: [job.id] }, 'body.tradeIds'],
    ] as const) {
      const res = await client.create({ ...body, ...patch });

      expect(res.status).toBe(400);
      expect(errorResponseSchema.parse(res.body).error.details?.[0]?.path).toBe(path);
    }
  });

  it('숨긴 고객·공종, 퇴사한 담당자, 중복 공종은 새로 고를 수 없다', async () => {
    const instance = app();
    const { client, body, clientId, managerId, trades } = await setup(instance);
    const hiddenClient = await client.createPartner('CLIENT', '옛고객');
    const leftManager = await client.createEmployee('퇴사소장');

    await client.updatePartner(hiddenClient, { isActive: false });
    await client.updateEmployee(leftManager, { status: 'LEFT' });
    await client.updateOption(trades[1]!.id, { isActive: false });

    expect((await client.create({ ...body, clientId: hiddenClient })).status).toBe(400);
    expect((await client.create({ ...body, managerId: leftManager })).status).toBe(400);
    expect((await client.create({ ...body, tradeIds: [trades[1]!.id] })).status).toBe(400);
    expect(
      (await client.create({ ...body, tradeIds: [trades[0]!.id, trades[0]!.id] })).status,
    ).toBe(400);
    expect((await client.create({ ...body, clientId, managerId })).status).toBe(201);
  });

  it('다른 회사의 고객·직원·공종은 쓸 수 없다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);

    for (const patch of [
      { clientId: a.clientId },
      { managerId: a.managerId },
      { tradeIds: [a.trades[0]!.id] },
    ]) {
      expect((await b.client.create({ ...b.body, ...patch })).status).toBe(400);
    }
  });
});

describe('목록·조회', () => {
  it('최근 등록순이 기본이고, 목록에는 현장 연락처·출입 메모·계약일·메모가 없다', async () => {
    const instance = app();
    const { client, body } = await setup(instance);

    await client.create({
      ...body,
      name: '첫째',
      siteContactName: '현장담당',
      siteContactPhone: '010-8888-8888',
      accessMemo: '출입비밀',
    });
    await client.create({ ...body, name: '둘째' });

    const res = await client.list();
    const text = JSON.stringify(res.body);

    expect(namesOf(res)).toEqual(['둘째', '첫째']);
    expect(text).not.toContain('010-8888-8888');
    expect(text).not.toContain('출입비밀');
    expect(text).not.toContain('contractDate');
  });

  it('상태·고객·담당자·공종·기간·검색으로 거르고 종료일·이름순으로 정렬한다', async () => {
    const instance = app();
    const { client, body, clientId, managerId, trades } = await setup(instance);
    const otherClient = await client.createPartner('CLIENT', '미래오피스');
    const otherManager = await client.createEmployee('이과장');
    const a = await client.create({
      ...body,
      name: '다 프로젝트',
      plannedStart: '2026-01-01',
      plannedEnd: '2026-03-31',
      tradeIds: [trades[0]!.id],
    });
    const b = await client.create({
      ...body,
      name: '가 프로젝트',
      clientId: otherClient,
      plannedStart: '2026-05-01',
      plannedEnd: '2026-09-30',
      siteName: '강남 사옥',
    });
    const c = await client.create({
      ...body,
      name: '나 프로젝트',
      managerId: otherManager,
      plannedStart: '2026-10-01',
      plannedEnd: '2026-12-31',
    });

    // 상태는 아직 API로 바꿀 수 없어(P1-6) 소유 계정으로 직접 바꿔 준비
    await db.ownerPool.query(`UPDATE projects SET status = 'IN_PROGRESS' WHERE id = $1`, [
      c.body.id,
    ]);
    await db.ownerPool.query(`UPDATE projects SET status = 'COMPLETED' WHERE id = $1`, [a.body.id]);

    const names = async (query: string) => namesOf(await client.list(query));

    expect(await names('?status=IN_PROGRESS')).toEqual(['나 프로젝트']);
    expect(await names(`?clientId=${otherClient}`)).toEqual(['가 프로젝트']);
    expect(await names(`?clientId=${clientId}`)).toEqual(['나 프로젝트', '다 프로젝트']);
    expect(await names(`?managerId=${otherManager}`)).toEqual(['나 프로젝트']);
    expect(await names(`?tradeId=${trades[0]!.id}`)).toEqual(['다 프로젝트']);
    // 기간이 겹치는 것: 2026-04-01 ~ 2026-05-31 → 가(5~9월)만
    expect(await names('?from=2026-04-01&to=2026-05-31')).toEqual(['가 프로젝트']);
    expect(await names('?from=2026-12-01')).toEqual(['나 프로젝트']);
    expect(await names(`?q=${encodeURIComponent('강남')}`)).toEqual(['가 프로젝트']);
    expect(await names(`?q=${encodeURIComponent('2026-003')}`)).toEqual(['나 프로젝트']);
    expect(await names('?sort=endDate')).toEqual(['다 프로젝트', '가 프로젝트', '나 프로젝트']);
    expect(await names('?sort=name')).toEqual(['가 프로젝트', '나 프로젝트', '다 프로젝트']);
    expect(b.status).toBe(201);
    expect(managerId).toBeTruthy();
    expect((await client.list('?status=NOPE')).status).toBe(400);
    expect((await client.list('?sort=random')).status).toBe(400);
    expect((await client.list('?from=2026-99-99')).status).toBe(400);
  });

  it('코드는 숫자 순서로 정렬한다 (1000번이 999번 뒤에 온다)', async () => {
    const instance = app();
    const { client, body } = await setup(instance);
    const first = await client.create({ ...body, name: '첫째' });

    await db.ownerPool.query(
      'UPDATE project_code_sequences SET last_number = 999 WHERE company_id = (SELECT company_id FROM projects WHERE id = $1)',
      [first.body.id],
    );
    await client.create({ ...body, name: '천번째' });

    expect(codesOf(await client.list())).toEqual(['2026-1000', '2026-001']);
  });

  it('카드에는 모든 기본정보가 있고 없는 프로젝트·잘못된 주소는 오류다', async () => {
    const instance = app();
    const { client, body } = await setup(instance);
    const created = await client.create({
      ...body,
      siteAddress: '서울시 중구 세종대로 1',
      siteMapUrl: 'https://map.example.com/abc',
      siteContactName: '현장소장',
      siteContactPhone: '010-1234-5678',
      accessMemo: '정문 출입, 주차 불가',
      memo: '관리자 메모',
    });

    expect(projectDetailSchema.parse((await client.get(created.body.id)).body)).toMatchObject({
      siteAddress: '서울시 중구 세종대로 1',
      siteMapUrl: 'https://map.example.com/abc',
      siteContactName: '현장소장',
      siteContactPhone: '010-1234-5678',
      accessMemo: '정문 출입, 주차 불가',
      memo: '관리자 메모',
    });
    expect((await client.get('0198d000-0000-7000-8000-000000000999')).status).toBe(404);
    expect((await client.get('not-a-uuid')).status).toBe(400);
  });
});

describe('수정', () => {
  it('보낸 항목만 바꾸고 null로 비우며 코드·상태는 바꿀 수 없다', async () => {
    const instance = app();
    const { client, body } = await setup(instance);
    const created = await client.create({ ...body, siteAddress: '주소', memo: '메모' });
    const id = created.body.id;

    expect((await client.update(id, { name: '고친 이름' })).body).toMatchObject({
      name: '고친 이름',
      siteName: body.siteName,
      siteAddress: '주소',
      code: '2026-001',
      status: 'PLANNED',
    });
    expect((await client.update(id, { siteAddress: null, memo: '' })).body).toMatchObject({
      siteAddress: null,
      memo: null,
    });
    // 코드·상태는 수정 대상이 아님: 바꿀 값이 없는 요청이 된다
    expect((await client.update(id, { code: '2026-999' })).status).toBe(400);
    expect((await client.update(id, { status: 'CLOSED' })).status).toBe(400);
    expect((await client.update(id, {})).status).toBe(400);
    expect((await client.get(id)).body).toMatchObject({ code: '2026-001', status: 'PLANNED' });
  });

  it('공종을 통째로 바꾸고, 한쪽 날짜만 바꿔도 합친 기간 순서를 검사한다', async () => {
    const instance = app();
    const { client, body, trades } = await setup(instance);
    const created = await client.create({ ...body, tradeIds: [trades[0]!.id, trades[1]!.id] });
    const id = created.body.id;
    const swapped = await client.update(id, { tradeIds: [trades[1]!.id, trades[2]!.id] });

    expect(swapped.body.tradeIds.sort()).toEqual([trades[1]!.id, trades[2]!.id].sort());
    expect((await client.update(id, { tradeIds: [] })).body.tradeIds).toEqual([]);
    // 현재 시작 예정일은 2026-10-01이라 그보다 빠른 종료일은 거부
    expect((await client.update(id, { plannedEnd: '2026-09-30' })).status).toBe(400);
    expect((await client.update(id, { plannedStart: '2027-01-01' })).status).toBe(400);
    expect(
      (await client.update(id, { plannedStart: '2026-11-01', plannedEnd: '2027-01-31' })).status,
    ).toBe(200);
  });

  it('이미 쓰는 숨긴 고객·공종·퇴사한 담당자는 유지할 수 있지만 다른 숨긴 항목으로 바꿀 수는 없다', async () => {
    const instance = app();
    const { client, body, clientId, managerId, trades } = await setup(instance);
    const created = await client.create({ ...body, tradeIds: [trades[0]!.id] });
    const id = created.body.id;
    const hiddenOther = await client.createPartner('CLIENT', '다른 숨김');

    await client.updatePartner(clientId, { isActive: false });
    await client.updatePartner(hiddenOther, { isActive: false });
    await client.updateEmployee(managerId, { status: 'LEFT' });
    await client.updateOption(trades[0]!.id, { isActive: false });

    expect(
      (
        await client.update(id, {
          name: '그대로 유지',
          clientId,
          managerId,
          tradeIds: [trades[0]!.id],
        })
      ).status,
    ).toBe(200);
    expect((await client.update(id, { clientId: hiddenOther })).status).toBe(400);
  });
});

describe('회사 격리', () => {
  it('다른 회사의 프로젝트는 목록·카드·수정 어디에도 나타나지 않는다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);
    const created = await a.client.create({
      ...a.body,
      name: 'A사 프로젝트',
      siteContactPhone: '010-7777-7777',
    });
    const id = created.body.id;

    await b.client.create({ ...b.body, name: 'B사 프로젝트' });

    expect(namesOf(await b.client.list())).toEqual(['B사 프로젝트']);
    expect((await b.client.get(id)).status).toBe(404);
    expect((await b.client.update(id, { name: '탈취' })).status).toBe(404);
    expect(projectDetailSchema.parse((await a.client.get(id)).body).name).toBe('A사 프로젝트');
  });

  it('코드 번호는 회사마다 따로 센다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);

    expect((await a.client.create(a.body)).body.code).toBe('2026-001');
    expect((await b.client.create(b.body)).body.code).toBe('2026-001');
    expect((await a.client.create(a.body)).body.code).toBe('2026-002');
  });

  it('요청에 회사 ID를 실어 보내도 무시된다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);
    const created = await a.client.create({ ...a.body, name: 'A표식' });
    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      'SELECT company_id FROM projects WHERE id = $1',
      [created.body.id],
    );

    await b.client.create({ ...b.body, name: 'B침투', companyId: rows[0]!.company_id });

    expect(namesOf(await a.client.list())).toEqual(['A표식']);
    expect(namesOf(await b.client.list())).toEqual(['B침투']);
  });
});

describe('DB 제약 (API를 거치지 않아도 지켜진다)', () => {
  it('코드 형식·기간 순서·지도 링크 형식·다른 회사 참조·코드 중복을 DB가 거부한다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);
    const created = await a.client.create(a.body);
    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      'SELECT company_id FROM projects WHERE id = $1',
      [created.body.id],
    );
    const company = rows[0]!.company_id;
    const insert = (overrides: Record<string, string>) => {
      const values = {
        code: '2026-777',
        name: '직접',
        site_name: '현장',
        client_id: a.clientId,
        manager_id: a.managerId,
        contract_date: '2026-01-01',
        planned_start: '2026-02-01',
        planned_end: '2026-03-01',
        ...overrides,
      };
      const keys = Object.keys(values);

      return db.ownerPool.query(
        `INSERT INTO projects (company_id, ${keys.join(', ')}) VALUES ($1, ${keys.map((_, index) => `$${index + 2}`).join(', ')})`,
        [company, ...Object.values(values)],
      );
    };

    await expect(insert({ code: 'ABC' })).rejects.toThrow(/projects_code_format/);
    await expect(insert({ planned_start: '2026-04-01' })).rejects.toThrow(/projects_period_order/);
    await expect(insert({ site_map_url: 'javascript:alert(1)' })).rejects.toThrow(
      /projects_site_map_url_format/,
    );
    await expect(insert({ client_id: b.clientId })).rejects.toThrow(
      /projects_company_id_client_id_fkey/,
    );
    await expect(insert({ manager_id: b.managerId })).rejects.toThrow(
      /projects_company_id_manager_id_fkey/,
    );
    await expect(insert({ code: '2026-001' })).rejects.toThrow(/projects_company_id_code_key/);
    await expect(insert({})).resolves.toBeDefined();
  });

  it('다른 회사의 공종을 프로젝트에 연결할 수 없고, 앱 계정은 프로젝트를 삭제할 수 없다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);
    const created = await a.client.create(a.body);
    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      'SELECT company_id FROM projects WHERE id = $1',
      [created.body.id],
    );

    await expect(
      db.ownerPool.query(
        'INSERT INTO project_trades (company_id, project_id, trade_id) VALUES ($1, $2, $3)',
        [rows[0]!.company_id, created.body.id, b.trades[0]!.id],
      ),
    ).rejects.toThrow(/project_trades_company_id_trade_id_fkey/);
    await expect(db.app.$executeRawUnsafe('DELETE FROM projects')).rejects.toThrow();
  });
});
