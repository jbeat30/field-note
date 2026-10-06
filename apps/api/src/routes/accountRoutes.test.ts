import {
  errorResponseSchema,
  invitationResponseSchema,
  meResponseSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { MAX_FAILED_LOGINS } from '../auth/loginPolicy';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createPrismaInvitationStore } from '../invitation/invitationStore';
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
      ('PRIVACY_POLICY', '2026-10-01', '2026-10-01', 'h2', true),
      ('MARKETING', '2026-10-01', '2026-10-01', 'h3', false)
     RETURNING id`,
  );

  documentIds = rows.map((row) => row.id);
});

afterAll(async () => {
  await db.stop();
});

const buildApp = (isSecureCookie = false) =>
  createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    invitationStore: createPrismaInvitationStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    appOrigin: 'http://localhost:5173',
    isSecureCookie,
  });

const post = (app: ReturnType<typeof buildApp>, path: string) =>
  request(app).post(path).set(CSRF_HEADER, CSRF_HEADER_VALUE);

let sequence = 0;

const signupBody = (token: string, overrides: Record<string, unknown> = {}) => ({
  inviteToken: token,
  loginId: `route-user-${(sequence += 1)}`,
  password: 'Correct-horse-2026!',
  email: `route-user-${sequence}@example.com`,
  isAgeConfirmed: true,
  consents: documentIds.map((documentId, index) => ({ documentId, isAgreed: index < 2 })),
  ...overrides,
});

const cookieOf = (res: request.Response) => {
  const header = (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((cookie) =>
    cookie.startsWith(`${SESSION_COOKIE}=`),
  );

  return header;
};

const newInvitation = (name = `라우트회사${(sequence += 1)}`) =>
  createCompanyWithInvitation(db.operator, {
    companyName: name,
    adminName: '홍길동',
    operator: 'test',
  });

describe('초대 → 가입 → 로그인 전 구간', () => {
  it('초대 확인 → 가입 → 내 정보 → 로그아웃 → 로그인', async () => {
    const app = buildApp();
    const invitation = await newInvitation('전구간설비');

    // 1) 초대 확인: 회사·관리자 이름과 약관
    const info = await request(app).get(`/api/v1/invitations/${invitation.token}`);

    expect(invitationResponseSchema.parse(info.body).companyName).toBe('전구간설비');

    // 2) 가입: 세션 쿠키 발급 (HttpOnly, SameSite=Lax), 이메일 인증 전 상태
    const body = signupBody(invitation.token);
    const signup = await post(app, '/api/v1/auth/signup').send(body);
    const cookie = cookieOf(signup)!;

    expect(signup.status).toBe(201);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(signup.body).toEqual({ email: body.email, resendAfterSeconds: 30 });

    // 3) 가입 직후 세션으로 내 정보 조회: 인증 전, 식별값 없음
    const me = await request(app).get('/api/v1/me').set('Cookie', cookie);

    expect(meResponseSchema.parse(me.body)).toMatchObject({
      companyName: '전구간설비',
      email: body.email,
      isEmailVerified: false,
    });
    expect(JSON.stringify(me.body)).not.toContain(invitation.companyId);

    // 4) 로그아웃 후 같은 쿠키는 무효
    expect((await post(app, '/api/v1/auth/logout').set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).get('/api/v1/me').set('Cookie', cookie)).status).toBe(401);

    // 5) 아이디 대소문자와 공백이 달라도 로그인
    const login = await post(app, '/api/v1/auth/login').send({
      loginId: ` ${body.loginId.toUpperCase()} `,
      password: body.password,
    });

    expect(login.status).toBe(200);
    expect(meResponseSchema.parse(login.body).companyName).toBe('전구간설비');
    expect((await request(app).get('/api/v1/me').set('Cookie', cookieOf(login)!)).status).toBe(200);
  });

  it('쓴 링크로 다시 가입하면 없는 링크와 같은 404', async () => {
    const app = buildApp();
    const invitation = await newInvitation();

    await post(app, '/api/v1/auth/signup').send(signupBody(invitation.token));

    const reuse = await post(app, '/api/v1/auth/signup').send(signupBody(invitation.token));
    const unknown = await post(app, '/api/v1/auth/signup').send(signupBody('unknown-token-0000'));

    expect(reuse.status).toBe(404);
    expect(reuse.body).toEqual(unknown.body);
    expect(errorResponseSchema.parse(reuse.body).error.code).toBe('NOT_FOUND');
  });

  it('필수 약관 미동의는 400, 아이디 중복은 409', async () => {
    const app = buildApp();
    const first = await newInvitation();
    const firstBody = signupBody(first.token);

    await post(app, '/api/v1/auth/signup').send(firstBody);

    const second = await newInvitation();
    const noConsent = await post(app, '/api/v1/auth/signup').send(
      signupBody(second.token, { consents: [{ documentId: documentIds[0], isAgreed: true }] }),
    );
    const taken = await post(app, '/api/v1/auth/signup').send(
      signupBody(second.token, { loginId: firstBody.loginId }),
    );

    expect(noConsent.status).toBe(400);
    expect(errorResponseSchema.parse(noConsent.body).error.details?.[0]?.path).toBe(
      'body.consents',
    );
    expect(taken.status).toBe(409);
    expect(errorResponseSchema.parse(taken.body).error.code).toBe('LOGIN_ID_TAKEN');
  });

  it('만 14세 확인이 없으면 가입할 수 없다', async () => {
    const invitation = await newInvitation();
    const res = await post(buildApp(), '/api/v1/auth/signup').send(
      signupBody(invitation.token, { isAgeConfirmed: false }),
    );

    expect(res.status).toBe(400);
    expect(await createPrismaInvitationStore(db.auth).find(invitation.token)).not.toBeNull();
  });
});

describe('로그인', () => {
  const registerAccount = async (app: ReturnType<typeof buildApp>) => {
    const invitation = await newInvitation();
    const body = signupBody(invitation.token);

    await post(app, '/api/v1/auth/signup').send(body);

    return body;
  };

  it('로그인 유지를 선택하면 만료 시각이 있는 쿠키, 선택하지 않으면 브라우저를 닫으면 사라지는 쿠키', async () => {
    const app = buildApp();
    const body = await registerAccount(app);
    const remembered = await post(app, '/api/v1/auth/login').send({
      loginId: body.loginId,
      password: body.password,
      isRemembered: true,
    });
    const temporary = await post(app, '/api/v1/auth/login').send({
      loginId: body.loginId,
      password: body.password,
      isRemembered: false,
    });

    expect(cookieOf(remembered)).toMatch(/Expires=/);
    expect(cookieOf(temporary)).not.toMatch(/Expires=|Max-Age=/);
  });

  it('운영 설정에서는 Secure 쿠키', async () => {
    const app = buildApp(true);
    const body = await registerAccount(app);
    const res = await post(app, '/api/v1/auth/login').send({
      loginId: body.loginId,
      password: body.password,
    });

    expect(cookieOf(res)).toContain('Secure');
  });

  it('틀린 비밀번호와 없는 아이디는 같은 401이고 쿠키를 주지 않는다', async () => {
    const app = buildApp();
    const body = await registerAccount(app);
    const wrong = await post(app, '/api/v1/auth/login').send({
      loginId: body.loginId,
      password: 'wrong-password-1',
    });
    const unknown = await post(app, '/api/v1/auth/login').send({
      loginId: 'nobody-here',
      password: 'wrong-password-1',
    });

    expect(wrong.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(cookieOf(wrong)).toBeUndefined();
  });

  it(`연속 ${MAX_FAILED_LOGINS}번 실패하면 423으로 잠기고 맞는 비밀번호도 거부한다`, async () => {
    const app = buildApp();
    const body = await registerAccount(app);
    let last = 0;

    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      last = (
        await post(app, '/api/v1/auth/login').send({
          loginId: body.loginId,
          password: 'wrong-password-1',
        })
      ).status;
    }

    const rightPassword = await post(app, '/api/v1/auth/login').send({
      loginId: body.loginId,
      password: body.password,
    });

    expect(last).toBe(423);
    expect(rightPassword.status).toBe(423);
    expect(errorResponseSchema.parse(rightPassword.body).error.code).toBe('ACCOUNT_LOCKED');
    expect(cookieOf(rightPassword)).toBeUndefined();
  });

  it('입력 검증과 CSRF 헤더는 로그인에도 적용된다', async () => {
    const app = buildApp();

    expect((await post(app, '/api/v1/auth/login').send({ loginId: '', password: '' })).status).toBe(
      400,
    );
    expect(
      (await request(app).post('/api/v1/auth/login').send({ loginId: 'a', password: 'b' })).status,
    ).toBe(403);
  });
});

describe('회사 격리', () => {
  it('두 회사 관리자는 각자 자기 정보만 본다', async () => {
    const app = buildApp();
    const [a, b] = [await newInvitation('격리A'), await newInvitation('격리B')];
    const bodyA = signupBody(a.token);
    const bodyB = signupBody(b.token);
    const cookieA = cookieOf(await post(app, '/api/v1/auth/signup').send(bodyA))!;
    const cookieB = cookieOf(await post(app, '/api/v1/auth/signup').send(bodyB))!;

    const meA = await request(app).get('/api/v1/me').set('Cookie', cookieA);
    const meB = await request(app).get('/api/v1/me').set('Cookie', cookieB);

    expect(meA.body).toMatchObject({ companyName: '격리A', email: bodyA.email });
    expect(meB.body).toMatchObject({ companyName: '격리B', email: bodyB.email });
  });
});
