import { errorResponseSchema, meResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import {
  createEmailVerificationService,
  registerEmailVerificationWorker,
} from '../auth/emailVerification';
import { createPasswordService, registerPasswordResetWorker } from '../auth/passwordService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createPrismaInvitationStore } from '../invitation/invitationStore';
import { createLogger } from '../logger';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPgBossQueue, type JobQueue } from '../queue/jobQueue';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

import { createSmtpMailer } from './mailer';
import { createSecurityNotifier, registerSecurityNoticeWorker } from './securityNotice';
import { startTestMailpit, type TestMailpit } from './testMailpit';

// 실제 구성 요소(PostgreSQL, pg-boss 큐, SMTP, Mailpit)로 비밀번호 재설정·변경과 이메일 변경을 끝까지 검증
let db: TestDatabase;
let mailpit: TestMailpit;
let queue: JobQueue;
let documentIds: string[];
let app: Awaited<ReturnType<typeof buildApp>>;

jest.setTimeout(300_000);

const APP_ORIGIN = 'http://localhost:5173';
const OLD_PASSWORD = 'Old-password-2026!';
const NEW_PASSWORD = 'New-password-2026!';

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
  const passwordService = createPasswordService({
    auth: db.auth,
    queue,
    mailer,
    accountService,
    sessionStore,
    notifier,
    appOrigin: APP_ORIGIN,
  });

  await registerEmailVerificationWorker(queue, emailVerification);
  await registerPasswordResetWorker(queue, passwordService);
  await registerSecurityNoticeWorker(queue, mailer);

  return createApp({
    sessionStore,
    invitationStore: createPrismaInvitationStore(db.auth),
    accountService,
    emailVerification,
    passwordService,
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

// 가입하고 이메일 인증까지 마친 계정 (실제 API로 진행, 코드는 Mailpit에서 읽음)
const registerVerified = async () => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `보안회사${sequence}`,
    adminName: '보안관리자',
    operator: 'test',
  });
  const email = `sec${sequence}@example.com`;
  const loginId = `sec-user-${sequence}`;
  const signup = await post('/api/v1/auth/signup').send({
    inviteToken: invitation.token,
    loginId,
    password: OLD_PASSWORD,
    email,
    isAgeConfirmed: true,
    consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
  });
  const cookie = cookieOf(signup);
  const code = /(\d{6})/.exec((await mailpit.waitForMessage(email)).text)?.[1];

  await post('/api/v1/auth/email/verify', cookie).send({ code });

  return { email, loginId, cookie, companyId: invitation.companyId };
};

const login = (loginId: string, password: string) =>
  post('/api/v1/auth/login').send({ loginId, password });

describe('비밀번호 재설정 (로그인 전)', () => {
  it('메일의 링크로 새 비밀번호를 설정하면 모든 기기가 로그아웃되고 완료 알림이 온다', async () => {
    const user = await registerVerified();
    const secondDevice = cookieOf(await login(user.loginId, OLD_PASSWORD));

    // 요청: 가입 여부를 알리지 않는 같은 응답
    const requested = await post('/api/v1/auth/password-reset/request').send({
      email: user.email.toUpperCase(),
    });

    expect(requested.status).toBe(200);

    // 메일의 링크에서 토큰 추출 (재설정 요청 메일은 인증 코드 메일 다음에 도착)
    const [, resetMail] = (await mailpit.waitForCount(user.email, 2))
      .sort((a, b) => a.subject.localeCompare(b.subject))
      .reverse();
    const mail = (await mailpit.messages()).find(
      (message) => message.to.includes(user.email) && message.subject.includes('재설정 안내'),
    );
    const token = /\/reset-password\/([\w-]+)/.exec(mail?.text ?? resetMail?.text ?? '')?.[1];

    expect(token).toBeDefined();

    // 링크 확인과 새 비밀번호 설정
    expect((await request(app).get(`/api/v1/auth/password-reset/${token}`)).status).toBe(200);

    const confirmed = await post('/api/v1/auth/password-reset/confirm').send({
      token,
      newPassword: NEW_PASSWORD,
    });

    expect(confirmed.status).toBe(200);

    // 모든 기기 로그아웃, 새 비밀번호만 통함, 링크는 폐기
    expect((await request(app).get('/api/v1/me').set('Cookie', user.cookie)).status).toBe(401);
    expect((await request(app).get('/api/v1/me').set('Cookie', secondDevice)).status).toBe(401);
    expect((await login(user.loginId, OLD_PASSWORD)).status).toBe(401);
    expect((await login(user.loginId, NEW_PASSWORD)).status).toBe(200);
    expect((await request(app).get(`/api/v1/auth/password-reset/${token}`)).status).toBe(404);
    expect(
      (
        await post('/api/v1/auth/password-reset/confirm').send({
          token,
          newPassword: 'Third-password-2026!',
        })
      ).status,
    ).toBe(404);

    // 완료 알림 메일
    await expect(
      (async () => {
        for (let i = 0; i < 60; i += 1) {
          if (
            (await mailpit.messages()).some(
              (message) =>
                message.to.includes(user.email) && message.subject.includes('재설정되었습니다'),
            )
          ) {
            return true;
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        return false;
      })(),
    ).resolves.toBe(true);
  });

  it('가입되지 않은 주소도 같은 응답이고 메일은 가지 않는다', async () => {
    const user = await registerVerified();
    const known = await post('/api/v1/auth/password-reset/request').send({ email: user.email });
    const unknown = await post('/api/v1/auth/password-reset/request').send({
      email: 'nobody-registered@example.com',
    });

    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(
      (await mailpit.messages()).some((message) =>
        message.to.includes('nobody-registered@example.com'),
      ),
    ).toBe(false);
  });

  it('틀린 링크와 약한 비밀번호는 거부한다', async () => {
    expect((await request(app).get('/api/v1/auth/password-reset/unknown-token-0000')).status).toBe(
      404,
    );

    const weak = await post('/api/v1/auth/password-reset/confirm').send({
      token: 'unknown-token-0000',
      newPassword: 'short',
    });

    expect(weak.status).toBe(400);
  });
});

describe('비밀번호 변경 (로그인 상태)', () => {
  it('현재 비밀번호를 확인하고 바꾸면 다른 기기만 로그아웃된다', async () => {
    const user = await registerVerified();
    const otherDevice = cookieOf(await login(user.loginId, OLD_PASSWORD));

    const wrong = await post('/api/v1/me/password', user.cookie).send({
      currentPassword: 'wrong-password-1',
      newPassword: NEW_PASSWORD,
    });

    expect(wrong.status).toBe(400);
    expect(errorResponseSchema.parse(wrong.body).error.code).toBe('CURRENT_PASSWORD_INVALID');

    const changed = await post('/api/v1/me/password', user.cookie).send({
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(changed.status).toBe(200);
    expect((await request(app).get('/api/v1/me').set('Cookie', user.cookie)).status).toBe(200);
    expect((await request(app).get('/api/v1/me').set('Cookie', otherDevice)).status).toBe(401);
    expect((await login(user.loginId, NEW_PASSWORD)).status).toBe(200);
    expect(
      (await post('/api/v1/me/password').send({ currentPassword: 'a', newPassword: NEW_PASSWORD }))
        .status,
    ).toBe(401);
  });
});

describe('이메일 변경', () => {
  it('비밀번호를 다시 확인하고 새 주소의 코드를 인증해야 바뀌며, 이전 주소로 알림이 간다', async () => {
    const user = await registerVerified();
    const newEmail = `changed-${sequence}@example.com`;

    // 비밀번호가 틀리면 거부, 새 주소로는 메일이 가지 않음
    const wrong = await post('/api/v1/me/email/change', user.cookie).send({
      newEmail,
      currentPassword: 'wrong-password-1',
    });

    expect(wrong.status).toBe(400);

    // 비밀번호 재확인 후 요청: 새 주소로 코드 발송, 인증 전에는 이메일이 그대로
    await db.ownerPool.query(
      `UPDATE email_verifications SET last_requested_at = now() - interval '1 minute' WHERE company_id = $1`,
      [user.companyId],
    );

    const requested = await post('/api/v1/me/email/change', user.cookie).send({
      newEmail,
      currentPassword: OLD_PASSWORD,
    });

    expect(requested.status).toBe(200);

    const mail = await mailpit.waitForMessage(newEmail);
    const code = /(\d{6})/.exec(mail.text)?.[1];

    expect((await request(app).get('/api/v1/me').set('Cookie', user.cookie)).body.email).toBe(
      user.email,
    );

    // 코드 확인으로 반영
    const verified = await post('/api/v1/auth/email/verify', user.cookie).send({ code });

    expect(meResponseSchema.parse(verified.body)).toMatchObject({
      email: newEmail,
      isEmailVerified: true,
    });

    // 이전 주소에는 변경 알림 (새 주소는 일부만 표시)
    const notice = await (async () => {
      for (let i = 0; i < 60; i += 1) {
        const found = (await mailpit.messages()).find(
          (message) =>
            message.to.includes(user.email) && message.subject.includes('이메일이 변경되었습니다'),
        );

        if (found) {
          return found;
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      throw new Error('변경 알림 없음');
    })();

    expect(notice.text).toContain('***@example.com');
    expect(notice.text).not.toContain(newEmail);
  });

  it('이미 쓰는 주소로는 바꿀 수 없다', async () => {
    const a = await registerVerified();
    const b = await registerVerified();
    const res = await post('/api/v1/me/email/change', a.cookie).send({
      newEmail: b.email,
      currentPassword: OLD_PASSWORD,
    });

    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).error.details?.[0]?.path).toBe('body.newEmail');
  });
});
