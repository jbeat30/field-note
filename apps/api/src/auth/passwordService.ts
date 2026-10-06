import type { PrismaClient } from '../db/client';
import { buildPasswordResetEmail } from '../email/accountEmails';
import type { Mailer } from '../email/mailer';
import type { SecurityNotifier } from '../email/securityNotice';
import type { JobQueue } from '../queue/jobQueue';
import type { SessionStore } from '../session/sessionStore';

import type { AccountService, AuthenticatedAccount } from './accountService';
import { hashPassword } from './password';
import { generateToken, hashToken } from './token';

type Clock = () => Date;

export const PASSWORD_RESET_QUEUE = 'password-reset.send';

// 정책: 링크는 짧게(30분), 요청은 1분 간격·시간당 5번
export const RESET_TTL_MS = 30 * 60 * 1000;
export const RESET_REQUEST_INTERVAL_MS = 60 * 1000;
export const MAX_RESET_REQUESTS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

export class PasswordError extends Error {
  constructor(readonly code: 'RESET_LINK_INVALID') {
    super(`[auth.passwordService] ${code}`);
  }
}

export type PasswordService = {
  // 재설정 메일 요청. 가입 여부·제한 초과와 관계없이 항상 같은 결과를 돌려줘 계정 존재를 알 수 없게 함
  requestReset: (email: string) => Promise<void>;
  // 작업 처리기에서 호출: 링크 토큰을 만들어 해시를 저장하고 메일 발송
  deliverReset: (account: AuthenticatedAccount) => Promise<void>;
  // 링크 화면 진입 시 유효 여부 확인 (사용·만료·없는 링크는 구분하지 않음)
  isResetLinkValid: (token: string) => Promise<boolean>;
  // 새 비밀번호 설정: 링크 폐기, 실패 횟수·잠금 해제, 모든 기기 로그아웃, 완료 알림
  confirmReset: (token: string, newPassword: string) => Promise<void>;
  // 로그인한 상태의 변경: 현재 비밀번호를 확인하고, 현재 기기만 남기고 다른 기기 로그아웃, 알림
  changePassword: (
    account: AuthenticatedAccount,
    input: { currentPassword: string; newPassword: string; currentSessionToken: string },
  ) => Promise<void>;
};

type Deps = {
  auth: PrismaClient;
  queue: JobQueue;
  mailer: Mailer;
  accountService: AccountService;
  sessionStore: SessionStore;
  notifier: SecurityNotifier;
  // 재설정 링크의 웹 주소
  appOrigin: string;
  now?: Clock;
};

/**
 * @description 비밀번호 재설정·변경 서비스 (회사 범위 밖 전용 계정으로 동작)
 * @param deps 전용 계정 클라이언트, 작업 큐, 메일 발송기, 세션 저장소, 알림기
 * @returns 비밀번호 서비스
 */
export const createPasswordService = ({
  auth,
  queue,
  mailer,
  accountService,
  sessionStore,
  notifier,
  appOrigin,
  now = () => new Date(),
}: Deps): PasswordService => ({
  requestReset: async (email) => {
    const at = now();
    const user = await auth.user.findUnique({
      where: { email },
      include: { credential: true, company: true },
    });

    // 이메일 인증을 마친 일반(아이디) 계정만 대상. 그 외에는 아무 일도 하지 않고 같은 결과를 돌려줌
    if (
      !user?.emailVerifiedAt ||
      !user.credential?.passwordHash ||
      user.company.status !== 'ACTIVE'
    ) {
      return;
    }

    const where = { companyId_userId: { companyId: user.companyId, userId: user.id } };
    const existing = await auth.passwordReset.findUnique({ where });

    if (existing) {
      const isTooSoon =
        existing.lastRequestedAt.getTime() + RESET_REQUEST_INTERVAL_MS > at.getTime();
      const isSameWindow = existing.windowStartedAt.getTime() + HOUR_MS > at.getTime();

      // 제한에 걸려도 응답은 같게 하고 조용히 무시 (제한 여부로 계정 존재를 알리지 않음)
      if (isTooSoon || (isSameWindow && existing.requestCount >= MAX_RESET_REQUESTS_PER_HOUR)) {
        return;
      }

      await auth.passwordReset.update({
        where,
        data: {
          lastRequestedAt: at,
          ...(isSameWindow
            ? { requestCount: { increment: 1 } }
            : { requestCount: 1, windowStartedAt: at }),
        },
      });
    } else {
      await auth.passwordReset.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          lastRequestedAt: at,
          windowStartedAt: at,
        },
      });
    }

    await queue.send(PASSWORD_RESET_QUEUE, { companyId: user.companyId, userId: user.id });
  },

  deliverReset: async (account) => {
    const at = now();
    const user = await auth.user.findFirst({
      where: { companyId: account.companyId, id: account.userId },
    });

    if (!user?.email || !user.emailVerifiedAt) {
      return;
    }

    const token = generateToken();

    await auth.passwordReset.update({
      where: { companyId_userId: { companyId: account.companyId, userId: account.userId } },
      data: { tokenHash: hashToken(token), expiresAt: new Date(at.getTime() + RESET_TTL_MS) },
    });

    // 발송에 실패하면 예외가 작업 큐로 전달되어 재시도 (재시도마다 새 링크, 이전 링크는 즉시 무효)
    await mailer.send(
      buildPasswordResetEmail(
        user.email,
        `${new URL(appOrigin).origin}/reset-password/${token}`,
        RESET_TTL_MS / 60_000,
      ),
    );
  },

  isResetLinkValid: async (token) => {
    const record = await auth.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });

    return Boolean(record?.expiresAt && record.expiresAt > now());
  },

  confirmReset: async (token, newPassword) => {
    const at = now();
    const tokenHash = hashToken(token);
    const record = await auth.passwordReset.findUnique({ where: { tokenHash } });

    if (!record?.expiresAt || record.expiresAt <= at) {
      throw new PasswordError('RESET_LINK_INVALID');
    }

    const passwordHash = await hashPassword(newPassword);

    // 링크 폐기, 비밀번호 교체, 잠금 해제, 모든 기기 로그아웃을 한 번에 처리 (하나라도 실패하면 전부 취소)
    await auth.$transaction(async (tx) => {
      // 한 번만 성공하도록 조건부로 폐기 (동시에 두 번 눌러도 한 쪽만 통과)
      const { count } = await tx.passwordReset.updateMany({
        where: { tokenHash, expiresAt: { gt: at } },
        data: { tokenHash: null, expiresAt: null },
      });

      if (count !== 1) {
        throw new PasswordError('RESET_LINK_INVALID');
      }

      await tx.userCredential.update({
        where: { companyId_userId: { companyId: record.companyId, userId: record.userId } },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      });
      await tx.session.deleteMany({
        where: { companyId: record.companyId, userId: record.userId },
      });
    });

    const user = await auth.user.findFirst({
      where: { companyId: record.companyId, id: record.userId },
    });

    if (user?.email) {
      await notifier.notify('PASSWORD_RESET_DONE', user.email);
    }
  },

  changePassword: async (account, { currentPassword, newPassword, currentSessionToken }) => {
    await accountService.verifyCurrentPassword(account, currentPassword);

    await auth.userCredential.update({
      where: { companyId_userId: { companyId: account.companyId, userId: account.userId } },
      data: {
        passwordHash: await hashPassword(newPassword),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await sessionStore.deleteByUserExcept(account.userId, currentSessionToken);

    const user = await auth.user.findFirst({
      where: { companyId: account.companyId, id: account.userId },
    });

    if (user?.email) {
      await notifier.notify('PASSWORD_CHANGED', user.email);
    }
  },
});

/**
 * @description 비밀번호 재설정 메일 발송 작업 처리기 등록
 * @param queue 작업 큐
 * @param service 비밀번호 서비스
 */
export const registerPasswordResetWorker = async (queue: JobQueue, service: PasswordService) => {
  await queue.register(PASSWORD_RESET_QUEUE, { retryLimit: 5, retryDelaySeconds: 30 });
  await queue.work<AuthenticatedAccount>(PASSWORD_RESET_QUEUE, (account) =>
    service.deliverReset(account),
  );
};
