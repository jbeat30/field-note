import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createMemoryMailer } from '../email/mailer';
import { createSecurityNotifier, registerSecurityNoticeWorker } from '../email/securityNotice';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createMemoryQueue } from '../queue/jobQueue';
import { createPrismaSessionStore } from '../session/sessionStore';

import { createAccountService, AccountError } from './accountService';
import { MAX_FAILED_LOGINS } from './loginPolicy';
import {
  createPasswordService,
  MAX_RESET_REQUESTS_PER_HOUR,
  PasswordError,
  registerPasswordResetWorker,
  RESET_REQUEST_INTERVAL_MS,
  RESET_TTL_MS,
} from './passwordService';
import { verifyPassword } from './password';

let db: TestDatabase;
let nowMs = Date.now();
let documentIds: string[];

jest.setTimeout(240_000);

const APP_ORIGIN = 'http://localhost:5173';
const OLD_PASSWORD = 'Old-password-2026!';
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
  nowMs = Date.now();
});

afterAll(async () => {
  await db.stop();
});

let sequence = 0;

// 이메일 인증까지 마친 계정과, 그 계정을 다루는 서비스 묶음 (큐·메일은 메모리, 큐는 보낸 즉시 처리)
const setup = async (options: { isVerified?: boolean } = {}) => {
  const { queue } = createMemoryQueue();
  const { mailer, sent: mails } = createMemoryMailer();
  const sessionStore = createPrismaSessionStore(db.auth, () => new Date(nowMs));
  const accountService = createAccountService({
    auth: db.auth,
    app: db.app,
    now: () => new Date(nowMs),
  });
  const notifier = createSecurityNotifier(queue);
  const service = createPasswordService({
    auth: db.auth,
    queue,
    mailer,
    accountService,
    sessionStore,
    notifier,
    appOrigin: APP_ORIGIN,
    now: () => new Date(nowMs),
  });

  await registerPasswordResetWorker(queue, service);
  await registerSecurityNoticeWorker(queue, mailer);

  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `비밀번호회사${sequence}`,
    adminName: '비밀번호관리자',
    operator: 'test',
  });
  const email = `pw${sequence}@example.com`;
  const loginId = `pw-user-${sequence}`;

  await accountService.signup({
    inviteToken: invitation.token,
    loginId,
    password: OLD_PASSWORD,
    email,
    consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
  });

  if (options.isVerified !== false) {
    await db.owner.user.updateMany({
      where: { companyId: invitation.companyId },
      data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
    });
  }

  const account = { userId: invitation.userId, companyId: invitation.companyId };

  // 메일 본문에서 재설정 링크의 토큰을 꺼냄
  const lastResetToken = () =>
    /\/reset-password\/([\w-]+)/.exec(mails.at(-1)?.text ?? '')?.[1] ?? '';

  return { service, accountService, sessionStore, account, email, loginId, mails, lastResetToken };
};

const expectCode = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toMatchObject({ code });
};

describe('비밀번호 재설정 요청', () => {
  it('인증된 계정이면 재설정 링크 메일이 간다 (링크에만 토큰이 담김)', async () => {
    const { service, email, mails, lastResetToken } = await setup();

    await service.requestReset(email);

    expect(mails).toHaveLength(1);
    expect(mails[0]?.to).toBe(email);
    expect(mails[0]?.text).toContain(`${APP_ORIGIN}/reset-password/`);
    expect(lastResetToken().length).toBeGreaterThanOrEqual(43);
  });

  it('토큰 원문은 DB에 남지 않고 해시만 저장된다', async () => {
    const { service, account, email, lastResetToken } = await setup();

    await service.requestReset(email);

    const stored = await db.owner.passwordReset.findFirst({
      where: { companyId: account.companyId },
    });

    expect(stored?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(lastResetToken());
  });

  it('가입되지 않은 주소와 인증 전 계정은 아무것도 보내지 않고 같은 결과로 끝난다', async () => {
    const unverified = await setup({ isVerified: false });
    const known = await setup();

    await expect(known.service.requestReset('nobody-here@example.com')).resolves.toBeUndefined();
    await expect(unverified.service.requestReset(unverified.email)).resolves.toBeUndefined();

    expect(known.mails).toHaveLength(0);
    expect(unverified.mails).toHaveLength(0);
  });

  it('정지된 회사의 계정은 재설정 메일을 받지 못한다', async () => {
    const { service, account, email, mails } = await setup();

    await db.owner.company.update({
      where: { id: account.companyId },
      data: { status: 'SUSPENDED' },
    });
    await service.requestReset(email);

    expect(mails).toHaveLength(0);
  });

  it('요청 간격 안의 반복 요청은 조용히 무시하고, 간격이 지나면 다시 보낸다', async () => {
    const { service, email, mails } = await setup();

    await service.requestReset(email);
    await expect(service.requestReset(email)).resolves.toBeUndefined();

    expect(mails).toHaveLength(1);

    nowMs += RESET_REQUEST_INTERVAL_MS + 1000;
    await service.requestReset(email);

    expect(mails).toHaveLength(2);
  });

  it(`한 시간에 ${MAX_RESET_REQUESTS_PER_HOUR}번까지만 보내고, 시간이 지나면 다시 가능하다`, async () => {
    const { service, email, mails } = await setup();

    for (let count = 0; count < MAX_RESET_REQUESTS_PER_HOUR + 2; count += 1) {
      await service.requestReset(email);
      nowMs += RESET_REQUEST_INTERVAL_MS + 1000;
    }

    expect(mails).toHaveLength(MAX_RESET_REQUESTS_PER_HOUR);

    nowMs += 60 * 60 * 1000;
    await service.requestReset(email);

    expect(mails).toHaveLength(MAX_RESET_REQUESTS_PER_HOUR + 1);
  });
});

describe('비밀번호 재설정 확인', () => {
  it('링크로 새 비밀번호를 설정하면 새 비밀번호로만 로그인된다', async () => {
    const { service, accountService, email, loginId, lastResetToken } = await setup();

    await service.requestReset(email);
    await service.confirmReset(lastResetToken(), NEW_PASSWORD);

    await expect(accountService.login({ loginId, password: NEW_PASSWORD })).resolves.toBeDefined();
    await expect(accountService.login({ loginId, password: OLD_PASSWORD })).rejects.toBeInstanceOf(
      AccountError,
    );
  });

  it('재설정하면 모든 기기가 로그아웃된다', async () => {
    const { service, sessionStore, account, email, lastResetToken } = await setup();
    const phone = await sessionStore.create(account);
    const desktop = await sessionStore.create(account);

    await service.requestReset(email);
    await service.confirmReset(lastResetToken(), NEW_PASSWORD);

    expect(await sessionStore.find(phone.token)).toBeNull();
    expect(await sessionStore.find(desktop.token)).toBeNull();
  });

  it('링크는 한 번만 쓸 수 있다', async () => {
    const { service, email, lastResetToken } = await setup();

    await service.requestReset(email);

    const token = lastResetToken();

    await service.confirmReset(token, NEW_PASSWORD);
    await expectCode(service.confirmReset(token, 'Another-password-2026!'), 'RESET_LINK_INVALID');
    expect(await service.isResetLinkValid(token)).toBe(false);
  });

  it('동시에 두 번 설정해도 한 번만 성공한다', async () => {
    const { service, email, lastResetToken } = await setup();

    await service.requestReset(email);

    const token = lastResetToken();
    const results = await Promise.allSettled([
      service.confirmReset(token, 'First-password-2026!'),
      service.confirmReset(token, 'Second-password-2026!'),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });

  it('유효 시간이 지난 링크와 없는 링크는 같은 오류다', async () => {
    const { service, email, lastResetToken } = await setup();

    await service.requestReset(email);

    const token = lastResetToken();

    expect(await service.isResetLinkValid(token)).toBe(true);

    nowMs += RESET_TTL_MS + 1000;

    expect(await service.isResetLinkValid(token)).toBe(false);
    await expectCode(service.confirmReset(token, NEW_PASSWORD), 'RESET_LINK_INVALID');
    await expectCode(
      service.confirmReset('unknown-token-0000', NEW_PASSWORD),
      'RESET_LINK_INVALID',
    );
    expect(PasswordError).toBeDefined();
  });

  it('새 링크를 받으면 이전 링크는 쓸 수 없다', async () => {
    const { service, email, lastResetToken } = await setup();

    await service.requestReset(email);

    const first = lastResetToken();

    nowMs += RESET_REQUEST_INTERVAL_MS + 1000;
    await service.requestReset(email);

    expect(await service.isResetLinkValid(first)).toBe(false);
    expect(await service.isResetLinkValid(lastResetToken())).toBe(true);
  });

  it('재설정하면 로그인 잠금이 풀린다', async () => {
    const { service, accountService, email, loginId, lastResetToken } = await setup();

    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      await accountService.login({ loginId, password: 'wrong-password-1' }).catch(() => undefined);
    }

    await expect(accountService.login({ loginId, password: OLD_PASSWORD })).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
    });

    await service.requestReset(email);
    await service.confirmReset(lastResetToken(), NEW_PASSWORD);

    await expect(accountService.login({ loginId, password: NEW_PASSWORD })).resolves.toBeDefined();
  });

  it('완료 알림 메일이 간다', async () => {
    const { service, email, mails, lastResetToken } = await setup();

    await service.requestReset(email);
    await service.confirmReset(lastResetToken(), NEW_PASSWORD);

    expect(mails.at(-1)?.to).toBe(email);
    expect(mails.at(-1)?.subject).toContain('재설정되었습니다');
  });

  it('새 비밀번호는 해시로만 저장된다', async () => {
    const { service, account, email, lastResetToken } = await setup();

    await service.requestReset(email);
    await service.confirmReset(lastResetToken(), NEW_PASSWORD);

    const credential = await db.owner.userCredential.findFirst({
      where: { companyId: account.companyId },
    });

    expect(credential?.passwordHash).not.toContain(NEW_PASSWORD);
    expect(await verifyPassword(credential!.passwordHash!, NEW_PASSWORD)).toBe(true);
  });
});

describe('비밀번호 변경 (로그인 상태)', () => {
  it('현재 비밀번호를 확인한 뒤 바꾸고 다른 기기만 로그아웃한다', async () => {
    const { service, accountService, sessionStore, account, loginId } = await setup();
    const current = await sessionStore.create(account);
    const other = await sessionStore.create(account);

    await service.changePassword(account, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
      currentSessionToken: current.token,
    });

    expect(await sessionStore.find(current.token)).not.toBeNull();
    expect(await sessionStore.find(other.token)).toBeNull();
    await expect(accountService.login({ loginId, password: NEW_PASSWORD })).resolves.toBeDefined();
  });

  it('현재 비밀번호가 틀리면 바뀌지 않고 로그인과 같은 횟수 제한을 받는다', async () => {
    const { service, accountService, account, loginId } = await setup();

    for (let attempt = 1; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      await expectCode(
        service.changePassword(account, {
          currentPassword: 'wrong-password-1',
          newPassword: NEW_PASSWORD,
          currentSessionToken: 'x',
        }),
        'CURRENT_PASSWORD_INVALID',
      );
    }

    await expectCode(
      service.changePassword(account, {
        currentPassword: 'wrong-password-1',
        newPassword: NEW_PASSWORD,
        currentSessionToken: 'x',
      }),
      'ACCOUNT_LOCKED',
    );
    await expectCode(
      service.changePassword(account, {
        currentPassword: OLD_PASSWORD,
        newPassword: NEW_PASSWORD,
        currentSessionToken: 'x',
      }),
      'ACCOUNT_LOCKED',
    );
    await expect(accountService.login({ loginId, password: NEW_PASSWORD })).rejects.toBeInstanceOf(
      AccountError,
    );
  });

  it('변경하면 알림 메일이 간다', async () => {
    const { service, account, email, mails } = await setup();

    await service.changePassword(account, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
      currentSessionToken: 'x',
    });

    expect(mails.at(-1)?.to).toBe(email);
    expect(mails.at(-1)?.subject).toContain('변경되었습니다');
  });
});
