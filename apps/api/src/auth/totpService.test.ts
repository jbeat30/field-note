import { TOTP_RECOVERY_CODE_COUNT } from '@field-note/shared';

import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createCompanyWithInvitation } from '../operator/operatorService';

import { createAccountService } from './accountService';
import { generateTotpCode, totpStep } from './totp';
import { createTotpService, TotpError } from './totpService';

let db: TestDatabase;
let nowMs = Date.now();
let documentIds: string[];

jest.setTimeout(180_000);

const SERVER_SECRET = 'totp-server-secret-totp-server-secret-0';

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
  // 30초 구간 경계에서 시험이 흔들리지 않도록 구간 시작 직후로 맞춤
  nowMs = (totpStep(new Date()) + 1) * 30_000 + 1000;
});

afterAll(async () => {
  await db.stop();
});

let sequence = 0;

const at = () => new Date(nowMs);

// 가입을 마친 계정과 2단계 인증 서비스 (아직 등록하지 않은 상태)
const setup = async () => {
  sequence += 1;

  const totp = createTotpService({
    auth: db.auth,
    secretKey: SERVER_SECRET,
    issuer: '필드노트',
    now: at,
  });
  const accountService = createAccountService({ auth: db.auth, app: db.app, totp, now: at });
  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `2단계회사${sequence}`,
    adminName: '2단계관리자',
    operator: 'test',
  });
  const loginId = `totp-user-${sequence}`;

  await accountService.signup({
    inviteToken: invitation.token,
    loginId,
    password: 'Correct-horse-2026!',
    email: `totp${sequence}@example.com`,
    consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
  });

  return {
    totp,
    account: { userId: invitation.userId, companyId: invitation.companyId },
    loginId,
  };
};

// 등록을 시작하고 인증 앱처럼 현재 코드를 계산해 켠 상태까지 진행
const enabled = async () => {
  const context = await setup();
  const { secret } = await context.totp.beginSetup(context.account);
  const recoveryCodes = await context.totp.enable(context.account, generateTotpCode(secret, at()));

  return { ...context, secret, recoveryCodes };
};

const expectCode = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toBeInstanceOf(TotpError);
  await expect(promise).rejects.toMatchObject({ code });
};

describe('등록 시작', () => {
  it('키와 인증 앱 등록 주소를 주고, 확인 전에는 켜지지 않는다', async () => {
    const { totp, account, loginId } = await setup();
    const result = await totp.beginSetup(account);

    expect(result.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(decodeURIComponent(result.otpauthUrl)).toContain(`필드노트:${loginId}`);
    expect(result.otpauthUrl).toContain(`secret=${result.secret}`);
    expect(await totp.isEnabled(account)).toBe(false);
    expect(await totp.getStatus(account)).toEqual({ isEnabled: false, recoveryCodesLeft: 0 });
  });

  it('키는 평문으로 저장되지 않고, 다시 시작하면 이전 키는 버려진다', async () => {
    const { totp, account } = await setup();
    const first = await totp.beginSetup(account);
    const second = await totp.beginSetup(account);
    const stored = await db.owner.userTotp.findFirstOrThrow({
      where: { companyId: account.companyId },
    });

    expect(second.secret).not.toBe(first.secret);
    expect(stored.secretEncrypted).not.toContain(first.secret);
    expect(stored.secretEncrypted).not.toContain(second.secret);
    await expectCode(totp.enable(account, generateTotpCode(first.secret, at())), 'CODE_INVALID');
    await expect(totp.enable(account, generateTotpCode(second.secret, at()))).resolves.toHaveLength(
      TOTP_RECOVERY_CODE_COUNT,
    );
  });

  it('이미 켜진 계정은 다시 시작할 수 없다', async () => {
    const { totp, account } = await enabled();

    await expectCode(totp.beginSetup(account), 'ALREADY_ENABLED');
  });
});

describe('등록 확인', () => {
  it('맞는 코드면 켜지고 복구 코드가 발급되며, 복구 코드는 해시로만 저장된다', async () => {
    const { totp, account, recoveryCodes } = await enabled();
    const stored = await db.owner.userTotp.findFirstOrThrow({
      where: { companyId: account.companyId },
    });

    expect(recoveryCodes).toHaveLength(TOTP_RECOVERY_CODE_COUNT);
    expect(new Set(recoveryCodes).size).toBe(TOTP_RECOVERY_CODE_COUNT);
    expect(stored.enabledAt).not.toBeNull();
    expect(stored.recoveryCodeHashes).toHaveLength(TOTP_RECOVERY_CODE_COUNT);
    expect(JSON.stringify(stored)).not.toContain(recoveryCodes[0]);
    expect(await totp.getStatus(account)).toEqual({
      isEnabled: true,
      recoveryCodesLeft: TOTP_RECOVERY_CODE_COUNT,
    });
  });

  it('틀린 코드와 시작하지 않은 계정은 거부한다', async () => {
    const { totp, account } = await setup();

    await expectCode(totp.enable(account, '123456'), 'SETUP_NOT_STARTED');

    await totp.beginSetup(account);

    await expectCode(totp.enable(account, '000000'), 'CODE_INVALID');
    await expectCode(totp.enable(account, 'ABCDE-FGHJK'), 'CODE_INVALID');
    expect(await totp.isEnabled(account)).toBe(false);
  });

  it('이미 켜진 계정에는 다시 확인할 수 없다', async () => {
    const { totp, account, secret } = await enabled();

    await expectCode(totp.enable(account, generateTotpCode(secret, at())), 'ALREADY_ENABLED');
  });
});

describe('코드 확인', () => {
  it('켜지 않은 계정은 어떤 코드도 통과하지 못한다', async () => {
    const { totp, account } = await setup();
    const { secret } = await totp.beginSetup(account);

    expect(await totp.verify(account, generateTotpCode(secret, at()))).toBe(false);
  });

  it('등록에 쓴 코드는 다시 쓸 수 없고, 다음 구간 코드는 통과한다', async () => {
    const { totp, account, secret } = await enabled();

    expect(await totp.verify(account, generateTotpCode(secret, at()))).toBe(false);

    nowMs += 30_000;

    const next = generateTotpCode(secret, at());

    expect(await totp.verify(account, next)).toBe(true);
    // 같은 코드를 곧바로 다시 내면 거부 (엿본 코드 재사용 차단)
    expect(await totp.verify(account, next)).toBe(false);
  });

  it('틀린 코드와 허용 범위 밖의 오래된 코드는 거부한다', async () => {
    const { totp, account, secret } = await enabled();
    const old = generateTotpCode(secret, new Date(nowMs - 3 * 30_000));

    nowMs += 5 * 30_000;

    expect(await totp.verify(account, '000000')).toBe(false);
    expect(await totp.verify(account, old)).toBe(false);
  });

  it('동시에 같은 코드를 내도 한 번만 통과한다', async () => {
    const { totp, account, secret } = await enabled();

    nowMs += 30_000;

    const code = generateTotpCode(secret, at());
    const results = await Promise.all([1, 2, 3, 4].map(() => totp.verify(account, code)));

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('다른 서버 비밀 값으로는 복호화할 수 없어 통과하지 못한다', async () => {
    const { account, secret } = await enabled();
    const other = createTotpService({
      auth: db.auth,
      secretKey: 'another-secret-another-secret-0000000',
      issuer: '필드노트',
      now: at,
    });

    nowMs += 30_000;

    await expect(other.verify(account, generateTotpCode(secret, at()))).rejects.toThrow();
  });
});

describe('복구 코드', () => {
  it('형식(소문자·하이픈 생략)과 관계없이 한 번만 쓸 수 있다', async () => {
    const { totp, account, recoveryCodes } = await enabled();
    const code = recoveryCodes[0]!;

    expect(await totp.verify(account, code.toLowerCase().replace('-', ' '))).toBe(true);
    expect(await totp.verify(account, code)).toBe(false);
    expect(await totp.getStatus(account)).toEqual({
      isEnabled: true,
      recoveryCodesLeft: TOTP_RECOVERY_CODE_COUNT - 1,
    });
  });

  it('동시에 같은 복구 코드를 내도 한 번만 통과한다', async () => {
    const { totp, account, recoveryCodes } = await enabled();
    const results = await Promise.all(
      [1, 2, 3, 4].map(() => totp.verify(account, recoveryCodes[1]!)),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('틀린 복구 코드와 길이가 다른 입력은 거부한다', async () => {
    const { totp, account } = await enabled();

    expect(await totp.verify(account, 'AAAAA-AAAAA')).toBe(false);
    expect(await totp.verify(account, 'ABC')).toBe(false);
    expect(await totp.verify(account, '1234567')).toBe(false);
  });

  it('다시 발급하면 이전 코드는 모두 무효가 된다', async () => {
    const { totp, account, recoveryCodes } = await enabled();
    const fresh = await totp.regenerateRecoveryCodes(account);

    expect(fresh).toHaveLength(TOTP_RECOVERY_CODE_COUNT);
    expect(await totp.verify(account, recoveryCodes[2]!)).toBe(false);
    expect(await totp.verify(account, fresh[2]!)).toBe(true);
  });

  it('켜지지 않은 계정은 다시 발급할 수 없다', async () => {
    const { totp, account } = await setup();

    await expectCode(totp.regenerateRecoveryCodes(account), 'NOT_ENABLED');

    await totp.beginSetup(account);

    await expectCode(totp.regenerateRecoveryCodes(account), 'NOT_ENABLED');
  });
});

describe('끄기', () => {
  it('설정이 지워지고 다시 등록할 수 있다', async () => {
    const { totp, account } = await enabled();

    await totp.disable(account);

    expect(await totp.isEnabled(account)).toBe(false);
    expect(await db.owner.userTotp.count({ where: { companyId: account.companyId } })).toBe(0);
    await expect(totp.beginSetup(account)).resolves.toMatchObject({ secret: expect.any(String) });
  });

  it('다른 회사의 설정에는 영향이 없다', async () => {
    const mine = await enabled();
    const other = await enabled();

    await mine.totp.disable(mine.account);

    expect(await other.totp.isEnabled(other.account)).toBe(true);
  });
});
