import { companySettingsSchema, errorResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { createCompanySettingsService } from '../company/companySettingsService';
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
    companySettings: createCompanySettingsService(db.app),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

// 가입해서 로그인 쿠키를 얻음 (회사마다 독립된 설정)
const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `설정회사${sequence}`,
    adminName: '설정관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `settings-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `settings${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const put = (instance: ReturnType<typeof app>, cookie: string, body: unknown) =>
  request(instance)
    .put('/api/v1/company/settings')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .set('Cookie', cookie)
    .send(body as object);

describe('GET·PUT /api/v1/company/settings', () => {
  it('처음에는 기본값이고, 저장한 값이 다시 조회된다', async () => {
    const instance = app();
    const cookie = await signedUp(instance);
    const initial = await request(instance).get('/api/v1/company/settings').set('Cookie', cookie);

    expect(companySettingsSchema.parse(initial.body)).toEqual({
      standardWorkMinutes: 480,
      monthlyWorkDays: 22,
      workUnitMode: 'RATIO',
    });

    const next = { standardWorkMinutes: 450, monthlyWorkDays: 24, workUnitMode: 'HOURS' };
    const saved = await put(instance, cookie, next);

    expect(saved.status).toBe(200);
    expect(saved.body).toEqual(next);
    expect(
      (await request(instance).get('/api/v1/company/settings').set('Cookie', cookie)).body,
    ).toEqual(next);
  });

  it('두 회사의 설정은 서로 독립이다', async () => {
    const instance = app();
    const a = await signedUp(instance);
    const b = await signedUp(instance);

    await put(instance, a, {
      standardWorkMinutes: 600,
      monthlyWorkDays: 30,
      workUnitMode: 'HOURS',
    });

    expect((await request(instance).get('/api/v1/company/settings').set('Cookie', b)).body).toEqual(
      {
        standardWorkMinutes: 480,
        monthlyWorkDays: 22,
        workUnitMode: 'RATIO',
      },
    );
  });

  it('요청의 회사 ID는 무시하고 세션의 회사 설정만 바꾼다', async () => {
    const instance = app();
    const a = await signedUp(instance);
    const b = await signedUp(instance);
    // 직전에 가입한 회사가 b (이름에 순번이 들어 있음)
    const bCompany = await db.owner.company.findFirst({ where: { name: `설정회사${sequence}` } });

    await put(instance, a, {
      standardWorkMinutes: 420,
      monthlyWorkDays: 21,
      workUnitMode: 'RATIO',
      companyId: bCompany?.id,
    });

    expect(
      (await request(instance).get('/api/v1/company/settings').set('Cookie', b)).body
        .standardWorkMinutes,
    ).toBe(480);
    expect(
      (await request(instance).get('/api/v1/company/settings').set('Cookie', a)).body
        .standardWorkMinutes,
    ).toBe(420);
  });

  it('범위를 벗어나거나 형식이 틀린 값은 400이고 저장되지 않는다', async () => {
    const instance = app();
    const cookie = await signedUp(instance);
    const cases = [
      { standardWorkMinutes: 30, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
      { standardWorkMinutes: 480, monthlyWorkDays: 0, workUnitMode: 'RATIO' },
      { standardWorkMinutes: 480.5, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
      { standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'DAYS' },
      { standardWorkMinutes: 480, monthlyWorkDays: 22 },
    ];

    for (const body of cases) {
      const res = await put(instance, cookie, body);

      expect(res.status).toBe(400);
      expect(errorResponseSchema.parse(res.body).error.code).toBe('VALIDATION_ERROR');
    }

    expect(
      (await request(instance).get('/api/v1/company/settings').set('Cookie', cookie)).body
        .standardWorkMinutes,
    ).toBe(480);
  });

  it('로그인하지 않으면 401, CSRF 헤더가 없으면 쓰기는 403', async () => {
    const instance = app();
    const cookie = await signedUp(instance);

    expect((await request(instance).get('/api/v1/company/settings')).status).toBe(401);
    expect(
      (
        await request(instance)
          .put('/api/v1/company/settings')
          .set('Cookie', cookie)
          .send({ standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'RATIO' })
      ).status,
    ).toBe(403);
  });
});
