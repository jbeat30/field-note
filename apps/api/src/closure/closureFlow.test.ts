import { closureResponseSchema, errorResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import {
  createEmailVerificationService,
  registerEmailVerificationWorker,
} from '../auth/emailVerification';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createSmtpMailer } from '../email/mailer';
import { createSecurityNotifier, registerSecurityNoticeWorker } from '../email/securityNotice';
import { startTestMailpit, type TestMailpit } from '../email/testMailpit';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createPrismaInvitationStore } from '../invitation/invitationStore';
import { createLogger } from '../logger';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPgBossQueue, type JobQueue } from '../queue/jobQueue';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

import { createClosureService, registerClosureWorker, CLOSURE_GRACE_MS } from './closureService';
import { purgeCompany } from './purgeService';

// 실제 구성 요소(PostgreSQL, pg-boss 큐, SMTP, Mailpit)로 해지 요청 → 로그인 차단 → 취소 → 복구와 삭제까지 검증
let db: TestDatabase;
let mailpit: TestMailpit;
let queue: JobQueue;
let documentIds: string[];
let app: Awaited<ReturnType<typeof buildApp>>;

jest.setTimeout(300_000);

const APP_ORIGIN = 'http://localhost:5173';
const PASSWORD = 'Closure-password-2026!';

const buildApp = async () => {
  const mailer = createSmtpMailer({
    host: mailpit.host,
    port: mailpit.smtpPort,
    from: 'no-reply@field-note.local',
  });
  const sessionStore = createPrismaSessionStore(db.auth);
  const accountService = createAccountService({ auth: db.auth, app: db.app });
  const emailVerification = createEmailVerificationService({
    auth: db.auth,
    queue,
    mailer,
    secret: 'e2e-secret-e2e-secret-e2e-secret-0000',
  });
  const notifier = createSecurityNotifier(queue);
  const closure = createClosureService({
    auth: db.auth,
    queue,
    mailer,
    accountService,
    notifier,
    appOrigin: APP_ORIGIN,
  });

  await registerEmailVerificationWorker(queue, emailVerification);
  await registerClosureWorker(queue, closure);
  await registerSecurityNoticeWorker(queue, mailer);

  return createApp({
    sessionStore,
    invitationStore: createPrismaInvitationStore(db.auth),
    accountService,
    emailVerification,
    closure,
    notifier,
    appOrigin: APP_ORIGIN,
  });
};

beforeAll(async () => {
  [db, mailpit] = await Promise.all([startTestDatabase(), startTestMailpit()]);

  const { rows } = await db.ownerPool.query<{ id: string }>(
    `INSERT INTO legal_documents (type, version, effective_at, content_hash, is_required) VALUES
      ('TERMS_OF_SERVICE', '2026-10-01', '2026-10-01', 'h1', true),
      ('PRIVACY_POLICY', '2026-10-01', '2026-10-01', 'h2', true)
     RETURNING id`,
  );

  documentIds = rows.map((row) => row.id);
  queue = await createPgBossQueue(db.queueUrl, createLogger('silent'));
  app = await buildApp();
});

afterAll(async () => {
  await queue?.stop();
  await Promise.all([db?.stop(), mailpit?.stop()]);
});

const post = (path: string, cookie?: string) => {
  const req = request(app).post(path).set(CSRF_HEADER, CSRF_HEADER_VALUE);

  return cookie ? req.set('Cookie', cookie) : req;
};

const cookieOf = (res: request.Response) =>
  (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;

let sequence = 0;

const register = async () => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `해지회사${sequence}`,
    adminName: '해지관리자',
    operator: 'test',
  });
  const email = `closureflow${sequence}@example.com`;
  const loginId = `closure-flow-${sequence}`;
  const signup = await post('/api/v1/auth/signup').send({
    inviteToken: invitation.token,
    loginId,
    password: PASSWORD,
    email,
    isAgeConfirmed: true,
    consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
  });

  return { email, loginId, cookie: cookieOf(signup), companyId: invitation.companyId };
};

// 해지 요청 메일에서 취소 토큰 추출
const cancelTokenFrom = async (email: string) => {
  const mail = (await mailpit.waitForCount(email, 2)).find((message) =>
    message.subject.includes('해지 요청'),
  );

  return /\/closure\/cancel\/([\w-]+)/.exec(mail?.text ?? '')?.[1] ?? '';
};

describe('계정 해지 (실제 구성 요소)', () => {
  it('요청하면 즉시 모든 기기가 로그아웃되고 로그인이 막히며 취소 링크로 복구된다', async () => {
    const user = await register();
    const secondDevice = cookieOf(
      await post('/api/v1/auth/login').send({ loginId: user.loginId, password: PASSWORD }),
    );

    const requested = await post('/api/v1/me/closure', user.cookie).send({
      currentPassword: PASSWORD,
    });

    expect(requested.status).toBe(200);
    expect(closureResponseSchema.parse(requested.body).purgeAfter).toBeDefined();

    // 모든 기기 로그아웃
    expect((await request(app).get('/api/v1/me').set('Cookie', user.cookie)).status).toBe(401);
    expect((await request(app).get('/api/v1/me').set('Cookie', secondDevice)).status).toBe(401);

    // 비밀번호가 맞으면 해지 중임을 알리고 막음, 틀리면 일반 실패
    const blocked = await post('/api/v1/auth/login').send({
      loginId: user.loginId,
      password: PASSWORD,
    });

    expect(blocked.status).toBe(403);
    expect(errorResponseSchema.parse(blocked.body).error.code).toBe('ACCOUNT_CLOSING');
    expect(blocked.headers['set-cookie']).toBeUndefined();
    expect(
      (
        await post('/api/v1/auth/login').send({
          loginId: user.loginId,
          password: 'Wrong-password-1!',
        })
      ).status,
    ).toBe(401);

    // 메일의 링크로 확인·취소
    const token = await cancelTokenFrom(user.email);

    expect(token).not.toBe('');
    expect((await request(app).get(`/api/v1/auth/closure/${token}`)).status).toBe(200);
    expect((await post('/api/v1/auth/closure/cancel').send({ token })).status).toBe(200);

    // 복구: 다시 로그인되고 링크는 폐기
    expect(
      (await post('/api/v1/auth/login').send({ loginId: user.loginId, password: PASSWORD })).status,
    ).toBe(200);
    expect((await request(app).get(`/api/v1/auth/closure/${token}`)).status).toBe(404);
    expect((await post('/api/v1/auth/closure/cancel').send({ token })).status).toBe(404);
  });

  it('비밀번호가 없거나 틀리면 해지 요청이 거부되고 계정은 그대로다', async () => {
    const user = await register();

    expect((await post('/api/v1/me/closure', user.cookie).send({})).status).toBe(400);

    const wrong = await post('/api/v1/me/closure', user.cookie).send({
      currentPassword: 'Wrong-password-1!',
    });

    expect(wrong.status).toBe(400);
    expect(errorResponseSchema.parse(wrong.body).error.code).toBe('CURRENT_PASSWORD_INVALID');
    expect((await request(app).get('/api/v1/me').set('Cookie', user.cookie)).status).toBe(200);
  });

  it('로그인 없이는 해지를 요청할 수 없다', async () => {
    expect((await post('/api/v1/me/closure').send({ currentPassword: PASSWORD })).status).toBe(401);
  });

  it('유예가 끝나면 삭제·익명화되고 같은 아이디로는 더 이상 로그인할 수 없다', async () => {
    const user = await register();

    await post('/api/v1/me/closure', user.cookie).send({ currentPassword: PASSWORD });

    const token = await cancelTokenFrom(user.email);

    await purgeCompany(
      db.purge,
      user.companyId,
      () => new Date(Date.now() + CLOSURE_GRACE_MS + 1000),
    );

    expect((await request(app).get(`/api/v1/auth/closure/${token}`)).status).toBe(404);
    expect((await post('/api/v1/auth/closure/cancel').send({ token })).status).toBe(404);
    expect(
      (await post('/api/v1/auth/login').send({ loginId: user.loginId, password: PASSWORD })).status,
    ).toBe(401);
  });
});
