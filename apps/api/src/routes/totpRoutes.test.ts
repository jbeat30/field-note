import {
  errorResponseSchema,
  totpRecoveryCodesResponseSchema,
  totpSetupResponseSchema,
  totpStatusSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { generateTotpCode } from '../auth/totp';
import { createTotpService } from '../auth/totpService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { markCompanyEmailsVerified } from '../db/testFixtures';
import { createMemoryMailer } from '../email/mailer';
import { createSecurityNotifier, registerSecurityNoticeWorker } from '../email/securityNotice';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createPrismaInvitationStore } from '../invitation/invitationStore';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createMemoryQueue } from '../queue/jobQueue';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(180_000);

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

const buildApp = async () => {
  const { queue } = createMemoryQueue();
  const { mailer, sent: mails } = createMemoryMailer();
  const totp = createTotpService({
    auth: db.auth,
    secretKey: 'totp-route-secret-totp-route-secret-0',
    issuer: '필드노트',
  });

  await registerSecurityNoticeWorker(queue, mailer);

  const app = createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    invitationStore: createPrismaInvitationStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app, totp }),
    totp,
    notifier: createSecurityNotifier(queue),
    appOrigin: 'http://localhost:5173',
  });

  return { app, mails };
};

type TestApp = Awaited<ReturnType<typeof buildApp>>['app'];

const post = (app: TestApp, path: string) =>
  request(app).post(path).set(CSRF_HEADER, CSRF_HEADER_VALUE);

let sequence = 0;

// 가입을 마친 로그인 상태 (세션 쿠키 포함)
const signedUp = async (app: TestApp) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `2단계라우트${sequence}`,
    adminName: '홍길동',
    operator: 'test',
  });
  const loginId = `totp-route-${sequence}`;
  const res = await post(app, '/api/v1/auth/signup').send({
    inviteToken: invitation.token,
    loginId,
    password: PASSWORD,
    email: `totp-route${sequence}@example.com`,
    isAgeConfirmed: true,
    consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
  });
  await markCompanyEmailsVerified(db.ownerPool, invitation.companyId);
  const cookie = (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;

  return { cookie, loginId };
};

// 인증 앱처럼 다음 구간의 코드를 계산 (등록에 쓴 구간의 코드는 재사용이 막혀 있음)
const nextCode = (secret: string) => generateTotpCode(secret, new Date(Date.now() + 30_000));

const enableTotp = async (app: TestApp, cookie: string) => {
  const setup = await post(app, '/api/v1/me/totp/setup').set('Cookie', cookie);
  const { secret } = totpSetupResponseSchema.parse(setup.body);
  const enable = await post(app, '/api/v1/me/totp/enable')
    .set('Cookie', cookie)
    .send({ code: generateTotpCode(secret, new Date()) });
  const { recoveryCodes } = totpRecoveryCodesResponseSchema.parse(enable.body);

  return { secret, recoveryCodes };
};

describe('2단계 인증 설정', () => {
  it('로그인하지 않으면 모든 경로가 401이다', async () => {
    const { app } = await buildApp();

    expect((await request(app).get('/api/v1/me/totp')).status).toBe(401);
    for (const path of ['setup', 'enable', 'disable', 'recovery-codes']) {
      expect((await post(app, `/api/v1/me/totp/${path}`).send({ code: '123456' })).status).toBe(
        401,
      );
    }
  });

  it('켜기 전에는 꺼진 상태이고, 등록 확인에 성공하면 켜지고 복구 코드를 한 번 보여 준다', async () => {
    const { app, mails } = await buildApp();
    const { cookie } = await signedUp(app);
    const before = await request(app).get('/api/v1/me/totp').set('Cookie', cookie);

    expect(totpStatusSchema.parse(before.body)).toEqual({ isEnabled: false, recoveryCodesLeft: 0 });

    const setup = await post(app, '/api/v1/me/totp/setup').set('Cookie', cookie);
    const { secret, otpauthUrl } = totpSetupResponseSchema.parse(setup.body);

    expect(otpauthUrl).toContain('otpauth://totp/');

    const wrong = await post(app, '/api/v1/me/totp/enable')
      .set('Cookie', cookie)
      .send({ code: '000000' });

    expect(wrong.status).toBe(400);
    expect(errorResponseSchema.parse(wrong.body).error.code).toBe('TOTP_INVALID');

    const bad = await post(app, '/api/v1/me/totp/enable')
      .set('Cookie', cookie)
      .send({ code: 'abc' });

    expect(bad.status).toBe(400);
    expect(errorResponseSchema.parse(bad.body).error.code).toBe('VALIDATION_ERROR');

    const enable = await post(app, '/api/v1/me/totp/enable')
      .set('Cookie', cookie)
      .send({ code: generateTotpCode(secret, new Date()) });

    expect(enable.status).toBe(200);
    expect(totpRecoveryCodesResponseSchema.parse(enable.body).recoveryCodes).toHaveLength(8);

    const after = await request(app).get('/api/v1/me/totp').set('Cookie', cookie);

    expect(totpStatusSchema.parse(after.body)).toEqual({ isEnabled: true, recoveryCodesLeft: 8 });
    // 상태 조회에는 복구 코드 자체가 담기지 않음
    expect(JSON.stringify(after.body)).not.toContain('-');
    // 켜졌다는 알림 메일
    expect(mails.map((mail) => mail.subject)).toEqual(['[field-note] 2단계 인증이 켜졌습니다']);
  });

  it('이미 켜져 있으면 다시 등록을 시작하거나 확인할 수 없다', async () => {
    const { app } = await buildApp();
    const { cookie } = await signedUp(app);
    const { secret } = await enableTotp(app, cookie);
    const setup = await post(app, '/api/v1/me/totp/setup').set('Cookie', cookie);
    const enable = await post(app, '/api/v1/me/totp/enable')
      .set('Cookie', cookie)
      .send({ code: nextCode(secret) });

    expect(setup.status).toBe(400);
    expect(enable.status).toBe(400);
  });
});

describe('로그인과 2단계 인증', () => {
  it('켠 계정은 코드 없이 TOTP_REQUIRED(401)이고, 코드를 더하면 같은 요청으로 로그인된다', async () => {
    const { app } = await buildApp();
    const { cookie, loginId } = await signedUp(app);
    const { secret } = await enableTotp(app, cookie);
    const withoutCode = await post(app, '/api/v1/auth/login').send({ loginId, password: PASSWORD });

    expect(withoutCode.status).toBe(401);
    expect(errorResponseSchema.parse(withoutCode.body).error.code).toBe('TOTP_REQUIRED');
    expect(withoutCode.headers['set-cookie']).toBeUndefined();

    const wrong = await post(app, '/api/v1/auth/login').send({
      loginId,
      password: PASSWORD,
      totpCode: '000000',
    });

    expect(wrong.status).toBe(400);
    expect(errorResponseSchema.parse(wrong.body).error.code).toBe('TOTP_INVALID');

    const ok = await post(app, '/api/v1/auth/login').send({
      loginId,
      password: PASSWORD,
      totpCode: nextCode(secret),
    });

    expect(ok.status).toBe(200);
    expect(ok.headers['set-cookie']).toBeDefined();
  });

  it('복구 코드로도 로그인되고 한 번 쓴 코드는 거부된다', async () => {
    const { app } = await buildApp();
    const { cookie, loginId } = await signedUp(app);
    const { recoveryCodes } = await enableTotp(app, cookie);
    const body = { loginId, password: PASSWORD, totpCode: recoveryCodes[0] };

    expect((await post(app, '/api/v1/auth/login').send(body)).status).toBe(200);
    expect((await post(app, '/api/v1/auth/login').send(body)).status).toBe(400);
  });
});

describe('끄기와 복구 코드 재발급', () => {
  it('현재 비밀번호와 코드가 모두 맞아야 꺼지고, 꺼진 뒤에는 코드 없이 로그인된다', async () => {
    const { app, mails } = await buildApp();
    const { cookie, loginId } = await signedUp(app);
    const { secret } = await enableTotp(app, cookie);
    const wrongPassword = await post(app, '/api/v1/me/totp/disable')
      .set('Cookie', cookie)
      .send({ currentPassword: 'Wrong-password-2026!', code: nextCode(secret) });

    expect(wrongPassword.status).toBe(400);
    expect(errorResponseSchema.parse(wrongPassword.body).error.code).toBe(
      'CURRENT_PASSWORD_INVALID',
    );

    const wrongCode = await post(app, '/api/v1/me/totp/disable')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, code: '000000' });

    expect(errorResponseSchema.parse(wrongCode.body).error.code).toBe('TOTP_INVALID');

    const ok = await post(app, '/api/v1/me/totp/disable')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, code: nextCode(secret) });

    expect(ok.status).toBe(200);
    expect(
      totpStatusSchema.parse(
        (await request(app).get('/api/v1/me/totp').set('Cookie', cookie)).body,
      ),
    ).toEqual({ isEnabled: false, recoveryCodesLeft: 0 });
    expect(
      (await post(app, '/api/v1/auth/login').send({ loginId, password: PASSWORD })).status,
    ).toBe(200);
    expect(mails.map((mail) => mail.subject)).toContain('[field-note] 2단계 인증이 꺼졌습니다');
  });

  it('켜지 않은 계정에서 끄기나 재발급을 요청하면 거부한다', async () => {
    const { app } = await buildApp();
    const { cookie } = await signedUp(app);
    const disable = await post(app, '/api/v1/me/totp/disable')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, code: '123456' });
    const regenerate = await post(app, '/api/v1/me/totp/recovery-codes')
      .set('Cookie', cookie)
      .send({ code: '123456' });

    expect(disable.status).toBe(400);
    expect(regenerate.status).toBe(400);
  });

  it('복구 코드를 다시 발급하면 이전 코드는 로그인에 쓸 수 없다', async () => {
    const { app } = await buildApp();
    const { cookie, loginId } = await signedUp(app);
    const { secret, recoveryCodes } = await enableTotp(app, cookie);
    const wrong = await post(app, '/api/v1/me/totp/recovery-codes')
      .set('Cookie', cookie)
      .send({ code: '000000' });

    expect(errorResponseSchema.parse(wrong.body).error.code).toBe('TOTP_INVALID');

    const regenerate = await post(app, '/api/v1/me/totp/recovery-codes')
      .set('Cookie', cookie)
      .send({ code: nextCode(secret) });
    const fresh = totpRecoveryCodesResponseSchema.parse(regenerate.body).recoveryCodes;

    expect(fresh).toHaveLength(8);
    expect(
      (
        await post(app, '/api/v1/auth/login').send({
          loginId,
          password: PASSWORD,
          totpCode: recoveryCodes[0],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await post(app, '/api/v1/auth/login').send({
          loginId,
          password: PASSWORD,
          totpCode: fresh[0],
        })
      ).status,
    ).toBe(200);
  });
});
