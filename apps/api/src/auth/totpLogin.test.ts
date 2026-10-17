import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createMemoryMailer } from '../email/mailer';
import { createSecurityNotifier, registerSecurityNoticeWorker } from '../email/securityNotice';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createMemoryQueue } from '../queue/jobQueue';
import { createPrismaSessionStore } from '../session/sessionStore';

import { AccountError, createAccountService } from './accountService';
import { MAX_FAILED_LOGINS } from './loginPolicy';
import { createPasswordService, registerPasswordResetWorker } from './passwordService';
import { generateTotpCode, totpStep } from './totp';
import { createTotpService } from './totpService';

let db: TestDatabase;
let nowMs = Date.now();
let documentIds: string[];

jest.setTimeout(180_000);

const PASSWORD = 'Correct-horse-2026!';
const NEW_PASSWORD = 'New-password-2026!';

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

beforeEach(() => {
  nowMs = (totpStep(new Date()) + 1) * 30_000 + 1000;
});

afterAll(async () => {
  await db.stop();
});

let sequence = 0;

const at = () => new Date(nowMs);

// 이메일 인증을 마친 계정과 서비스 묶음 (큐·메일은 메모리)
const setup = async () => {
  sequence += 1;

  const { queue } = createMemoryQueue();
  const { mailer, sent: mails } = createMemoryMailer();
  const totp = createTotpService({
    auth: db.auth,
    secretKey: 'totp-login-secret-totp-login-secret-0',
    issuer: '필드노트',
    now: at,
  });
  const accountService = createAccountService({ auth: db.auth, app: db.app, totp, now: at });
  const passwordService = createPasswordService({
    auth: db.auth,
    queue,
    mailer,
    accountService,
    totp,
    sessionStore: createPrismaSessionStore(db.auth, at),
    notifier: createSecurityNotifier(queue),
    appOrigin: 'http://localhost:5173',
    now: at,
  });

  await registerPasswordResetWorker(queue, passwordService);
  await registerSecurityNoticeWorker(queue, mailer);

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `로그인회사${sequence}`,
    adminName: '로그인관리자',
    operator: 'test',
  });
  const loginId = `totp-login-${sequence}`;
  const email = `totp-login${sequence}@example.com`;

  await accountService.signup({
    inviteToken: invitation.token,
    loginId,
    password: PASSWORD,
    email,
    consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
  });
  await db.owner.user.updateMany({
    where: { companyId: invitation.companyId },
    data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
  });

  const account = { userId: invitation.userId, companyId: invitation.companyId };
  const lastResetToken = () =>
    /\/reset-password\/([\w-]+)/.exec(mails.at(-1)?.text ?? '')?.[1] ?? '';

  return { totp, accountService, passwordService, account, loginId, email, lastResetToken };
};

// 2단계 인증을 켠 계정 (등록에 쓴 구간은 지나가서 다음 구간부터 로그인 가능)
const withTotp = async () => {
  const context = await setup();
  const { secret } = await context.totp.beginSetup(context.account);
  const recoveryCodes = await context.totp.enable(context.account, generateTotpCode(secret, at()));

  nowMs += 30_000;

  return { ...context, secret, recoveryCodes, code: () => generateTotpCode(secret, at()) };
};

const expectAccountError = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toBeInstanceOf(AccountError);
  await expect(promise).rejects.toMatchObject({ code });
};

describe('로그인', () => {
  it('2단계 인증을 켜지 않은 계정은 코드 없이 로그인된다', async () => {
    const { accountService, loginId, account } = await setup();

    await expect(accountService.login({ loginId, password: PASSWORD })).resolves.toEqual(account);
  });

  it('켠 계정은 비밀번호가 맞아도 코드가 없으면 TOTP_REQUIRED를 돌려준다', async () => {
    const { accountService, loginId } = await withTotp();

    await expectAccountError(
      accountService.login({ loginId, password: PASSWORD }),
      'TOTP_REQUIRED',
    );
  });

  it('비밀번호가 틀리면 코드 요구 없이 일반 로그인 실패로 끝난다 (코드 필요 여부를 알리지 않음)', async () => {
    const { accountService, loginId } = await withTotp();

    await expectAccountError(
      accountService.login({ loginId, password: 'Wrong-password-2026!' }),
      'INVALID_CREDENTIALS',
    );
  });

  it('비밀번호와 코드가 모두 맞으면 로그인된다', async () => {
    const { accountService, loginId, account, code } = await withTotp();

    await expect(
      accountService.login({ loginId, password: PASSWORD, totpCode: code() }),
    ).resolves.toEqual(account);
  });

  it('쓴 코드를 곧바로 다시 내면 거부한다', async () => {
    const { accountService, loginId, code } = await withTotp();
    const used = code();

    await accountService.login({ loginId, password: PASSWORD, totpCode: used });
    await expectAccountError(
      accountService.login({ loginId, password: PASSWORD, totpCode: used }),
      'TOTP_INVALID',
    );
  });

  it('복구 코드로 로그인할 수 있고 한 번 쓴 복구 코드는 다시 쓸 수 없다', async () => {
    const { accountService, loginId, account, recoveryCodes } = await withTotp();
    const recovery = recoveryCodes[0]!;

    await expect(
      accountService.login({ loginId, password: PASSWORD, totpCode: recovery }),
    ).resolves.toEqual(account);
    await expectAccountError(
      accountService.login({ loginId, password: PASSWORD, totpCode: recovery }),
      'TOTP_INVALID',
    );
  });

  it(`틀린 코드가 ${MAX_FAILED_LOGINS}번 쌓이면 잠기고, 잠긴 동안은 맞는 코드도 거부한다`, async () => {
    const { accountService, loginId, code } = await withTotp();

    for (let attempt = 1; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      await expectAccountError(
        accountService.login({ loginId, password: PASSWORD, totpCode: '000000' }),
        'TOTP_INVALID',
      );
    }

    await expectAccountError(
      accountService.login({ loginId, password: PASSWORD, totpCode: '000000' }),
      'ACCOUNT_LOCKED',
    );
    await expectAccountError(
      accountService.login({ loginId, password: PASSWORD, totpCode: code() }),
      'ACCOUNT_LOCKED',
    );
  });

  it('비밀번호가 맞아도 코드 시도 횟수는 초기화되지 않는다 (코드를 무제한 시도할 수 없음)', async () => {
    const { accountService, loginId } = await withTotp();

    for (let attempt = 1; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      await expectAccountError(
        accountService.login({ loginId, password: PASSWORD, totpCode: '000000' }),
        'TOTP_INVALID',
      );
      // 코드 입력 칸이 뜨는 단계만 다시 거쳐도 횟수는 그대로
      await expectAccountError(
        accountService.login({ loginId, password: PASSWORD }),
        'TOTP_REQUIRED',
      );
    }

    await expectAccountError(
      accountService.login({ loginId, password: PASSWORD, totpCode: '000000' }),
      'ACCOUNT_LOCKED',
    );
  });

  it('코드까지 맞게 로그인하면 쌓인 실패 횟수가 초기화된다', async () => {
    const { accountService, loginId, code } = await withTotp();

    await expectAccountError(
      accountService.login({ loginId, password: PASSWORD, totpCode: '000000' }),
      'TOTP_INVALID',
    );
    await accountService.login({ loginId, password: PASSWORD, totpCode: code() });

    const credential = await db.owner.userCredential.findUniqueOrThrow({ where: { loginId } });

    expect(credential.failedLoginCount).toBe(0);
  });

  it('2단계 인증을 끄면 다시 코드 없이 로그인된다', async () => {
    const { accountService, totp, account, loginId } = await withTotp();

    await totp.disable(account);

    await expect(accountService.login({ loginId, password: PASSWORD })).resolves.toEqual(account);
  });
});

describe('민감한 작업의 2단계 인증 확인', () => {
  it('코드가 없거나 틀리면 거부하고, 맞으면 통과한다', async () => {
    const { accountService, account, code } = await withTotp();

    await expectAccountError(
      accountService.verifySecondFactor(account, undefined),
      'TOTP_REQUIRED',
    );
    await expectAccountError(accountService.verifySecondFactor(account, '000000'), 'TOTP_INVALID');
    await expect(accountService.verifySecondFactor(account, code())).resolves.toBeUndefined();
  });

  it('틀린 코드는 로그인과 같은 횟수로 쌓여 잠긴다', async () => {
    const { accountService, account } = await withTotp();

    for (let attempt = 1; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      await expectAccountError(
        accountService.verifySecondFactor(account, '000000'),
        'TOTP_INVALID',
      );
    }

    await expectAccountError(
      accountService.verifySecondFactor(account, '000000'),
      'ACCOUNT_LOCKED',
    );
  });

  it('비밀번호 로그인이 없는 계정도 틀린 코드를 거부한다 (횟수 기록 없이 요청 제한에 의존)', async () => {
    const { accountService, account } = await withTotp();

    await db.owner.userCredential.deleteMany({ where: { companyId: account.companyId } });

    await expectAccountError(accountService.verifySecondFactor(account, '000000'), 'TOTP_INVALID');
  });
});

describe('비밀번호 재설정', () => {
  it('2단계 인증을 켠 계정의 링크는 코드 입력이 필요하다고 알린다', async () => {
    const { passwordService, email, lastResetToken } = await withTotp();

    await passwordService.requestReset(email);

    expect(await passwordService.checkResetLink(lastResetToken())).toEqual({ requiresTotp: true });
  });

  it('코드가 없거나 틀리면 거부하되 링크는 소모되지 않는다', async () => {
    const { passwordService, accountService, loginId, email, lastResetToken } = await withTotp();

    await passwordService.requestReset(email);

    const token = lastResetToken();

    await expectAccountError(passwordService.confirmReset(token, NEW_PASSWORD), 'TOTP_REQUIRED');
    await expectAccountError(
      passwordService.confirmReset(token, NEW_PASSWORD, '000000'),
      'TOTP_INVALID',
    );

    expect(await passwordService.checkResetLink(token)).toEqual({ requiresTotp: true });
    // 비밀번호도 바뀌지 않음
    await expectAccountError(
      accountService.login({ loginId, password: NEW_PASSWORD }),
      'INVALID_CREDENTIALS',
    );
  });

  it('맞는 코드면 재설정되고, 복구 코드로도 재설정할 수 있다', async () => {
    const first = await withTotp();

    await first.passwordService.requestReset(first.email);
    await first.passwordService.confirmReset(first.lastResetToken(), NEW_PASSWORD, first.code());

    const second = await withTotp();

    await second.passwordService.requestReset(second.email);
    await second.passwordService.confirmReset(
      second.lastResetToken(),
      NEW_PASSWORD,
      second.recoveryCodes[0],
    );

    // 재설정 뒤에는 새 비밀번호로 로그인하되 코드는 여전히 필요
    await expectAccountError(
      second.accountService.login({ loginId: second.loginId, password: NEW_PASSWORD }),
      'TOTP_REQUIRED',
    );
  });

  it('2단계 인증을 켜지 않은 계정은 코드 없이 재설정된다', async () => {
    const { passwordService, accountService, loginId, email, lastResetToken } = await setup();

    await passwordService.requestReset(email);

    expect(await passwordService.checkResetLink(lastResetToken())).toEqual({
      requiresTotp: false,
    });

    await passwordService.confirmReset(lastResetToken(), NEW_PASSWORD);
    await expect(accountService.login({ loginId, password: NEW_PASSWORD })).resolves.toBeDefined();
  });
});
