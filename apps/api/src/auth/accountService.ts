import type { MeResponse } from '@field-note/shared';

import type { PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';
import { findCurrentDocuments, validInvitationWhere } from '../invitation/invitationStore';

import { LOGIN_LOCK_MS, MAX_FAILED_LOGINS } from './loginPolicy';
import { hashPassword, verifyPassword } from './password';

type Clock = () => Date;

export type AccountErrorCode =
  | 'INVITATION_INVALID'
  | 'LOGIN_ID_TAKEN'
  | 'EMAIL_TAKEN'
  | 'CONSENT_REQUIRED'
  | 'CONSENT_UNKNOWN_DOCUMENT'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_NOT_FOUND';

// 업무 규칙 위반 (HTTP 응답으로의 변환은 라우트가 담당)
export class AccountError extends Error {
  constructor(readonly code: AccountErrorCode) {
    super(`[auth.accountService] ${code}`);
  }
}

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
export const createAccountService = ({
  auth,
  app,
  now = () => new Date(),
}: ServiceDeps): AccountService => ({
  signup: async (input) => {
    // 해시 계산은 느리므로 트랜잭션 밖에서 먼저 수행
    const passwordHash = await hashPassword(input.password);
    const at = now();

    try {
      return await auth.$transaction(async (tx) => {
        const invitation = await tx.invitation.findFirst({
          where: validInvitationWhere(input.inviteToken, at),
        });

        if (!invitation) {
          throw new AccountError('INVITATION_INVALID');
        }

        // 동시에 같은 링크를 쓰는 요청이 있어도 조건부 갱신이라 한 쪽만 통과
        const { count } = await tx.invitation.updateMany({
          where: { tokenHash: invitation.tokenHash, usedAt: null },
          data: { usedAt: at },
        });

        if (count !== 1) {
          throw new AccountError('INVITATION_INVALID');
        }

        // 필수 문서에 모두 동의해야 하고, 현재 시행 중이 아닌 문서에 대한 동의는 받지 않음
        const documents = await findCurrentDocuments(tx, at);
        const documentIds = new Set(documents.map((document) => document.id));

        if (input.consents.some((consent) => !documentIds.has(consent.documentId))) {
          throw new AccountError('CONSENT_UNKNOWN_DOCUMENT');
        }

        const agreedIds = new Set(
          input.consents.filter((consent) => consent.isAgreed).map((consent) => consent.documentId),
        );

        if (documents.some((document) => document.isRequired && !agreedIds.has(document.id))) {
          throw new AccountError('CONSENT_REQUIRED');
        }

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
        await tx.consent.createMany({
          data: input.consents.map((consent) => ({
            companyId: invitation.companyId,
            userId: invitation.userId,
            documentId: consent.documentId,
            isAgreed: consent.isAgreed,
            decidedAt: at,
          })),
        });

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

    const where = {
      companyId_userId: { companyId: credential.companyId, userId: credential.userId },
    };

    if (!(await verifyPassword(credential.passwordHash, password))) {
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

      throw new AccountError('INVALID_CREDENTIALS');
    }

    // 정지·해지 요청 중인 회사는 로그인 차단 (사유는 알려 주지 않음)
    if (credential.user.company.status !== 'ACTIVE') {
      throw new AccountError('INVALID_CREDENTIALS');
    }

    if (credential.failedLoginCount > 0 || credential.lockedUntil) {
      await auth.userCredential.update({ where, data: { failedLoginCount: 0, lockedUntil: null } });
    }

    return { userId: credential.userId, companyId: credential.companyId };
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
});
