import type { PrismaClient } from '../db/client';

import { AccountError } from './accountError';
import type { AuthenticatedAccount } from './accountService';
import { acceptInvitation, recordConsents, type ConsentInput } from './invitationAcceptance';

type Clock = () => Date;

export type SocialProviderId = 'KAKAO';

export type LoginMethods = {
  // 아이디·비밀번호 로그인이 설정되어 있는지
  hasPassword: boolean;
  isKakaoLinked: boolean;
};

export type SocialService = {
  // 제공자 사용자 번호로 계정을 찾음 (이메일로는 절대 찾지 않음, §6.1). 정지·해지 요청 중인 회사는 없는 것으로 취급
  findAccount: (
    provider: SocialProviderId,
    providerUserId: string,
  ) => Promise<AuthenticatedAccount | null>;
  // 로그인한 계정에 소셜 계정 연동. 이미 다른 계정에 연동된 소셜 계정은 거부
  link: (
    account: AuthenticatedAccount,
    provider: SocialProviderId,
    providerUserId: string,
  ) => Promise<void>;
  // 연동 해제. 해제 후에도 로그인 수단이 하나 이상 남아야 함
  unlink: (account: AuthenticatedAccount, provider: SocialProviderId) => Promise<void>;
  methods: (account: AuthenticatedAccount) => Promise<LoginMethods>;
  // 초대 링크로 소셜 가입: 제공자가 인증된 이메일을 줄 때만 가능, 이메일 인증이 끝난 활성 계정으로 만듦
  signup: (input: {
    inviteToken: string;
    consents: ConsentInput[];
    provider: SocialProviderId;
    providerUserId: string;
    verifiedEmail: string | null;
  }) => Promise<AuthenticatedAccount & { email: string }>;
};

type Deps = { auth: PrismaClient; now?: Clock };

/**
 * @description 소셜 로그인 연동·가입 서비스 (회사 범위 밖 전용 계정으로 동작)
 * @param deps 전용 계정 클라이언트와 시계
 * @returns 소셜 서비스
 */
export const createSocialService = ({ auth, now = () => new Date() }: Deps): SocialService => ({
  findAccount: async (provider, providerUserId) => {
    const social = await auth.socialAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: { include: { company: true } } },
    });

    if (!social || social.user.company.status !== 'ACTIVE') {
      return null;
    }

    return { userId: social.userId, companyId: social.companyId };
  },

  link: async ({ userId, companyId }, provider, providerUserId) => {
    const existing = await auth.socialAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
    });

    // 같은 소셜 계정을 이미 이 계정에 연동했다면 그대로 성공 (새로고침·재시도 대비)
    if (existing) {
      if (existing.companyId === companyId && existing.userId === userId) {
        return;
      }

      throw new AccountError('SOCIAL_ALREADY_LINKED');
    }

    // 한 계정에 같은 제공자는 하나만 (다른 소셜 계정으로 바꾸려면 먼저 해제)
    if (await auth.socialAccount.findFirst({ where: { companyId, userId, provider } })) {
      throw new AccountError('SOCIAL_ALREADY_LINKED');
    }

    await auth.socialAccount.create({ data: { provider, providerUserId, companyId, userId } });
  },

  unlink: async ({ userId, companyId }, provider) => {
    await auth.$transaction(async (tx) => {
      const credential = await tx.userCredential.findUnique({
        where: { companyId_userId: { companyId, userId } },
      });
      const others = await tx.socialAccount.count({
        where: { companyId, userId, provider: { not: provider } },
      });

      // 비밀번호 로그인이 없고 다른 소셜 계정도 없으면 계정에 들어올 방법이 사라지므로 거부
      if (!credential?.passwordHash && others === 0) {
        throw new AccountError('LAST_LOGIN_METHOD');
      }

      await tx.socialAccount.deleteMany({ where: { companyId, userId, provider } });
    });
  },

  methods: async ({ userId, companyId }) => {
    const [credential, kakao] = await Promise.all([
      auth.userCredential.findUnique({ where: { companyId_userId: { companyId, userId } } }),
      auth.socialAccount.count({ where: { companyId, userId, provider: 'KAKAO' } }),
    ]);

    return { hasPassword: Boolean(credential?.passwordHash), isKakaoLinked: kakao > 0 };
  },

  signup: async (input) => {
    const at = now();

    // 인증된 이메일을 주지 않는 소셜 계정은 별도 인증 절차가 필요하므로 이 단계에서는 받지 않음 (링크도 소모하지 않음)
    if (!input.verifiedEmail) {
      throw new AccountError('SOCIAL_EMAIL_REQUIRED');
    }

    const email = input.verifiedEmail;

    return auth.$transaction(async (tx) => {
      const invitation = await acceptInvitation(tx, input, at);

      if (
        await tx.socialAccount.findUnique({
          where: {
            provider_providerUserId: {
              provider: input.provider,
              providerUserId: input.providerUserId,
            },
          },
        })
      ) {
        throw new AccountError('SOCIAL_ALREADY_LINKED');
      }

      if (await tx.user.findUnique({ where: { email } })) {
        throw new AccountError('EMAIL_TAKEN');
      }

      // 제공자가 인증된 이메일을 보증하므로 이메일 인증을 마친 활성 계정으로 만듦
      await tx.user.update({
        where: { companyId_id: { companyId: invitation.companyId, id: invitation.userId } },
        data: { email, emailVerifiedAt: at, ageConfirmedAt: at, status: 'ACTIVE' },
      });
      await tx.socialAccount.create({
        data: {
          provider: input.provider,
          providerUserId: input.providerUserId,
          companyId: invitation.companyId,
          userId: invitation.userId,
        },
      });
      await recordConsents(tx, invitation, input.consents, at);

      return { userId: invitation.userId, companyId: invitation.companyId, email };
    });
  },
});
