import { errorResponseSchema, meResponseSchema } from '@field-note/shared';
import pg from 'pg';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import {
  createEmailVerificationService,
  registerEmailVerificationWorker,
} from '../auth/emailVerification';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createPrismaInvitationStore } from '../invitation/invitationStore';
import { createLogger } from '../logger';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPgBossQueue, type JobQueue } from '../queue/jobQueue';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

import { createSmtpMailer } from './mailer';
import { startTestMailpit, type TestMailpit } from './testMailpit';

// 실제 구성 요소(PostgreSQL, pg-boss 큐, SMTP, Mailpit)로 가입부터 이메일 인증까지 끝까지 검증
let db: TestDatabase;
let mailpit: TestMailpit;
let queue: JobQueue;
let documentIds: string[];

jest.setTimeout(240_000);

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
});

afterAll(async () => {
  await queue?.stop();
  await Promise.all([db?.stop(), mailpit?.stop()]);
});

const buildApp = async () => {
  const emailVerification = createEmailVerificationService({
    auth: db.auth,
    queue,
    mailer: createSmtpMailer({
      host: mailpit.host,
      port: mailpit.smtpPort,
      from: 'no-reply@field-note.local',
    }),
    secret: 'e2e-secret-e2e-secret-e2e-secret-0000',
  });

  await registerEmailVerificationWorker(queue, emailVerification);

  return createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    invitationStore: createPrismaInvitationStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    emailVerification,
    appOrigin: 'http://localhost:5173',
  });
};

const post = (app: Awaited<ReturnType<typeof buildApp>>, path: string, cookie?: string) => {
  const req = request(app).post(path).set(CSRF_HEADER, CSRF_HEADER_VALUE);

  return cookie ? req.set('Cookie', cookie) : req;
};

describe('가입 → 이메일 인증 전 구간', () => {
  it('가입하면 작업 큐를 거쳐 Mailpit에 인증 코드가 도착하고, 코드를 입력하면 가입이 완료된다', async () => {
    const app = await buildApp();
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '이메일설비',
      adminName: '인증자',
      operator: 'test',
    });
    const email = 'e2e-admin@example.com';
    const signup = await post(app, '/api/v1/auth/signup').send({
      inviteToken: invitation.token,
      loginId: 'e2e-admin',
      password: 'Correct-horse-2026!',
      email,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });
    const cookie = (signup.headers['set-cookie'] as unknown as string[]).find((value) =>
      value.startsWith(`${SESSION_COOKIE}=`),
    )!;

    expect(signup.status).toBe(201);

    // 큐가 비동기로 발송하므로 메일이 도착할 때까지 기다림
    const mail = await mailpit.waitForMessage(email);
    const code = /(\d{6})/.exec(mail.text)?.[1];

    expect(code).toMatch(/^\d{6}$/);
    expect(mail.subject).toContain('인증 코드');

    // 인증 전에는 인증 상태가 false
    expect((await request(app).get('/api/v1/me').set('Cookie', cookie)).body.isEmailVerified).toBe(
      false,
    );

    // 틀린 코드는 거부
    const wrong = await post(app, '/api/v1/auth/email/verify', cookie).send({
      code: code === '000000' ? '111111' : '000000',
    });

    expect(wrong.status).toBe(400);
    expect(errorResponseSchema.parse(wrong.body).error.code).toBe('EMAIL_CODE_INVALID');

    // 맞는 코드로 가입 완료
    const verified = await post(app, '/api/v1/auth/email/verify', cookie).send({ code });

    expect(verified.status).toBe(200);
    expect(meResponseSchema.parse(verified.body)).toMatchObject({
      isEmailVerified: true,
      email,
      companyName: '이메일설비',
    });
    expect((await request(app).get('/api/v1/me').set('Cookie', cookie)).body.isEmailVerified).toBe(
      true,
    );

    // 인증 후에는 재발송 불가
    expect((await post(app, '/api/v1/auth/email/resend', cookie)).status).toBe(400);
  });

  it('재발송은 간격 안에는 429, 인증 전에는 코드를 다시 받을 수 있다', async () => {
    const app = await buildApp();
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '재발송설비',
      adminName: '재발송',
      operator: 'test',
    });
    const email = 'e2e-resend@example.com';
    const signup = await post(app, '/api/v1/auth/signup').send({
      inviteToken: invitation.token,
      loginId: 'e2e-resend',
      password: 'Correct-horse-2026!',
      email,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });
    const cookie = (signup.headers['set-cookie'] as unknown as string[]).find((value) =>
      value.startsWith(`${SESSION_COOKIE}=`),
    )!;

    await mailpit.waitForMessage(email);

    // 가입 직후(30초 이내) 재발송은 제한
    const tooSoon = await post(app, '/api/v1/auth/email/resend', cookie);

    expect(tooSoon.status).toBe(429);
    expect(errorResponseSchema.parse(tooSoon.body).error.code).toBe('TOO_MANY_REQUESTS');

    // 간격이 지난 상황을 재현: 마지막 요청 시각을 과거로 옮긴 뒤 재발송
    await db.ownerPool.query(
      `UPDATE email_verifications SET last_requested_at = now() - interval '1 minute' WHERE company_id = $1`,
      [invitation.companyId],
    );

    const resend = await post(app, '/api/v1/auth/email/resend', cookie);

    expect(resend.status).toBe(200);
    expect(resend.body).toEqual({ resendAfterSeconds: 30 });

    // 첫 메일과 재발송 메일, 두 통이 도착
    expect(await mailpit.waitForCount(email, 2)).toHaveLength(2);
  });

  it('로그인하지 않은 요청은 인증 확인·재발송 모두 401', async () => {
    const app = await buildApp();

    expect((await post(app, '/api/v1/auth/email/verify').send({ code: '123456' })).status).toBe(
      401,
    );
    expect((await post(app, '/api/v1/auth/email/resend')).status).toBe(401);
  });
});

describe('작업 큐 전용 계정', () => {
  const asQueueRole = async <T>(run: (client: pg.Client) => Promise<T>) => {
    const client = new pg.Client({ connectionString: db.queueUrl });

    await client.connect();

    try {
      return await run(client);
    } finally {
      await client.end();
    }
  };

  it('큐 스키마는 큐 계정이 소유하고 큐 테이블이 그 안에 만들어진다', async () => {
    const { rows } = await db.ownerPool.query<{ nspowner: string }>(
      `SELECT r.rolname AS nspowner FROM pg_namespace n JOIN pg_roles r ON r.oid = n.nspowner WHERE n.nspname = 'pgboss'`,
    );

    expect(rows[0]?.nspowner).toBe('field_note_queue');
  });

  it('큐 계정은 업무 테이블을 읽을 수 없다', async () => {
    await asQueueRole(async (client) => {
      for (const table of [
        'users',
        'user_credentials',
        'email_verifications',
        'sessions',
        'companies',
        'consents',
      ]) {
        await expect(client.query(`SELECT * FROM public.${table}`)).rejects.toThrow(
          /permission denied/,
        );
      }
    });
  });
});
