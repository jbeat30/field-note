import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPrismaInvitationStore } from '../invitation/invitationStore';

import { AccountError, createAccountService } from './accountService';
import { createSocialService } from './socialService';

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

afterAll(async () => {
  await db.stop();
});

const social = () => createSocialService({ auth: db.auth });
const consents = () => documentIds.map((documentId) => ({ documentId, isAgreed: true }));
let sequence = 0;

// 아이디·비밀번호로 가입한 계정
const passwordAccount = async () => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `소셜회사${sequence}`,
    adminName: '소셜관리자',
    operator: 'test',
  });
  const email = `social${sequence}@example.com`;

  await createAccountService({ auth: db.auth, app: db.app }).signup({
    inviteToken: invitation.token,
    loginId: `social-user-${sequence}`,
    password: 'Correct-horse-2026!',
    email,
    consents: consents(),
  });

  return { account: { userId: invitation.userId, companyId: invitation.companyId }, email };
};

// 소셜로만 가입한 계정
const socialOnlyAccount = async (providerUserId: string, verifiedEmail: string) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `소셜전용회사${sequence}`,
    adminName: '소셜전용',
    operator: 'test',
  });

  await social().signup({
    inviteToken: invitation.token,
    consents: consents(),
    provider: 'KAKAO',
    providerUserId,
    verifiedEmail,
  });

  return { account: { userId: invitation.userId, companyId: invitation.companyId }, invitation };
};

const expectCode = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toBeInstanceOf(AccountError);
  await expect(promise).rejects.toMatchObject({ code });
};

describe('소셜 연동', () => {
  it('로그인한 계정에 연동하면 그 소셜 계정으로 계정을 찾을 수 있다', async () => {
    const { account } = await passwordAccount();

    await social().link(account, 'KAKAO', 'kakao-link-1');

    expect(await social().findAccount('KAKAO', 'kakao-link-1')).toEqual(account);
    expect(await social().methods(account)).toEqual({ hasPassword: true, isKakaoLinked: true });
  });

  it('이메일이 같다는 이유로는 연결되지 않고, 연동하지 않은 소셜 계정은 찾지 못한다', async () => {
    const { account, email } = await passwordAccount();

    // 카카오가 같은 이메일을 인증해 줘도 연동하지 않았다면 어떤 계정과도 연결되지 않음
    expect(await social().findAccount('KAKAO', `email-${email}`)).toBeNull();
    expect(await social().methods(account)).toEqual({ hasPassword: true, isKakaoLinked: false });
  });

  it('같은 소셜 계정을 같은 계정에 다시 연동해도 성공한다 (새로고침 대비)', async () => {
    const { account } = await passwordAccount();

    await social().link(account, 'KAKAO', 'kakao-link-twice');

    await expect(social().link(account, 'KAKAO', 'kakao-link-twice')).resolves.toBeUndefined();
    expect(
      await db.owner.socialAccount.count({ where: { providerUserId: 'kakao-link-twice' } }),
    ).toBe(1);
  });

  it('이미 다른 계정에 연동된 소셜 계정은 연동할 수 없다', async () => {
    const a = await passwordAccount();
    const b = await passwordAccount();

    await social().link(a.account, 'KAKAO', 'kakao-shared');

    await expectCode(social().link(b.account, 'KAKAO', 'kakao-shared'), 'SOCIAL_ALREADY_LINKED');
  });

  it('한 계정에 카카오는 하나만 연동할 수 있다', async () => {
    const { account } = await passwordAccount();

    await social().link(account, 'KAKAO', 'kakao-first');

    await expectCode(social().link(account, 'KAKAO', 'kakao-second'), 'SOCIAL_ALREADY_LINKED');
  });

  it('정지된 회사의 소셜 계정은 로그인할 수 없다', async () => {
    const { account } = await passwordAccount();

    await social().link(account, 'KAKAO', 'kakao-suspended');
    await db.owner.company.update({
      where: { id: account.companyId },
      data: { status: 'SUSPENDED' },
    });

    expect(await social().findAccount('KAKAO', 'kakao-suspended')).toBeNull();
  });
});

describe('소셜 연동 해제', () => {
  it('비밀번호 로그인이 있으면 해제할 수 있고, 해제 후에는 그 소셜 계정으로 찾지 못한다', async () => {
    const { account } = await passwordAccount();

    await social().link(account, 'KAKAO', 'kakao-unlink');
    await social().unlink(account, 'KAKAO');

    expect(await social().findAccount('KAKAO', 'kakao-unlink')).toBeNull();
    expect((await social().methods(account)).isKakaoLinked).toBe(false);
  });

  it('소셜 로그인만 있는 계정은 마지막 로그인 수단이라 해제할 수 없다', async () => {
    const { account } = await socialOnlyAccount('kakao-only-1', 'only1@example.com');

    expect(await social().methods(account)).toEqual({ hasPassword: false, isKakaoLinked: true });
    await expectCode(social().unlink(account, 'KAKAO'), 'LAST_LOGIN_METHOD');
    expect(await social().findAccount('KAKAO', 'kakao-only-1')).toEqual(account);
  });
});

describe('초대 링크로 소셜 가입', () => {
  it('인증된 이메일을 주면 이메일 인증이 끝난 활성 계정으로 가입하고 동의 이력이 남는다', async () => {
    const { account, invitation } = await socialOnlyAccount(
      'kakao-signup-1',
      'signup1@example.com',
    );
    const user = await db.owner.user.findFirst({ where: { companyId: account.companyId } });
    const records = await db.owner.consent.findMany({ where: { companyId: account.companyId } });

    expect(user).toMatchObject({ email: 'signup1@example.com', status: 'ACTIVE' });
    expect(user?.emailVerifiedAt).not.toBeNull();
    expect(user?.ageConfirmedAt).not.toBeNull();
    expect(records).toHaveLength(2);
    // 비밀번호 로그인 자격은 만들지 않음
    expect(await db.owner.userCredential.count({ where: { companyId: account.companyId } })).toBe(
      0,
    );
    // 링크는 폐기
    expect(await createPrismaInvitationStore(db.auth).find(invitation.token)).toBeNull();
  });

  it('인증된 이메일이 없으면 가입할 수 없고 링크는 소모되지 않는다', async () => {
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '이메일없음',
      adminName: '무',
      operator: 'test',
    });

    await expectCode(
      social().signup({
        inviteToken: invitation.token,
        consents: consents(),
        provider: 'KAKAO',
        providerUserId: 'kakao-no-email',
        verifiedEmail: null,
      }),
      'SOCIAL_EMAIL_REQUIRED',
    );
    expect(await createPrismaInvitationStore(db.auth).find(invitation.token)).not.toBeNull();
  });

  it('필수 약관에 동의하지 않으면 전체가 취소된다', async () => {
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '동의없음',
      adminName: '무',
      operator: 'test',
    });

    await expectCode(
      social().signup({
        inviteToken: invitation.token,
        consents: [{ documentId: documentIds[0]!, isAgreed: true }],
        provider: 'KAKAO',
        providerUserId: 'kakao-no-consent',
        verifiedEmail: 'noconsent@example.com',
      }),
      'CONSENT_REQUIRED',
    );
    expect(await createPrismaInvitationStore(db.auth).find(invitation.token)).not.toBeNull();
    expect(await social().findAccount('KAKAO', 'kakao-no-consent')).toBeNull();
  });

  it('이미 쓰는 이메일이거나 이미 연동된 소셜 계정이면 전체가 취소되고 링크가 남는다', async () => {
    const existing = await passwordAccount();
    const takenEmail = await createCompanyWithInvitation(db.operator, {
      companyName: '이메일중복',
      adminName: '무',
      operator: 'test',
    });

    await expectCode(
      social().signup({
        inviteToken: takenEmail.token,
        consents: consents(),
        provider: 'KAKAO',
        providerUserId: 'kakao-dup-email',
        verifiedEmail: existing.email,
      }),
      'EMAIL_TAKEN',
    );
    expect(await createPrismaInvitationStore(db.auth).find(takenEmail.token)).not.toBeNull();

    await socialOnlyAccount('kakao-dup-id', 'dupid@example.com');

    const second = await createCompanyWithInvitation(db.operator, {
      companyName: '소셜중복',
      adminName: '무',
      operator: 'test',
    });

    await expectCode(
      social().signup({
        inviteToken: second.token,
        consents: consents(),
        provider: 'KAKAO',
        providerUserId: 'kakao-dup-id',
        verifiedEmail: 'other@example.com',
      }),
      'SOCIAL_ALREADY_LINKED',
    );
    expect(await createPrismaInvitationStore(db.auth).find(second.token)).not.toBeNull();
  });

  it('없는 링크나 사용한 링크로는 가입할 수 없다', async () => {
    await expectCode(
      social().signup({
        inviteToken: 'unknown-token-0000',
        consents: consents(),
        provider: 'KAKAO',
        providerUserId: 'kakao-bad-link',
        verifiedEmail: 'bad@example.com',
      }),
      'INVITATION_INVALID',
    );
  });
});
