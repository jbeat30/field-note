import { devicesResponseSchema, errorResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(180_000);

const UA_CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const UA_SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const PASSWORD = 'Correct-horse-2026!';

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
    appOrigin: 'http://localhost:5173',
  });

const post = (instance: ReturnType<typeof app>, path: string) =>
  request(instance).post(path).set(CSRF_HEADER, CSRF_HEADER_VALUE);

const cookieOf = (res: request.Response) =>
  (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;

let sequence = 0;

const register = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `기기회사${sequence}`,
    adminName: '기기관리자',
    operator: 'test',
  });
  const loginId = `device-user-${sequence}`;
  const signup = await post(instance, '/api/v1/auth/signup')
    .set('User-Agent', UA_CHROME_MAC)
    .send({
      inviteToken: invitation.token,
      loginId,
      password: PASSWORD,
      email: `device${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return { loginId, signupCookie: cookieOf(signup) };
};

const loginFrom = (instance: ReturnType<typeof app>, loginId: string, userAgent: string) =>
  post(instance, '/api/v1/auth/login')
    .set('User-Agent', userAgent)
    .send({ loginId, password: PASSWORD });

const devicesOf = async (instance: ReturnType<typeof app>, cookie: string) =>
  devicesResponseSchema.parse(
    (await request(instance).get('/api/v1/me/devices').set('Cookie', cookie)).body,
  ).devices;

describe('로그인 기기 목록과 원격 로그아웃', () => {
  it('가입·로그인한 기기가 이름과 함께 목록에 보이고 현재 기기가 표시된다', async () => {
    const instance = app();
    const { loginId, signupCookie } = await register(instance);
    const phone = cookieOf(await loginFrom(instance, loginId, UA_SAFARI_IPHONE));

    const fromPhone = await devicesOf(instance, phone);

    expect(fromPhone.map((device) => device.label).sort()).toEqual([
      'Chrome · macOS',
      'Safari · iPhone',
    ]);
    expect(fromPhone.find((device) => device.isCurrent)?.label).toBe('Safari · iPhone');
    expect(
      (await devicesOf(instance, signupCookie)).find((device) => device.isCurrent)?.label,
    ).toBe('Chrome · macOS');
  });

  it('응답에 토큰·해시·접속 원문이 없다', async () => {
    const instance = app();
    const { loginId, signupCookie } = await register(instance);
    const res = await request(instance).get('/api/v1/me/devices').set('Cookie', signupCookie);
    const token = signupCookie.split(';')[0]!.split('=')[1]!;

    await loginFrom(instance, loginId, UA_SAFARI_IPHONE);

    expect(JSON.stringify(res.body)).not.toContain(token);
    expect(JSON.stringify(res.body)).not.toContain('Mozilla');
  });

  it('다른 기기를 원격 로그아웃하면 그 기기만 로그아웃된다', async () => {
    const instance = app();
    const { loginId, signupCookie } = await register(instance);
    const phone = cookieOf(await loginFrom(instance, loginId, UA_SAFARI_IPHONE));
    const target = (await devicesOf(instance, signupCookie)).find((device) => !device.isCurrent)!;

    const res = await request(instance)
      .delete(`/api/v1/me/devices/${target.id}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', signupCookie);

    expect(res.status).toBe(200);
    expect((await request(instance).get('/api/v1/me').set('Cookie', phone)).status).toBe(401);
    expect((await request(instance).get('/api/v1/me').set('Cookie', signupCookie)).status).toBe(
      200,
    );
    expect(await devicesOf(instance, signupCookie)).toHaveLength(1);
  });

  it('현재 기기와 없는 기기는 원격 로그아웃할 수 없다 (같은 404)', async () => {
    const instance = app();
    const { signupCookie } = await register(instance);
    const [current] = await devicesOf(instance, signupCookie);
    const remove = (id: string) =>
      request(instance)
        .delete(`/api/v1/me/devices/${id}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .set('Cookie', signupCookie);
    const self = await remove(current!.id);
    const unknown = await remove('0198f000-0000-7000-8000-000000000000');

    expect(self.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(self.body).toEqual(unknown.body);
    expect(errorResponseSchema.parse(self.body).error.code).toBe('NOT_FOUND');
    expect((await request(instance).get('/api/v1/me').set('Cookie', signupCookie)).status).toBe(
      200,
    );
  });

  it('다른 회사 사용자의 기기는 식별자를 알아도 로그아웃할 수 없다', async () => {
    const instance = app();
    const a = await register(instance);
    const b = await register(instance);
    const [deviceOfB] = await devicesOf(instance, b.signupCookie);
    const res = await request(instance)
      .delete(`/api/v1/me/devices/${deviceOfB!.id}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', a.signupCookie);

    expect(res.status).toBe(404);
    expect((await request(instance).get('/api/v1/me').set('Cookie', b.signupCookie)).status).toBe(
      200,
    );
    // 목록에도 다른 회사의 기기는 나오지 않음
    expect(await devicesOf(instance, a.signupCookie)).toHaveLength(1);
  });

  it('로그인하지 않으면 목록·원격 로그아웃 모두 401이고 쓰기에는 CSRF 헤더가 필요하다', async () => {
    const instance = app();
    const { signupCookie } = await register(instance);
    const [device] = await devicesOf(instance, signupCookie);

    expect((await request(instance).get('/api/v1/me/devices')).status).toBe(401);
    expect(
      (
        await request(instance)
          .delete(`/api/v1/me/devices/${device!.id}`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      ).status,
    ).toBe(401);
    expect(
      (
        await request(instance)
          .delete(`/api/v1/me/devices/${device!.id}`)
          .set('Cookie', signupCookie)
      ).status,
    ).toBe(403);
  });

  it('로그아웃하면 그 기기가 목록에서 사라진다', async () => {
    const instance = app();
    const { loginId, signupCookie } = await register(instance);
    const phone = cookieOf(await loginFrom(instance, loginId, UA_SAFARI_IPHONE));

    await post(instance, '/api/v1/auth/logout').set('Cookie', phone);

    expect(await devicesOf(instance, signupCookie)).toHaveLength(1);
  });
});
