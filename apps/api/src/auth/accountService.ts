import type { MeResponse } from '@field-note/shared';

import type { PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

import { AccountError } from './accountError';
import { acceptInvitation, recordConsents } from './invitationAcceptance';
import { LOGIN_LOCK_MS, MAX_FAILED_LOGINS } from './loginPolicy';
import { hashPassword, verifyPassword } from './password';

type Clock = () => Date;

export { AccountError, type AccountErrorCode } from './accountError';

export type SignupInput = {
  inviteToken: string;
  loginId: string;
  password: string;
  email: string;
  consents: { documentId: string; isAgreed: boolean }[];
};

export type AuthenticatedAccount = { userId: string; companyId: string };

export type AccountService = {
  // 초대 링크를 사용해 가입 (이메일 인증 전 상태). 한 트랜잭션이라 실패하면 링크도 소모되지 않음
  signup: (input: SignupInput) => Promise<AuthenticatedAccount & { email: string }>;
  login: (input: { loginId: string; password: string }) => Promise<AuthenticatedAccount>;
  // 로그인한 상태에서 비밀번호를 다시 확인 (비밀번호·이메일 변경 전). 틀리면 로그인과 같은 실패 횟수·잠금 정책 적용
  verifyCurrentPassword: (account: AuthenticatedAccount, password: string) => Promise<void>;
  // 로그인한 관리자 정보 (회사 식별값은 응답에 없음)
  getMe: (account: AuthenticatedAccount) => Promise<MeResponse>;
};

type ServiceDeps = {
  // 회사 범위 밖 전용 계정 (로그인·가입처럼 회사를 아직 모르는 처리)
  auth: PrismaClient;
  // 앱 계정 (로그인 후 회사 범위 조회)
  app: PrismaClient;
  now?: Clock;
};

// 계정이 없는 아이디로 시도해도 응답 시간으로 존재 여부를 알 수 없게 하는 비교용 해시
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword('not-a-real-password'));

// 고유 제약 위반이 어느 값 때문인지 오류 내용에서 판별 (사전 조회와 동시 가입이 겹친 경우의 안전망)
const mapUniqueViolation = (error: unknown): AccountError | null => {
  const text =
    error instanceof Error
      ? `${error.message} ${JSON.stringify((error as { meta?: unknown }).meta ?? '')}`
      : '';

  if (!/unique|P2002|duplicate/i.test(text)) {
    return null;
  }

  if (/login_id/i.test(text)) {
    return new AccountError('LOGIN_ID_TAKEN');
  }

  return /email/i.test(text) ? new AccountError('EMAIL_TAKEN') : null;
};

/**
 * @description 가입·로그인·내 정보 조회 서비스
 * @param deps 전용 계정·앱 계정 클라이언트와 시계
 * @returns 계정 서비스
 */
type CredentialRow = {
  companyId: string;
  userId: string;
  passwordHash: string | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
};

export const createAccountService = ({
  auth,
  app,
  now = () => new Date(),
}: ServiceDeps): AccountService => {
  // 비밀번호 확인과 실패 횟수·잠금 처리 (로그인과 재확인이 같은 정책을 씀)
  const assertPassword = async (
    credential: CredentialRow,
    password: string,
    at: Date,
    invalidCode: 'INVALID_CREDENTIALS' | 'CURRENT_PASSWORD_INVALID',
  ) => {
    const where = {
      companyId_userId: { companyId: credential.companyId, userId: credential.userId },
    };

    if (!(await verifyPassword(credential.passwordHash ?? '', password))) {
      // 잠금이 이미 풀린 뒤의 첫 실패는 횟수를 처음부터 다시 셈
      const expired = credential.lockedUntil !== null && credential.lockedUntil <= at;
      const updated = await auth.userCredential.update({
        where,
        data: expired
          ? { failedLoginCount: 1, lockedUntil: null }
          : { failedLoginCount: { increment: 1 } },
      });

      if (updated.failedLoginCount >= MAX_FAILED_LOGINS) {
        await auth.userCredential.update({
          where,
          data: { lockedUntil: new Date(at.getTime() + LOGIN_LOCK_MS), failedLoginCount: 0 },
        });

        throw new AccountError('ACCOUNT_LOCKED');
      }

      throw new AccountError(invalidCode);
    }

    if (credential.failedLoginCount > 0 || credential.lockedUntil) {
      await auth.userCredential.update({ where, data: { failedLoginCount: 0, lockedUntil: null } });
    }
  };

  return {
    signup: async (input) => {
      // 해시 계산은 느리므로 트랜잭션 밖에서 먼저 수행
      const passwordHash = await hashPassword(input.password);
      const at = now();

      try {
        return await auth.$transaction(async (tx) => {
          const invitation = await acceptInvitation(tx, input, at);

          if (await tx.userCredential.findUnique({ where: { loginId: input.loginId } })) {
            throw new AccountError('LOGIN_ID_TAKEN');
          }

          if (await tx.user.findUnique({ where: { email: input.email } })) {
            throw new AccountError('EMAIL_TAKEN');
          }

          // 이메일 인증이 끝나기 전까지 계정 상태는 초대(INVITED)로 유지 (활성화는 P0-4)
          await tx.user.update({
            where: { companyId_id: { companyId: invitation.companyId, id: invitation.userId } },
            data: { email: input.email, ageConfirmedAt: at },
          });
          await tx.userCredential.create({
            data: {
              companyId: invitation.companyId,
              userId: invitation.userId,
              loginId: input.loginId,
              passwordHash,
            },
          });
          await recordConsents(tx, invitation, input.consents, at);

          return { userId: invitation.userId, companyId: invitation.companyId, email: input.email };
        });
      } catch (error) {
        throw mapUniqueViolation(error) ?? error;
      }
    },

    login: async ({ loginId, password }) => {
      const at = now();
      const credential = await auth.userCredential.findUnique({
        where: { loginId },
        include: { user: { include: { company: true } } },
      });

      // 없는 아이디도 같은 비용의 해시 비교를 거쳐 응답 시간 차이로 존재 여부를 알 수 없게 함
      if (!credential?.passwordHash) {
        await verifyPassword(await getDummyHash(), password);
        throw new AccountError('INVALID_CREDENTIALS');
      }

      // 잠금 중에는 비밀번호가 맞아도 거부 (추측 시도를 계속 허용하지 않기 위함)
      if (credential.lockedUntil && credential.lockedUntil > at) {
        throw new AccountError('ACCOUNT_LOCKED');
      }

      await assertPassword(credential, password, at, 'INVALID_CREDENTIALS');

      // 해지 요청 중인 계정은 비밀번호가 맞을 때만 상태를 알려 주고(취소 링크 안내), 로그인은 막음
      if (credential.user.company.status === 'CLOSING') {
        throw new AccountError('ACCOUNT_CLOSING');
      }

      // 정지·삭제 완료된 회사는 로그인 차단 (사유는 알려 주지 않음)
      if (credential.user.company.status !== 'ACTIVE') {
        throw new AccountError('INVALID_CREDENTIALS');
      }

      return { userId: credential.userId, companyId: credential.companyId };
    },

    verifyCurrentPassword: async ({ userId, companyId }, password) => {
      const at = now();
      const credential = await auth.userCredential.findUnique({
        where: { companyId_userId: { companyId, userId } },
      });

      // 비밀번호가 없는 계정(소셜 로그인만 사용)은 재확인할 수단이 없음
      if (!credential?.passwordHash) {
        throw new AccountError('CURRENT_PASSWORD_INVALID');
      }

      if (credential.lockedUntil && credential.lockedUntil > at) {
        throw new AccountError('ACCOUNT_LOCKED');
      }

      await assertPassword(credential, password, at, 'CURRENT_PASSWORD_INVALID');
    },

    getMe: ({ userId, companyId }) =>
      withCompany(app, companyId, async (tx) => {
        const [user, company] = await Promise.all([
          tx.user.findFirst({ where: { id: userId } }),
          tx.company.findFirst(),
        ]);

        if (!user || !company) {
          throw new AccountError('ACCOUNT_NOT_FOUND');
        }

        return {
          displayName: user.displayName,
          email: user.email,
          isEmailVerified: user.emailVerifiedAt !== null,
          companyName: company.name,
        };
      }),
  };
};
