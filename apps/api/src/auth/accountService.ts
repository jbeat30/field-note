import type { MeResponse } from '@field-note/shared';

import type { PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

import { AccountError } from './accountError';
import { acceptInvitation, recordConsents } from './invitationAcceptance';
import { LOGIN_LOCK_MS, MAX_FAILED_LOGINS } from './loginPolicy';
import { hashPassword, verifyPassword } from './password';
import type { TotpService } from './totpService';

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

export type SignupResult = AuthenticatedAccount & {
  email: string;
  // 복구·소유자 이전 링크로 다시 등록한 경우의 이전 이메일 (보안 알림 수신처)
  previousEmail: string | null;
};

export type AccountService = {
  // 초대 링크를 사용해 가입 (이메일 인증 전 상태), 한 트랜잭션이라 실패하면 링크도 소모되지 않음
  signup: (input: SignupInput) => Promise<SignupResult>;
  // 2단계 인증을 켠 계정은 인증 코드(또는 복구 코드)가 있어야 하고, 없으면 TOTP_REQUIRED
  login: (input: {
    loginId: string;
    password: string;
    totpCode?: string;
  }) => Promise<AuthenticatedAccount>;
  // 2단계 인증 코드 확인 (로그인 밖의 민감한 작업용), 틀리면 로그인과 같은 실패 횟수·잠금 정책 적용
  verifySecondFactor: (account: AuthenticatedAccount, code: string | undefined) => Promise<void>;
  // 로그인한 상태에서 비밀번호를 다시 확인 (비밀번호·이메일 변경 전), 틀리면 로그인과 같은 실패 횟수·잠금 정책 적용
  verifyCurrentPassword: (account: AuthenticatedAccount, password: string) => Promise<void>;
  // 아이디·비밀번호 로그인이 설정되어 있는지 (소셜 로그인만 쓰는 계정은 false)
  hasPassword: (account: AuthenticatedAccount) => Promise<boolean>;
  // 소셜 로그인만 쓰는 계정이 아이디·비밀번호 로그인을 처음 설정, 이미 있으면 거부
  setPassword: (
    account: AuthenticatedAccount,
    input: { loginId: string; newPassword: string },
  ) => Promise<void>;
  // 이메일 인증을 마친 계정인지 (끝나기 전에는 인증 관련 요청 외의 API를 막는 데 씀)
  isEmailVerified: (account: AuthenticatedAccount) => Promise<boolean>;
  // 로그인한 관리자 정보 (회사 식별값은 응답에 없음)
  getMe: (account: AuthenticatedAccount) => Promise<MeResponse>;
};

type ServiceDeps = {
  // 회사 범위 밖 전용 계정 (로그인·가입처럼 회사를 아직 모르는 처리)
  auth: PrismaClient;
  // 앱 계정 (로그인 후 회사 범위 조회)
  app: PrismaClient;
  // 2단계 인증 확인 (없으면 모든 계정이 2단계 인증을 쓰지 않는 것으로 동작)
  totp?: Pick<TotpService, 'isEnabled' | 'verify'>;
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
  totp,
  now = () => new Date(),
}: ServiceDeps): AccountService => {
  const credentialKey = (credential: Pick<CredentialRow, 'companyId' | 'userId'>) => ({
    companyId_userId: { companyId: credential.companyId, userId: credential.userId },
  });

  // 실패 한 번을 기록하고 잠금 기준에 도달했는지 반환 (비밀번호와 2단계 인증 코드가 같은 횟수를 공유)
  const recordFailure = async (credential: CredentialRow, at: Date): Promise<boolean> => {
    const where = credentialKey(credential);
    // 잠금이 이미 풀린 뒤의 첫 실패는 횟수를 처음부터 다시 셈
    const expired = credential.lockedUntil !== null && credential.lockedUntil <= at;
    const updated = await auth.userCredential.update({
      where,
      data: expired
        ? { failedLoginCount: 1, lockedUntil: null }
        : { failedLoginCount: { increment: 1 } },
    });

    if (updated.failedLoginCount < MAX_FAILED_LOGINS) {
      return false;
    }

    await auth.userCredential.update({
      where,
      data: { lockedUntil: new Date(at.getTime() + LOGIN_LOCK_MS), failedLoginCount: 0 },
    });

    return true;
  };

  const clearFailures = async (credential: CredentialRow) => {
    if (credential.failedLoginCount > 0 || credential.lockedUntil) {
      await auth.userCredential.update({
        where: credentialKey(credential),
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }
  };

  // 2단계 인증 코드 확인과 실패 횟수·잠금 처리 (아이디 로그인과 비밀번호 재설정, 민감한 설정 변경이 같은 정책을 씀)
  const assertSecondFactor = async (
    account: AuthenticatedAccount,
    credential: CredentialRow | null,
    code: string | undefined,
    at: Date,
  ) => {
    if (credential?.lockedUntil && credential.lockedUntil > at) {
      throw new AccountError('ACCOUNT_LOCKED');
    }

    if (!code) {
      throw new AccountError('TOTP_REQUIRED');
    }

    if (!(await totp?.verify(account, code))) {
      // 소셜 로그인만 쓰는 계정은 실패 횟수를 담을 행이 없어 요청 횟수 제한에만 의존
      if (credential && (await recordFailure(credential, at))) {
        throw new AccountError('ACCOUNT_LOCKED');
      }

      throw new AccountError('TOTP_INVALID');
    }

    if (credential) {
      await clearFailures(credential);
    }
  };

  // 비밀번호 확인과 실패 횟수·잠금 처리 (로그인과 재확인이 같은 정책을 씀)
  // 2단계 인증이 남아 있는 로그인은 성공해도 횟수를 지우지 않음 (비밀번호를 아는 쪽이 코드를 무제한 시도하지 못하게 함)
  const assertPassword = async (
    credential: CredentialRow,
    password: string,
    at: Date,
    invalidCode: 'INVALID_CREDENTIALS' | 'CURRENT_PASSWORD_INVALID',
    keepFailures = false,
  ) => {
    if (!(await verifyPassword(credential.passwordHash ?? '', password))) {
      if (await recordFailure(credential, at)) {
        throw new AccountError('ACCOUNT_LOCKED');
      }

      throw new AccountError(invalidCode);
    }

    if (!keepFailures) {
      await clearFailures(credential);
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

          const emailOwner = await tx.user.findUnique({ where: { email: input.email } });

          // 복구 때 같은 이메일 재사용 허용 (이전 값은 링크 사용 시점에 비워짐)
          if (emailOwner && emailOwner.id !== invitation.userId) {
            throw new AccountError('EMAIL_TAKEN');
          }

          // 이메일 인증이 끝나기 전까지 계정 상태는 초대(INVITED)로 유지 (활성화는 P0-4)
          await tx.user.update({
            where: { companyId_id: { companyId: invitation.companyId, id: invitation.userId } },
            data: { email: input.email, ageConfirmedAt: at },
          });
          // 복구·소유자 이전은 비워 둔 기존 행 갱신, 새 가입은 행 생성
          await tx.userCredential.upsert({
            where: {
              companyId_userId: { companyId: invitation.companyId, userId: invitation.userId },
            },
            update: { loginId: input.loginId, passwordHash },
            create: {
              companyId: invitation.companyId,
              userId: invitation.userId,
              loginId: input.loginId,
              passwordHash,
            },
          });
          await recordConsents(tx, invitation, input.consents, at);

          return {
            userId: invitation.userId,
            companyId: invitation.companyId,
            email: input.email,
            previousEmail: invitation.previousEmail,
          };
        });
      } catch (error) {
        throw mapUniqueViolation(error) ?? error;
      }
    },

    login: async ({ loginId, password, totpCode }) => {
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

      const account = { userId: credential.userId, companyId: credential.companyId };
      const isTotpOn = (await totp?.isEnabled(account)) ?? false;

      await assertPassword(credential, password, at, 'INVALID_CREDENTIALS', isTotpOn);

      // 비밀번호가 맞은 뒤에만 코드를 요구 (코드 입력 칸이 필요한 계정인지는 비밀번호를 아는 사람에게만 알림)
      if (isTotpOn) {
        await assertSecondFactor(account, credential, totpCode, at);
      }

      // 해지 요청 중인 계정은 비밀번호가 맞을 때만 상태를 알려 주고(취소 링크 안내), 로그인은 막음
      if (credential.user.company.status === 'CLOSING') {
        throw new AccountError('ACCOUNT_CLOSING');
      }

      // 정지·삭제 완료된 회사는 로그인 차단 (사유는 알려 주지 않음)
      if (credential.user.company.status !== 'ACTIVE') {
        throw new AccountError('INVALID_CREDENTIALS');
      }

      return account;
    },

    verifySecondFactor: async (account, code) => {
      const credential = await auth.userCredential.findUnique({
        where: credentialKey(account),
      });

      await assertSecondFactor(account, credential, code, now());
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

    hasPassword: async ({ userId, companyId }) => {
      const credential = await auth.userCredential.findUnique({
        where: { companyId_userId: { companyId, userId } },
      });

      return Boolean(credential?.passwordHash);
    },

    setPassword: async ({ userId, companyId }, { loginId, newPassword }) => {
      const where = { companyId_userId: { companyId, userId } };
      const passwordHash = await hashPassword(newPassword);

      try {
        await auth.$transaction(async (tx) => {
          const credential = await tx.userCredential.findUnique({ where });

          if (credential?.passwordHash) {
            throw new AccountError('PASSWORD_ALREADY_SET');
          }

          await tx.userCredential.upsert({
            where,
            update: { loginId, passwordHash, failedLoginCount: 0, lockedUntil: null },
            create: { companyId, userId, loginId, passwordHash },
          });
        });
      } catch (error) {
        throw mapUniqueViolation(error) ?? error;
      }
    },

    isEmailVerified: async ({ userId, companyId }) => {
      const user = await auth.user.findFirst({
        where: { companyId, id: userId },
        select: { emailVerifiedAt: true },
      });

      return user?.emailVerifiedAt != null;
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
