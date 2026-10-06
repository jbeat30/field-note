import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createPrismaInvitationStore } from '../invitation/invitationStore';
import { createCompanyWithInvitation } from '../operator/operatorService';

import { AccountError, createAccountService, type SignupInput } from './accountService';
import { LOGIN_LOCK_MS, MAX_FAILED_LOGINS } from './loginPolicy';
import { verifyPassword } from './password';

let db: TestDatabase;
let nowMs = Date.now();
let docs: { terms: string; privacy: string; marketing: string };

jest.setTimeout(180_000);

const service = () =>
  createAccountService({ auth: db.auth, app: db.app, now: () => new Date(nowMs) });

beforeAll(async () => {
  db = await startTestDatabase();

  const { rows } = await db.ownerPool.query<{ id: string; type: string }>(
    `INSERT INTO legal_documents (type, version, effective_at, content_hash, is_required) VALUES
      ('TERMS_OF_SERVICE', '2026-10-01', '2026-10-01', 'h1', true),
      ('PRIVACY_POLICY', '2026-10-01', '2026-10-01', 'h2', true),
      ('MARKETING', '2026-10-01', '2026-10-01', 'h3', false)
     RETURNING id, type`,
  );
  const byType = Object.fromEntries(rows.map((row) => [row.type, row.id]));

  docs = {
    terms: byType.TERMS_OF_SERVICE!,
    privacy: byType.PRIVACY_POLICY!,
    marketing: byType.MARKETING!,
  };
});

beforeEach(() => {
  nowMs = Date.now();
});

afterAll(async () => {
  await db.stop();
});

let sequence = 0;

const invite = (name = `테스트${(sequence += 1)}`) =>
  createCompanyWithInvitation(db.operator, {
    companyName: name,
    adminName: `관리자${sequence}`,
    operator: 'test',
  });

const signupInput = (token: string, overrides: Partial<SignupInput> = {}): SignupInput => ({
  inviteToken: token,
  loginId: `user${sequence}`,
  password: 'Correct-horse-2026!',
  email: `user${sequence}@example.com`,
  consents: [
    { documentId: docs.terms, isAgreed: true },
    { documentId: docs.privacy, isAgreed: true },
    { documentId: docs.marketing, isAgreed: false },
  ],
  ...overrides,
});

// 가입을 마치고 로그인 가능한 계정 (이후 로그인 시나리오용)
const registered = async () => {
  const invitation = await invite();
  const input = signupInput(invitation.token);

  await service().signup(input);

  return { input, invitation };
};

const expectAccountError = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toBeInstanceOf(AccountError);
  await expect(promise).rejects.toMatchObject({ code });
};

describe('가입', () => {
  it('초대 링크로 가입하면 이메일·만 14세 확인·로그인 자격·동의 이력이 기록된다', async () => {
    const invitation = await invite();
    const input = signupInput(invitation.token);
    const result = await service().signup(input);

    const user = await db.owner.user.findFirst({ where: { companyId: result.companyId } });
    const credential = await db.owner.userCredential.findUnique({
      where: { loginId: input.loginId },
    });
    const consents = await db.owner.consent.findMany({ where: { companyId: result.companyId } });

    expect(user).toMatchObject({ email: input.email, status: 'INVITED', emailVerifiedAt: null });
    expect(user?.ageConfirmedAt).not.toBeNull();
    expect(credential?.passwordHash).not.toContain(input.password);
    expect(await verifyPassword(credential!.passwordHash!, input.password)).toBe(true);
    // 선택 약관의 거부도 이력으로 남음
    expect(consents).toHaveLength(3);
    expect(consents.find((consent) => consent.documentId === docs.marketing)?.isAgreed).toBe(false);
  });

  it('가입에 쓴 링크는 폐기되어 다시 쓸 수 없다', async () => {
    const invitation = await invite();

    await service().signup(signupInput(invitation.token));

    expect(await createPrismaInvitationStore(db.auth).find(invitation.token)).toBeNull();
    await expectAccountError(
      service().signup(
        signupInput(invitation.token, { loginId: 'another-id', email: 'another@example.com' }),
      ),
      'INVITATION_INVALID',
    );
  });

  it('없는 링크와 만료된 링크는 가입할 수 없다', async () => {
    const expired = await invite();

    nowMs += 8 * 24 * 60 * 60 * 1000;

    await expectAccountError(service().signup(signupInput(expired.token)), 'INVITATION_INVALID');
    await expectAccountError(
      service().signup(signupInput('unknown-token-0000')),
      'INVITATION_INVALID',
    );
  });

  it('필수 약관에 동의하지 않으면 가입할 수 없고 링크도 소모되지 않는다', async () => {
    const invitation = await invite();
    const input = signupInput(invitation.token, {
      consents: [
        { documentId: docs.terms, isAgreed: true },
        { documentId: docs.privacy, isAgreed: false },
      ],
    });

    await expectAccountError(service().signup(input), 'CONSENT_REQUIRED');
    expect(await createPrismaInvitationStore(db.auth).find(invitation.token)).not.toBeNull();
  });

  it('현재 시행 중이 아닌 문서에 대한 동의는 받지 않는다', async () => {
    const invitation = await invite();
    const input = signupInput(invitation.token, {
      consents: [
        { documentId: docs.terms, isAgreed: true },
        { documentId: docs.privacy, isAgreed: true },
        { documentId: '0198f000-0000-7000-8000-000000000000', isAgreed: true },
      ],
    });

    await expectAccountError(service().signup(input), 'CONSENT_UNKNOWN_DOCUMENT');
  });

  it('이미 쓰는 아이디로는 가입할 수 없고 링크는 그대로 남는다 (전체 취소)', async () => {
    const first = await registered();
    const invitation = await invite();

    await expectAccountError(
      service().signup(
        signupInput(invitation.token, { loginId: first.input.loginId, email: 'other@example.com' }),
      ),
      'LOGIN_ID_TAKEN',
    );

    expect(await createPrismaInvitationStore(db.auth).find(invitation.token)).not.toBeNull();
    expect(
      await db.owner.user.findFirst({ where: { companyId: invitation.companyId } }),
    ).toMatchObject({ email: null });
  });

  it('이미 쓰는 이메일로는 가입할 수 없다', async () => {
    const first = await registered();
    const invitation = await invite();

    await expectAccountError(
      service().signup(
        signupInput(invitation.token, { email: first.input.email, loginId: 'brand-new-id' }),
      ),
      'EMAIL_TAKEN',
    );
  });

  it('같은 링크로 동시에 가입을 요청해도 한 번만 성공한다', async () => {
    const invitation = await invite();
    const results = await Promise.allSettled([
      service().signup(
        signupInput(invitation.token, { loginId: 'race-a', email: 'race-a@example.com' }),
      ),
      service().signup(
        signupInput(invitation.token, { loginId: 'race-b', email: 'race-b@example.com' }),
      ),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(
      await db.owner.userCredential.count({ where: { companyId: invitation.companyId } }),
    ).toBe(1);
  });
});

describe('로그인', () => {
  it('맞는 아이디·비밀번호면 회사·계정을 얻고 내 정보를 조회한다', async () => {
    const { input, invitation } = await registered();
    const account = await service().login({ loginId: input.loginId, password: input.password });
    const me = await service().getMe(account);

    expect(account).toEqual({ userId: invitation.userId, companyId: invitation.companyId });
    // 이메일 인증 전이라 인증 상태는 false이고, 응답에 회사·계정 식별값은 없음
    expect(me).toEqual({
      displayName: expect.any(String),
      email: input.email,
      isEmailVerified: false,
      companyName: expect.any(String),
    });
  });

  it('틀린 비밀번호와 없는 아이디는 같은 오류다', async () => {
    const { input } = await registered();

    await expectAccountError(
      service().login({ loginId: input.loginId, password: 'wrong-password-1' }),
      'INVALID_CREDENTIALS',
    );
    await expectAccountError(
      service().login({ loginId: 'nobody-here', password: 'wrong-password-1' }),
      'INVALID_CREDENTIALS',
    );
  });

  it(`연속 ${MAX_FAILED_LOGINS}번 실패하면 잠기고, 잠긴 동안은 맞는 비밀번호도 거부한다`, async () => {
    const { input } = await registered();

    for (let attempt = 1; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      await expectAccountError(
        service().login({ loginId: input.loginId, password: 'wrong-password-1' }),
        'INVALID_CREDENTIALS',
      );
    }

    // 잠금을 일으킨 마지막 실패
    await expectAccountError(
      service().login({ loginId: input.loginId, password: 'wrong-password-1' }),
      'ACCOUNT_LOCKED',
    );
    await expectAccountError(
      service().login({ loginId: input.loginId, password: input.password }),
      'ACCOUNT_LOCKED',
    );
  });

  it('잠금 시간이 지나면 다시 로그인할 수 있다', async () => {
    const { input } = await registered();

    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      await service()
        .login({ loginId: input.loginId, password: 'wrong-password-1' })
        .catch(() => undefined);
    }

    nowMs += LOGIN_LOCK_MS + 1000;

    await expect(
      service().login({ loginId: input.loginId, password: input.password }),
    ).resolves.toBeDefined();
  });

  it('로그인에 성공하면 실패 횟수가 초기화된다', async () => {
    const { input } = await registered();

    for (let attempt = 0; attempt < MAX_FAILED_LOGINS - 1; attempt += 1) {
      await service()
        .login({ loginId: input.loginId, password: 'wrong-password-1' })
        .catch(() => undefined);
    }

    await service().login({ loginId: input.loginId, password: input.password });

    // 초기화되지 않았다면 이번 실패로 바로 잠겼을 것
    await expectAccountError(
      service().login({ loginId: input.loginId, password: 'wrong-password-1' }),
      'INVALID_CREDENTIALS',
    );
  });

  it('잠금이 풀린 뒤의 첫 실패는 횟수를 처음부터 다시 센다', async () => {
    const { input } = await registered();

    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      await service()
        .login({ loginId: input.loginId, password: 'wrong-password-1' })
        .catch(() => undefined);
    }

    nowMs += LOGIN_LOCK_MS + 1000;

    await expectAccountError(
      service().login({ loginId: input.loginId, password: 'wrong-password-1' }),
      'INVALID_CREDENTIALS',
    );
  });

  it('정지된 회사는 올바른 비밀번호여도 같은 오류로 막는다', async () => {
    const { input, invitation } = await registered();

    await db.owner.company.update({
      where: { id: invitation.companyId },
      data: { status: 'SUSPENDED' },
    });

    await expectAccountError(
      service().login({ loginId: input.loginId, password: input.password }),
      'INVALID_CREDENTIALS',
    );
  });
});

describe('내 정보 조회', () => {
  it('두 회사는 서로의 정보를 볼 수 없다', async () => {
    const a = await registered();
    const b = await registered();
    const accountA = await service().login({
      loginId: a.input.loginId,
      password: a.input.password,
    });
    const accountB = await service().login({
      loginId: b.input.loginId,
      password: b.input.password,
    });

    expect((await service().getMe(accountA)).email).toBe(a.input.email);
    expect((await service().getMe(accountB)).email).toBe(b.input.email);
    // A의 회사 범위에서 B의 계정 ID로 조회해도 존재하지 않는 것처럼 처리
    await expectAccountError(
      service().getMe({ companyId: accountA.companyId, userId: accountB.userId }),
      'ACCOUNT_NOT_FOUND',
    );
  });
});
