import {
  PARTNER_MAX_PER_COMPANY,
  errorResponseSchema,
  partnerDetailSchema,
  partnersResponseSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createPartnerService } from '../partner/partnerService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(180_000);

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
    partners: createPartnerService(db.app),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `명부회사${sequence}`,
    adminName: '명부관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `partner-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `partner${sequence}@example.com`,
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
    list: (query = '') => request(instance).get(`/api/v1/partners${query}`).set('Cookie', cookie),
    get: (id: string) => request(instance).get(`/api/v1/partners/${id}`).set('Cookie', cookie),
    create: (body: object) => write('post', '/partners', body),
    update: (id: string, body: object) => write('patch', `/partners/${id}`, body),
  };
};

const namesOf = (res: request.Response) =>
  partnersResponseSchema.parse(res.body).items.map((item) => item.name);

describe('명부 등록·조회', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const instance = app();

    expect((await request(instance).get('/api/v1/partners')).status).toBe(401);
    expect(
      (
        await request(instance)
          .post('/api/v1/partners')
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ kind: 'CLIENT', name: '가나다건설' })
      ).status,
    ).toBe(401);
  });

  it('구분과 상호만으로 등록할 수 있다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const res = await client.create({ kind: 'CLIENT', name: '  가나다건설 ' });

    expect(res.status).toBe(201);
    expect(partnerDetailSchema.parse(res.body)).toMatchObject({
      kind: 'CLIENT',
      name: '가나다건설',
      contactName: null,
      phone: null,
      memo: null,
      isActive: true,
    });
  });

  it('모든 항목을 넣어 등록하고 카드로 다시 읽는다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const created = await client.create({
      kind: 'SUPPLIER',
      name: '대한철강',
      contactName: '김영업',
      phone: '02-1234-5678',
      memo: '아연도강판 납품',
    });

    expect(partnerDetailSchema.parse((await client.get(created.body.id)).body)).toMatchObject({
      kind: 'SUPPLIER',
      name: '대한철강',
      contactName: '김영업',
      phone: '02-1234-5678',
      memo: '아연도강판 납품',
    });
  });

  it('목록에는 연락처·메모가 내려가지 않는다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    await client.create({
      kind: 'CLIENT',
      name: '비공개상사',
      contactName: '박담당',
      phone: '010-9999-0000',
      memo: '비밀메모',
    });

    const res = await client.list();
    const text = JSON.stringify(res.body);

    expect(text).toContain('박담당');
    expect(text).not.toContain('010-9999-0000');
    expect(text).not.toContain('비밀메모');
  });

  it('구분 순서(고객 → 협력업체 → 공급처)에 이름순으로 정렬하고 구분·이름·담당자로 거른다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    await client.create({ kind: 'SUPPLIER', name: '가공급' });
    await client.create({ kind: 'CLIENT', name: '다고객' });
    await client.create({ kind: 'SUBCONTRACTOR', name: '나협력', contactName: '최반장' });
    await client.create({ kind: 'CLIENT', name: '가고객' });

    expect(namesOf(await client.list())).toEqual(['가고객', '다고객', '나협력', '가공급']);
    expect(namesOf(await client.list('?kind=CLIENT'))).toEqual(['가고객', '다고객']);
    expect(namesOf(await client.list(`?q=${encodeURIComponent('협력')}`))).toEqual(['나협력']);
    expect(namesOf(await client.list(`?q=${encodeURIComponent('최반장')}`))).toEqual(['나협력']);
    expect((await client.list('?kind=VENDOR')).status).toBe(400);
  });
});

describe('입력 검증', () => {
  it('구분이 없거나 상호가 비었거나 형식이 틀리면 거부한다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    for (const body of [
      { name: '가' },
      { kind: 'VENDOR', name: '가' },
      { kind: 'CLIENT', name: '   ' },
      { kind: 'CLIENT', name: '가'.repeat(51) },
      { kind: 'CLIENT', name: '가', phone: 'abc' },
      { kind: 'CLIENT', name: '가', contactName: '가'.repeat(31) },
      { kind: 'CLIENT', name: '가', memo: 'a'.repeat(1001) },
    ]) {
      expect((await client.create(body)).status).toBe(400);
    }
  });

  it('같은 구분 안에서는 공백·대소문자만 다른 상호도 중복이지만, 다른 구분에는 같은 상호를 쓸 수 있다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    await client.create({ kind: 'CLIENT', name: 'ABC 건설' });

    const duplicate = await client.create({ kind: 'CLIENT', name: ' abc   건설 ' });

    expect(duplicate.status).toBe(400);
    expect(errorResponseSchema.parse(duplicate.body).error.details?.[0]?.path).toBe('body.name');
    expect((await client.create({ kind: 'SUBCONTRACTOR', name: 'ABC 건설' })).status).toBe(201);
  });

  it('회사당 1000곳까지만 등록할 수 있다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    await client.create({ kind: 'CLIENT', name: '한도표식' });

    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      `SELECT company_id FROM partners WHERE name = '한도표식'`,
    );

    await db.ownerPool.query(
      `INSERT INTO partners (company_id, kind, name, name_key)
       SELECT $1, 'SUPPLIER', '일괄' || g, '일괄' || g FROM generate_series(1, $2) g`,
      [rows[0]!.company_id, PARTNER_MAX_PER_COMPANY - 1],
    );

    const res = await client.create({ kind: 'CLIENT', name: '1001번째' });

    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).error.details?.[0]?.message).toContain('1000곳');
  });
});

describe('수정·숨기기', () => {
  it('보낸 항목만 바꾸고 null로 비우며, 구분은 바꿀 수 없다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const created = await client.create({
      kind: 'CLIENT',
      name: '수정상사',
      contactName: '이담당',
      phone: '010-1111-2222',
      memo: '메모',
    });
    const id = created.body.id;

    expect((await client.update(id, { name: '고침상사' })).body).toMatchObject({
      name: '고침상사',
      contactName: '이담당',
      phone: '010-1111-2222',
    });
    expect(
      (await client.update(id, { contactName: null, phone: null, memo: '' })).body,
    ).toMatchObject({
      contactName: null,
      phone: null,
      memo: null,
    });
    // 구분은 수정 대상이 아님(무시): 변경 값이 없는 요청이 된다
    expect((await client.update(id, { kind: 'SUPPLIER' })).status).toBe(400);
    expect((await client.get(id)).body.kind).toBe('CLIENT');
    expect((await client.update(id, {})).status).toBe(400);
    expect((await client.update(id, { name: '   ' })).status).toBe(400);
  });

  it('숨기고 다시 쓸 수 있으며 숨겨도 목록과 카드에서 사라지지 않는다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const created = await client.create({ kind: 'SUBCONTRACTOR', name: '숨김협력' });
    const id = created.body.id;

    expect((await client.update(id, { isActive: false })).body.isActive).toBe(false);
    expect(partnersResponseSchema.parse((await client.list()).body).items[0]).toMatchObject({
      name: '숨김협력',
      isActive: false,
    });
    expect((await client.get(id)).body.isActive).toBe(false);
    expect((await client.update(id, { isActive: true })).body.isActive).toBe(true);
  });

  it('같은 구분의 다른 업체와 같은 상호로 바꾸려 하면 거부한다 (자기 상호 그대로는 허용)', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const first = await client.create({ kind: 'CLIENT', name: '하나상사' });

    await client.create({ kind: 'CLIENT', name: '둘상사' });

    expect((await client.update(first.body.id, { name: '둘상사' })).status).toBe(400);
    expect((await client.update(first.body.id, { name: '하나상사' })).status).toBe(200);
  });

  it('없는 업체나 잘못된 주소는 오류다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    expect((await client.get('0198d000-0000-7000-8000-000000000999')).status).toBe(404);
    expect(
      (await client.update('0198d000-0000-7000-8000-000000000999', { name: '가' })).status,
    ).toBe(404);
    expect((await client.get('not-a-uuid')).status).toBe(400);
  });
});

describe('회사 격리', () => {
  it('다른 회사의 명부는 목록·카드·수정 어디에도 나타나지 않는다', async () => {
    const instance = app();
    const a = api(instance, await signedUp(instance));
    const b = api(instance, await signedUp(instance));
    const created = await a.create({ kind: 'CLIENT', name: 'A사고객', phone: '010-7777-7777' });
    const id = created.body.id;

    await b.create({ kind: 'CLIENT', name: 'B사고객' });

    expect(namesOf(await b.list())).toEqual(['B사고객']);
    expect((await b.get(id)).status).toBe(404);
    expect((await b.update(id, { name: '탈취', isActive: false })).status).toBe(404);
    expect(partnerDetailSchema.parse((await a.get(id)).body)).toMatchObject({
      name: 'A사고객',
      isActive: true,
    });
  });

  it('두 회사가 같은 상호를 각자 가질 수 있다', async () => {
    const instance = app();
    const a = api(instance, await signedUp(instance));
    const b = api(instance, await signedUp(instance));

    expect((await a.create({ kind: 'SUPPLIER', name: '공통철강' })).status).toBe(201);
    expect((await b.create({ kind: 'SUPPLIER', name: '공통철강' })).status).toBe(201);
  });

  it('요청에 회사 ID를 실어 보내도 무시된다', async () => {
    const instance = app();
    const a = api(instance, await signedUp(instance));
    const b = api(instance, await signedUp(instance));

    await a.create({ kind: 'CLIENT', name: 'A표식' });

    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      `SELECT company_id FROM partners WHERE name = 'A표식'`,
    );

    await b.create({ kind: 'CLIENT', name: 'B침투', companyId: rows[0]!.company_id });

    expect(namesOf(await a.list())).toEqual(['A표식']);
    expect(namesOf(await b.list())).toEqual(['B침투']);
  });

  it('앱 계정은 명부를 삭제할 수 없다', async () => {
    await expect(db.app.$executeRawUnsafe('DELETE FROM partners')).rejects.toThrow();
  });
});
