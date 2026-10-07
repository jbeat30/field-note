import {
  OPTION_KINDS,
  OPTION_PRESETS,
  errorResponseSchema,
  optionItemSchema,
  optionsResponseSchema,
  type OptionItem,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
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
    options: createOptionService(db.app),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `목록회사${sequence}`,
    adminName: '목록관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `options-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `options${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const api = (instance: ReturnType<typeof app>, cookie: string) => ({
  list: async () => {
    const res = await request(instance).get('/api/v1/company/options').set('Cookie', cookie);

    return { res, items: res.status === 200 ? optionsResponseSchema.parse(res.body).items : [] };
  },
  create: (body: object) =>
    request(instance)
      .post('/api/v1/company/options')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body),
  update: (id: string, body: object) =>
    request(instance)
      .patch(`/api/v1/company/options/${id}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body),
  reorder: (body: object) =>
    request(instance)
      .put('/api/v1/company/options/order')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body),
});

const namesOf = (items: OptionItem[], kind: (typeof OPTION_KINDS)[number]) =>
  items.filter((item) => item.kind === kind).map((item) => item.name);

describe('선택 목록 API', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const instance = app();

    expect((await request(instance).get('/api/v1/company/options')).status).toBe(401);
    expect(
      (
        await request(instance)
          .post('/api/v1/company/options')
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ kind: 'JOB_TYPE', name: '용접공' })
      ).status,
    ).toBe(401);
  });

  it('처음 조회하면 종류별 프리셋이 정해진 순서로 채워지고 다시 조회해도 늘지 않는다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const first = await client.list();

    for (const kind of OPTION_KINDS) {
      expect(namesOf(first.items, kind)).toEqual(OPTION_PRESETS[kind]);
    }

    expect(first.items.every((item) => item.isActive)).toBe(true);
    expect((await client.list()).items).toEqual(first.items);
  });

  it('동시에 처음 조회해도 프리셋이 중복되지 않는다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    await Promise.all([client.list(), client.list(), client.list()]);

    const { items } = await client.list();

    expect(items).toHaveLength(
      OPTION_KINDS.reduce((sum, kind) => sum + OPTION_PRESETS[kind].length, 0),
    );
  });

  it('항목을 추가하면 해당 종류의 맨 뒤에 붙는다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const created = await client.create({ kind: 'WORK_CATEGORY', name: '  도장 ' });

    expect(created.status).toBe(201);
    expect(optionItemSchema.parse(created.body)).toMatchObject({ name: '도장', isActive: true });
    expect(namesOf((await client.list()).items, 'WORK_CATEGORY').at(-1)).toBe('도장');
  });

  it('목록을 열기 전에 먼저 추가해도 프리셋이 사라지지 않는다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    await client.create({ kind: 'TRADE', name: '도장' });

    expect(namesOf((await client.list()).items, 'TRADE')).toEqual([
      ...OPTION_PRESETS.TRADE,
      '도장',
    ]);
  });

  it('공백·대소문자만 다른 같은 이름은 거부하고 다른 종류에는 같은 이름을 쓸 수 있다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    const duplicate = await client.create({ kind: 'JOB_TYPE', name: ' 용접공 ' });

    expect(duplicate.status).toBe(400);
    expect(errorResponseSchema.parse(duplicate.body).error.details?.[0]?.path).toBe('body.name');
    expect((await client.create({ kind: 'WORK_CATEGORY', name: '용접공' })).status).toBe(201);
  });

  it('빈 이름·너무 긴 이름·없는 종류는 검증 오류다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));

    expect((await client.create({ kind: 'JOB_TYPE', name: '   ' })).status).toBe(400);
    expect((await client.create({ kind: 'JOB_TYPE', name: '가'.repeat(31) })).status).toBe(400);
    expect((await client.create({ kind: 'MATERIAL', name: '철판' })).status).toBe(400);
  });

  it('종류마다 100개까지만 만들 수 있다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const existing = OPTION_PRESETS.TRADE.length;

    await client.list();

    for (let index = existing; index < 100; index += 1) {
      expect((await client.create({ kind: 'TRADE', name: `공종${index}` })).status).toBe(201);
    }

    expect((await client.create({ kind: 'TRADE', name: '초과' })).status).toBe(400);
  });

  it('이름을 바꾸고 숨기고 다시 쓸 수 있으며, 숨겨도 목록에서 사라지지 않는다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const target = (await client.list()).items.find((item) => item.name === '사무')!;

    const renamed = await client.update(target.id, { name: '사무직' });

    expect(optionItemSchema.parse(renamed.body).name).toBe('사무직');

    await client.update(target.id, { isActive: false });

    const hidden = (await client.list()).items.find((item) => item.id === target.id);

    expect(hidden).toMatchObject({ name: '사무직', isActive: false });

    await client.update(target.id, { isActive: true });

    expect((await client.list()).items.find((item) => item.id === target.id)?.isActive).toBe(true);
  });

  it('다른 항목과 같은 이름으로 바꾸려 하면 거부한다 (자기 이름 그대로는 허용)', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const items = (await client.list()).items.filter((item) => item.kind === 'JOB_TYPE');

    expect((await client.update(items[0]!.id, { name: items[1]!.name })).status).toBe(400);
    expect((await client.update(items[0]!.id, { name: items[0]!.name })).status).toBe(200);
  });

  it('변경할 값이 없거나 없는 항목이면 오류다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const [first] = (await client.list()).items;

    expect((await client.update(first!.id, {})).status).toBe(400);
    expect(
      (await client.update('0198d000-0000-7000-8000-000000000999', { isActive: false })).status,
    ).toBe(404);
    expect((await client.update('not-a-uuid', { isActive: false })).status).toBe(400);
  });

  it('순서를 바꾸면 그대로 저장되고, 일부만 보내거나 섞이면 거부한다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const jobs = (await client.list()).items.filter((item) => item.kind === 'JOB_TYPE');
    const reversed = [...jobs].reverse().map((item) => item.id);

    expect((await client.reorder({ kind: 'JOB_TYPE', ids: reversed })).status).toBe(200);
    expect(namesOf((await client.list()).items, 'JOB_TYPE')).toEqual(
      [...OPTION_PRESETS.JOB_TYPE].reverse(),
    );

    expect((await client.reorder({ kind: 'JOB_TYPE', ids: reversed.slice(1) })).status).toBe(400);
    expect(
      (await client.reorder({ kind: 'JOB_TYPE', ids: [reversed[0], ...reversed] })).status,
    ).toBe(400);
    // 다른 종류의 항목이 섞인 경우
    const other = (await client.list()).items.find((item) => item.kind === 'TRADE')!;

    expect(
      (await client.reorder({ kind: 'JOB_TYPE', ids: [...reversed.slice(1), other.id] })).status,
    ).toBe(400);
  });

  it('숨긴 항목도 순서 변경 대상이다', async () => {
    const instance = app();
    const client = api(instance, await signedUp(instance));
    const jobs = (await client.list()).items.filter((item) => item.kind === 'JOB_TYPE');

    await client.update(jobs[0]!.id, { isActive: false });

    expect(
      (await client.reorder({ kind: 'JOB_TYPE', ids: [...jobs].reverse().map((item) => item.id) }))
        .status,
    ).toBe(200);
  });
});

describe('회사 격리', () => {
  it('다른 회사의 목록은 보이지 않고, 다른 회사의 항목은 바꾸거나 정렬할 수 없다', async () => {
    const instance = app();
    const a = api(instance, await signedUp(instance));
    const b = api(instance, await signedUp(instance));

    await a.create({ kind: 'JOB_TYPE', name: 'A사만의직종' });

    const aItems = (await a.list()).items;
    const bItems = (await b.list()).items;
    const secret = aItems.find((item) => item.name === 'A사만의직종')!;

    expect(bItems.map((item) => item.name)).not.toContain('A사만의직종');
    // 다른 회사의 항목은 없는 것과 같은 응답
    expect((await b.update(secret.id, { name: '탈취' })).status).toBe(404);
    expect((await b.update(secret.id, { isActive: false })).status).toBe(404);
    expect(
      (
        await b.reorder({
          kind: 'JOB_TYPE',
          ids: aItems.filter((item) => item.kind === 'JOB_TYPE').map((item) => item.id),
        })
      ).status,
    ).toBe(400);
    expect((await a.list()).items.find((item) => item.id === secret.id)).toMatchObject({
      name: 'A사만의직종',
      isActive: true,
    });
  });

  it('두 회사가 같은 이름을 각자 가질 수 있다', async () => {
    const instance = app();
    const a = api(instance, await signedUp(instance));
    const b = api(instance, await signedUp(instance));

    expect((await a.create({ kind: 'TRADE', name: '도장' })).status).toBe(201);
    expect((await b.create({ kind: 'TRADE', name: '도장' })).status).toBe(201);
  });

  it('요청에 회사 ID를 실어 보내도 무시되고 세션의 회사만 쓴다', async () => {
    const instance = app();
    const a = api(instance, await signedUp(instance));
    const b = api(instance, await signedUp(instance));

    // A사만 가진 항목으로 A사의 회사 ID를 찾아 B사 요청에 실어 보냄
    await a.create({ kind: 'JOB_TYPE', name: 'A사표식' });

    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      `SELECT company_id FROM option_items WHERE name = 'A사표식'`,
    );
    const aCompanyId = rows[0]!.company_id;

    await b.create({ kind: 'JOB_TYPE', name: '침투', companyId: aCompanyId });

    expect(namesOf((await a.list()).items, 'JOB_TYPE')).not.toContain('침투');
    expect(namesOf((await b.list()).items, 'JOB_TYPE')).toContain('침투');
  });
});
