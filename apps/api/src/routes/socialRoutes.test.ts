import { errorResponseSchema, socialMethodsResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { createEmailVerificationService } from '../auth/emailVerification';
import { createSocialService } from '../auth/socialService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createPrismaInvitationStore } from '../invitation/invitationStore';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createMemoryQueue } from '../queue/jobQueue';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';
import { chooseSocialProviders, signFakeCode } from '../social/provider';

const SECRET = 'social-secret-social-secret-social-secret';
const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'Correct-horse-2026!';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

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

// 가짜 제공자의 시연용 계정은 개수가 한정되어 테스트마다 연동을 비워 서로 영향이 없게 함
beforeEach(async () => {
  await db.ownerPool.query('DELETE FROM social_accounts');
});

afterAll(async () => {
  await db.stop();
});

const buildApp = (nodeEnv: 'development' | 'production' = 'development') => {
  const choices = chooseSocialProviders({
    nodeEnv,
    appOrigin: ORIGIN,
    keys: {},
    fakeSecret: SECRET,
  });

  return createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    invitationStore: createPrismaInvitationStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    emailVerification: createEmailVerificationService({
      auth: db.auth,
      queue: createMemoryQueue().queue,
      mailer: { send: async () => {} },
      secret: SECRET,
    }),
    social: {
      choices,
      service: createSocialService({ auth: db.auth }),
      cookieSecret: SECRET,
      fakeSecret: choices.kakao.kind === 'fake' ? SECRET : undefined,
    },
    appOrigin: ORIGIN,
  });
};

type Browser = ReturnType<typeof request.agent>;

const write = (browser: Browser, method: 'post' | 'delete', path: string) =>
  browser[method](path).set(CSRF_HEADER, CSRF_HEADER_VALUE);

const hasSession = (res: request.Response) =>
  ((res.headers['set-cookie'] as unknown as string[] | undefined) ?? []).some(
    (cookie) =>
      cookie.startsWith(`${SESSION_COOKIE}=`) && !cookie.startsWith(`${SESSION_COOKIE}=;`),
  );

const stateOf = (url: string) => new URL(url).searchParams.get('state')!;

let sequence = 0;

// 아이디·비밀번호로 가입하고 로그인한 브라우저
const loggedInBrowser = async (app: ReturnType<typeof buildApp>, email?: string) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `소셜라우트${sequence}`,
    adminName: '관리자',
    operator: 'test',
  });
  const browser = request.agent(app);
  const signupEmail = email ?? `route-social${sequence}@example.com`;

  await write(browser, 'post', '/api/v1/auth/signup').send({
    inviteToken: invitation.token,
    loginId: `route-social-${sequence}`,
    password: PASSWORD,
    email: signupEmail,
    isAgeConfirmed: true,
    consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
  });

  return {
    browser,
    loginId: `route-social-${sequence}`,
    email: signupEmail,
    companyId: invitation.companyId,
  };
};

const startLogin = async (browser: Browser) =>
  stateOf(
    (await write(browser, 'post', '/api/v1/auth/kakao/start').send({ purpose: 'login' })).body.url,
  );

const callback = (browser: Browser, state: string, key: string) =>
  browser.get('/api/v1/auth/kakao/callback').query({ code: signFakeCode(SECRET, key), state });

// 카카오에 연동하고 연동 직후 상태를 돌려줌
const linkKakao = async (browser: Browser, key: string) => {
  const start = await write(browser, 'post', '/api/v1/me/social/kakao/start').send();

  return callback(browser, stateOf(start.body.url), key);
};

describe('제공자 설정', () => {
  it('개발 환경에서는 가짜 제공자로 켜지고, 가짜 로그인 화면이 열린다', async () => {
    const app = buildApp('development');

    expect((await request(app).get('/api/v1/auth/social/providers')).body).toEqual({
      kakao: true,
      naver: true,
      google: true,
    });

    const page = await request(app)
      .get('/api/v1/dev/fake-social/kakao/authorize')
      .query({ state: 'abc' });

    expect(page.status).toBe(200);
    expect(page.text).toContain('가짜 카카오 로그인');
    expect(page.text).toContain('/api/v1/auth/kakao/callback');
  });

  it('운영 환경에서 카카오 키가 없으면 꺼지고 가짜 로그인 화면도 존재하지 않는다', async () => {
    const app = buildApp('production');

    expect((await request(app).get('/api/v1/auth/social/providers')).body).toEqual({
      kakao: false,
      naver: false,
      google: false,
    });
    expect((await request(app).get('/api/v1/dev/fake-social/kakao/authorize')).status).toBe(404);

    const start = await request(app)
      .post('/api/v1/auth/kakao/start')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .send({ purpose: 'login' });

    expect(start.status).toBe(501);
  });

  it('가짜 로그인 화면은 state를 이스케이프해 출력한다', async () => {
    const page = await request(buildApp())
      .get('/api/v1/dev/fake-social/kakao/authorize')
      .query({ state: '"><script>x</script>' });

    expect(page.text).not.toContain('<script>x</script>');
  });
});

describe('소셜 로그인', () => {
  it('연동된 카카오 계정으로 로그인하면 세션이 만들어지고 홈으로 이동한다', async () => {
    const app = buildApp();
    const { browser, companyId } = await loggedInBrowser(app);

    // 이메일 인증을 마친 계정
    await db.owner.user.updateMany({
      where: { companyId },
      data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
    });

    await linkKakao(browser, 'hanbit');

    const fresh = request.agent(app);
    const res = await callback(fresh, await startLogin(fresh), 'hanbit');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${ORIGIN}/`);
    expect(hasSession(res)).toBe(true);
    expect((await fresh.get('/api/v1/me')).status).toBe(200);
  });

  it('연동되지 않은 카카오 계정은 가입 불가로 안내하고 세션을 만들지 않는다', async () => {
    const app = buildApp();
    const browser = request.agent(app);
    const res = await callback(browser, await startLogin(browser), 'other');

    expect(res.headers.location).toBe(`${ORIGIN}/login?social=not-linked`);
    expect(hasSession(res)).toBe(false);
  });

  it('카카오가 같은 이메일을 인증해 줘도 연동하지 않았다면 그 이메일의 계정으로 로그인되지 않는다', async () => {
    const app = buildApp();

    // 가짜 'hanbit' 카카오 계정의 인증 이메일과 같은 이메일로 가입한 일반 계정
    await loggedInBrowser(app, 'hanbit@example.com');

    const browser = request.agent(app);
    const res = await callback(browser, await startLogin(browser), 'hanbit');

    expect(res.headers.location).toBe(`${ORIGIN}/login?social=not-linked`);
    expect(hasSession(res)).toBe(false);
  });

  it('이메일 인증 전 계정은 로그인 후 인증 화면으로 이동한다', async () => {
    const app = buildApp();
    const { browser } = await loggedInBrowser(app);

    await linkKakao(browser, 'hanbit');

    const fresh = request.agent(app);
    const res = await callback(fresh, await startLogin(fresh), 'hanbit');

    // 일반 가입 직후 계정은 이메일 인증 전
    expect(res.headers.location).toBe(`${ORIGIN}/verify-email`);
  });

  it('동의하지 않고 취소하면 로그인 화면으로 돌아간다', async () => {
    const browser = request.agent(buildApp());
    const state = await startLogin(browser);
    const res = await browser
      .get('/api/v1/auth/kakao/callback')
      .query({ error: 'access_denied', state });

    expect(res.headers.location).toBe(`${ORIGIN}/login?social=cancelled`);
  });
});

describe('콜백 보안', () => {
  it('진행 상태 쿠키가 없거나 state가 다르면 아무 처리도 하지 않는다', async () => {
    const app = buildApp();
    const noCookie = await request(app)
      .get('/api/v1/auth/kakao/callback')
      .query({ code: signFakeCode(SECRET, 'hanbit'), state: 'forged' });

    expect(noCookie.headers.location).toBe(`${ORIGIN}/login?social=failed`);

    const browser = request.agent(app);

    await startLogin(browser);

    const wrongState = await callback(browser, 'another-state', 'hanbit');

    expect(wrongState.headers.location).toBe(`${ORIGIN}/login?social=failed`);
    expect(hasSession(wrongState)).toBe(false);
  });

  it('한 번 쓴 진행 상태는 다시 쓸 수 없다', async () => {
    const app = buildApp();
    const { browser } = await loggedInBrowser(app);

    await linkKakao(browser, 'hanbit');

    const fresh = request.agent(app);
    const state = await startLogin(fresh);

    await callback(fresh, state, 'hanbit');

    expect((await callback(fresh, state, 'hanbit')).headers.location).toBe(
      `${ORIGIN}/login?social=failed`,
    );
  });

  it('위조된 인가 코드는 거부한다', async () => {
    const browser = request.agent(buildApp());
    const state = await startLogin(browser);
    const res = await browser
      .get('/api/v1/auth/kakao/callback')
      .query({ code: 'hanbit.forged', state });

    expect(res.headers.location).toBe(`${ORIGIN}/login?social=failed`);
    expect(hasSession(res)).toBe(false);
  });

  it('연동을 시작한 사용자와 돌아온 사용자가 다르면 연동하지 않는다', async () => {
    const app = buildApp();
    const a = await loggedInBrowser(app);
    const b = await loggedInBrowser(app);
    const start = await write(a.browser, 'post', '/api/v1/me/social/kakao/start').send();
    const state = stateOf(start.body.url);

    // A가 시작한 진행 상태 쿠키를 가진 채 B로 로그인한 상황
    await write(a.browser, 'post', '/api/v1/auth/logout').send();
    await write(a.browser, 'post', '/api/v1/auth/login').send({
      loginId: b.loginId,
      password: PASSWORD,
    });

    const res = await callback(a.browser, state, 'hanbit');

    expect(res.headers.location).toBe(`${ORIGIN}/settings?social=failed`);
    expect(await db.owner.socialAccount.count()).toBe(0);
  });

  it('로그인하지 않은 상태에서 연동 콜백이 오면 연동하지 않는다', async () => {
    const app = buildApp();
    const { browser } = await loggedInBrowser(app);
    const start = await write(browser, 'post', '/api/v1/me/social/kakao/start').send();

    await write(browser, 'post', '/api/v1/auth/logout').send();

    const res = await callback(browser, stateOf(start.body.url), 'hanbit');

    expect(res.headers.location).toBe(`${ORIGIN}/settings?social=failed`);
    expect(await db.owner.socialAccount.count()).toBe(0);
  });
});

describe('연동과 해제 (로그인 상태)', () => {
  it('연동하면 연동 상태로 표시되고, 해제하면 다시 로그인할 수 없다', async () => {
    const app = buildApp();
    const { browser } = await loggedInBrowser(app);

    expect(
      socialMethodsResponseSchema.parse((await browser.get('/api/v1/me/social')).body),
    ).toEqual({
      hasPassword: true,
      kakao: { isLinked: false },
      naver: { isLinked: false },
      google: { isLinked: false },
    });

    const linked = await linkKakao(browser, 'hanbit');

    expect(linked.headers.location).toBe(`${ORIGIN}/settings?social=linked`);
    expect((await browser.get('/api/v1/me/social')).body.kakao.isLinked).toBe(true);

    expect((await write(browser, 'delete', '/api/v1/me/social/kakao').send()).status).toBe(200);
    expect((await browser.get('/api/v1/me/social')).body.kakao.isLinked).toBe(false);

    const fresh = request.agent(app);

    expect((await callback(fresh, await startLogin(fresh), 'hanbit')).headers.location).toBe(
      `${ORIGIN}/login?social=not-linked`,
    );
  });

  it('이미 다른 계정에 연동된 카카오 계정은 연동할 수 없다', async () => {
    const app = buildApp();
    const a = await loggedInBrowser(app);
    const b = await loggedInBrowser(app);

    await linkKakao(a.browser, 'hanbit');

    expect((await linkKakao(b.browser, 'hanbit')).headers.location).toBe(
      `${ORIGIN}/settings?social=already-linked`,
    );
  });

  it('비밀번호 로그인이 없는 계정은 마지막 수단이라 해제할 수 없다 (409)', async () => {
    const app = buildApp();
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '소셜전용라우트',
      adminName: '전용',
      operator: 'test',
    });
    const browser = request.agent(app);

    await write(browser, 'post', '/api/v1/auth/kakao/start')
      .send({
        purpose: 'signup',
        inviteToken: invitation.token,
        isAgeConfirmed: true,
        consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
      })
      .then((res) => callback(browser, stateOf(res.body.url), 'other'));

    const res = await write(browser, 'delete', '/api/v1/me/social/kakao').send();

    expect(res.status).toBe(409);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('LAST_LOGIN_METHOD');
    expect((await browser.get('/api/v1/me/social')).body).toEqual({
      hasPassword: false,
      kakao: { isLinked: true },
      naver: { isLinked: false },
      google: { isLinked: false },
    });
  });

  it('로그인하지 않으면 연동 상태 조회·시작·해제 모두 401', async () => {
    const app = buildApp();

    expect((await request(app).get('/api/v1/me/social')).status).toBe(401);
    expect(
      (await request(app).post('/api/v1/me/social/kakao/start').set(CSRF_HEADER, CSRF_HEADER_VALUE))
        .status,
    ).toBe(401);
    expect(
      (await request(app).delete('/api/v1/me/social/kakao').set(CSRF_HEADER, CSRF_HEADER_VALUE))
        .status,
    ).toBe(401);
  });
});

describe('초대 링크로 카카오 가입', () => {
  const startSignup = (
    browser: Browser,
    token: string,
    consentsOverride?: { documentId: string; isAgreed: boolean }[],
  ) =>
    write(browser, 'post', '/api/v1/auth/kakao/start').send({
      purpose: 'signup',
      inviteToken: token,
      isAgeConfirmed: true,
      consents:
        consentsOverride ?? documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  it('인증된 이메일을 가진 카카오 계정으로 가입하면 바로 활성 계정이 되고 링크는 폐기된다', async () => {
    const app = buildApp();
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '카카오가입',
      adminName: '가입자',
      operator: 'test',
    });
    const browser = request.agent(app);
    const res = await callback(
      browser,
      stateOf((await startSignup(browser, invitation.token)).body.url),
      'new-verified',
    );

    expect(res.headers.location).toBe(`${ORIGIN}/`);
    expect(hasSession(res)).toBe(true);
    expect((await browser.get('/api/v1/me')).body).toMatchObject({
      companyName: '카카오가입',
      email: 'social-new@example.com',
      isEmailVerified: true,
    });
    expect((await request(app).get(`/api/v1/invitations/${invitation.token}`)).status).toBe(404);

    // 같은 카카오 계정으로 다음 로그인도 가능
    const next = request.agent(app);

    expect((await callback(next, await startLogin(next), 'new-verified')).headers.location).toBe(
      `${ORIGIN}/`,
    );
  });

  it('인증된 이메일이 없는 소셜 계정도 가입되어 이메일 등록 화면으로 이동하고, 이메일·비밀번호를 설정할 수 있다', async () => {
    const app = buildApp();
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '이메일없는가입',
      adminName: '가입자',
      operator: 'test',
    });
    const browser = request.agent(app);
    const res = await callback(
      browser,
      stateOf((await startSignup(browser, invitation.token)).body.url),
      'new-unverified',
    );

    expect(res.headers.location).toBe(`${ORIGIN}/verify-email`);
    expect(hasSession(res)).toBe(true);
    expect((await request(app).get(`/api/v1/invitations/${invitation.token}`)).status).toBe(404);

    const me = (await browser.get('/api/v1/me')).body;

    expect(me).toMatchObject({ email: null, isEmailVerified: false });

    // 비밀번호가 없는 계정이라 이메일 등록에 현재 비밀번호를 요구하지 않음
    const emailRequest = await write(browser, 'post', '/api/v1/me/email/change').send({
      newEmail: 'registered@example.com',
    });

    expect(emailRequest.status).toBe(200);

    // 아이디·비밀번호 설정 후에는 로그인할 수 있고 이메일 변경에 비밀번호가 필요
    const set = await write(browser, 'post', '/api/v1/me/password/set').send({
      loginId: 'social-set-1',
      newPassword: PASSWORD,
    });

    expect(set.status).toBe(200);
    expect(
      (
        await write(request.agent(app), 'post', '/api/v1/auth/login').send({
          loginId: 'social-set-1',
          password: PASSWORD,
        })
      ).status,
    ).toBe(200);
    const noPassword = await write(browser, 'post', '/api/v1/me/email/change').send({
      newEmail: 'another@example.com',
    });

    expect(noPassword.status).toBe(400);
    expect(errorResponseSchema.parse(noPassword.body).error.code).toBe('CURRENT_PASSWORD_INVALID');

    // 이미 설정했으면 다시 설정할 수 없고, 다른 사람이 쓰는 아이디도 거부
    const again = await write(browser, 'post', '/api/v1/me/password/set').send({
      loginId: 'social-set-2',
      newPassword: PASSWORD,
    });

    expect(again.status).toBe(400);
  });

  it('이미 쓰는 아이디로는 비밀번호 로그인을 설정할 수 없다', async () => {
    const app = buildApp();
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '아이디중복',
      adminName: '가입자',
      operator: 'test',
    });
    const browser = request.agent(app);

    await callback(
      browser,
      stateOf((await startSignup(browser, invitation.token)).body.url),
      'new-unverified',
    );
    await loggedInBrowser(app);

    const res = await write(browser, 'post', '/api/v1/me/password/set').send({
      loginId: `route-social-${sequence}`,
      newPassword: PASSWORD,
    });

    expect(res.status).toBe(409);
  });

  it('없는 초대 링크는 카카오 화면으로 보내기 전에 404로 알린다', async () => {
    const res = await startSignup(request.agent(buildApp()), 'unknown-token-0000');

    expect(res.status).toBe(404);
  });

  it('필수 약관에 동의하지 않으면 가입되지 않고 링크가 남는다', async () => {
    const app = buildApp();
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '미동의가입',
      adminName: '가입자',
      operator: 'test',
    });
    const browser = request.agent(app);
    const res = await callback(
      browser,
      stateOf(
        (
          await startSignup(browser, invitation.token, [
            { documentId: documentIds[0]!, isAgreed: true },
          ])
        ).body.url,
      ),
      'new-verified',
    );

    expect(res.headers.location).toBe(`${ORIGIN}/invite/${invitation.token}?social=failed`);
    expect((await request(app).get(`/api/v1/invitations/${invitation.token}`)).status).toBe(200);
  });

  it('만 14세 확인이 없으면 시작할 수 없다', async () => {
    const app = buildApp();
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '미확인가입',
      adminName: '가입자',
      operator: 'test',
    });
    const res = await write(request.agent(app), 'post', '/api/v1/auth/kakao/start').send({
      purpose: 'signup',
      inviteToken: invitation.token,
      isAgeConfirmed: false,
      consents: [],
    });

    expect(res.status).toBe(400);
  });
});

describe('네이버·구글', () => {
  const startOf = (browser: Browser, provider: string) =>
    write(browser, 'post', `/api/v1/me/social/${provider}/start`).send();

  it.each(['naver', 'google'] as const)(
    '%s 계정을 연동하면 그 제공자로만 로그인되고 다른 제공자와 섞이지 않는다',
    async (provider) => {
      const app = buildApp();
      const { browser, companyId } = await loggedInBrowser(app);

      await db.owner.user.updateMany({
        where: { companyId },
        data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
      });

      const start = await startOf(browser, provider);

      expect(start.status).toBe(200);
      expect(start.body.url).toContain(`/api/v1/dev/fake-social/${provider}/authorize`);

      const linked = await browser
        .get(`/api/v1/auth/${provider}/callback`)
        .query({ code: signFakeCode(SECRET, 'hanbit'), state: stateOf(start.body.url) });

      expect(linked.headers.location).toBe(`${ORIGIN}/settings?social=linked`);

      const methods = (await browser.get('/api/v1/me/social')).body;

      expect(methods[provider].isLinked).toBe(true);
      expect(methods.kakao.isLinked).toBe(false);

      // 같은 번호 체계가 아니므로 카카오 로그인으로는 들어오지 못함
      const kakao = request.agent(app);
      const kakaoRes = await callback(kakao, await startLogin(kakao), 'hanbit');

      expect(kakaoRes.headers.location).toBe(`${ORIGIN}/login?social=not-linked`);

      const fresh = request.agent(app);
      const startRes = await write(fresh, 'post', `/api/v1/auth/${provider}/start`).send({
        purpose: 'login',
      });
      const res = await fresh
        .get(`/api/v1/auth/${provider}/callback`)
        .query({ code: signFakeCode(SECRET, 'hanbit'), state: stateOf(startRes.body.url) });

      expect(res.headers.location).toBe(`${ORIGIN}/`);
      expect(hasSession(res)).toBe(true);

      expect((await write(browser, 'delete', `/api/v1/me/social/${provider}`).send()).status).toBe(
        200,
      );
    },
  );

  it('다른 제공자로 시작한 진행 상태는 다른 제공자의 콜백으로 이어갈 수 없다', async () => {
    const app = buildApp();
    const browser = request.agent(app);
    const start = await write(browser, 'post', '/api/v1/auth/naver/start').send({
      purpose: 'login',
    });
    const res = await browser
      .get('/api/v1/auth/google/callback')
      .query({ code: signFakeCode(SECRET, 'hanbit'), state: stateOf(start.body.url) });

    expect(res.headers.location).toBe(`${ORIGIN}/login?social=failed`);
    expect(hasSession(res)).toBe(false);
  });

  it('모르는 제공자 이름은 거부한다', async () => {
    const res = await write(request.agent(buildApp()), 'post', '/api/v1/auth/facebook/start').send({
      purpose: 'login',
    });

    expect(res.status).toBe(400);
  });

  it('운영에서 키가 없는 네이버·구글은 시작할 수 없다', async () => {
    const res = await write(
      request.agent(buildApp('production')),
      'post',
      '/api/v1/auth/google/start',
    ).send({
      purpose: 'login',
    });

    expect(res.status).toBe(501);
  });
});
