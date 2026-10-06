import { generateToken, hashToken } from '../auth/token';
import type { AccountService, AuthenticatedAccount } from '../auth/accountService';
import type { PrismaClient } from '../db/client';
import { buildClosureEmail } from '../email/accountEmails';
import type { Mailer } from '../email/mailer';
import type { SecurityNotifier } from '../email/securityNotice';
import type { JobQueue } from '../queue/jobQueue';

type Clock = () => Date;

export const CLOSURE_NOTICE_QUEUE = 'closure-notice.send';

// 해지 요청 후 삭제까지의 유예 기간 (서비스 기획서 §6.5)
export const CLOSURE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;

export class ClosureError extends Error {
  constructor(readonly code: 'NOT_ACTIVE' | 'LINK_INVALID' | 'PASSWORD_REQUIRED') {
    super(`[closure.service] ${code}`);
  }
}

export type ClosureService = {
  // 해지 요청: 즉시 로그인 차단·전 기기 로그아웃, 취소 링크 메일은 작업 큐로 발송
  request: (
    account: AuthenticatedAccount,
    currentPassword?: string,
  ) => Promise<{ purgeAfter: Date }>;
  // 작업 처리기에서 호출: 취소 링크 토큰을 만들어 해시를 저장하고 메일 발송
  deliverNotice: (account: AuthenticatedAccount) => Promise<void>;
  // 취소 링크 화면 진입 시 유효 여부와 삭제 예정 시각 (사용·만료·없는 링크는 구분하지 않음)
  info: (token: string) => Promise<{ purgeAfter: Date } | null>;
  // 해지 취소: 계정을 다시 활성화하고 취소 알림 메일 발송
  cancel: (token: string) => Promise<void>;
};

type Deps = {
  auth: PrismaClient;
  queue: JobQueue;
  mailer: Mailer;
  accountService: AccountService;
  notifier: SecurityNotifier;
  appOrigin: string;
  now?: Clock;
};

/**
 * @description 계정 해지 서비스 (회사 범위 밖 전용 계정으로 동작, 로그인이 막힌 사용자도 취소 링크로 접근해야 하기 때문)
 * 삭제 자체는 api가 하지 않고 삭제 전용 계정을 쓰는 점검 작업(`purge-due`)이 유예가 끝난 회사만 처리한다
 * @param deps 전용 계정 클라이언트, 작업 큐, 메일 발송기, 계정 서비스, 알림기
 * @returns 해지 서비스
 */
export const createClosureService = ({
  auth,
  queue,
  mailer,
  accountService,
  notifier,
  appOrigin,
  now = () => new Date(),
}: Deps): ClosureService => ({
  request: async (account, currentPassword) => {
    const at = now();
    const credential = await auth.userCredential.findUnique({
      where: { companyId_userId: { companyId: account.companyId, userId: account.userId } },
    });

    // 비밀번호 로그인이 있으면 다시 확인 (계정 탈취 시 해지로 데이터를 지우는 것을 막음)
    if (credential?.passwordHash) {
      if (!currentPassword) {
        throw new ClosureError('PASSWORD_REQUIRED');
      }

      await accountService.verifyCurrentPassword(account, currentPassword);
    }

    const purgeAfter = new Date(at.getTime() + CLOSURE_GRACE_MS);

    await auth.$transaction(async (tx) => {
      // 조건부 갱신으로 이미 해지 중이거나 정지·삭제된 회사의 중복 요청을 거부
      const { count } = await tx.company.updateMany({
        where: { id: account.companyId, status: 'ACTIVE' },
        data: { status: 'CLOSING' },
      });

      if (count !== 1) {
        throw new ClosureError('NOT_ACTIVE');
      }

      await tx.companyClosure.upsert({
        where: { companyId: account.companyId },
        update: {
          requestedAt: at,
          purgeAfter,
          cancelTokenHash: null,
          cancelledAt: null,
          purgedAt: null,
        },
        create: { companyId: account.companyId, requestedAt: at, purgeAfter },
      });
      // 요청 즉시 모든 기기를 로그아웃 (로그인 차단)
      await tx.session.deleteMany({ where: { companyId: account.companyId } });
    });

    await queue.send(CLOSURE_NOTICE_QUEUE, {
      companyId: account.companyId,
      userId: account.userId,
    });

    return { purgeAfter };
  },

  deliverNotice: async (account) => {
    const [user, closure] = await Promise.all([
      auth.user.findFirst({ where: { companyId: account.companyId, id: account.userId } }),
      auth.companyClosure.findUnique({ where: { companyId: account.companyId } }),
    ]);

    // 그 사이 취소되었거나 이미 삭제되었으면 보낼 이유가 없음 (재시도하지 않고 종료)
    if (!user?.email || !closure || closure.cancelledAt || closure.purgedAt) {
      return;
    }

    const token = generateToken();

    await auth.companyClosure.update({
      where: { companyId: account.companyId },
      data: { cancelTokenHash: hashToken(token) },
    });

    // 발송에 실패하면 예외가 작업 큐로 전달되어 재시도 (재시도마다 새 링크, 이전 링크는 즉시 무효)
    await mailer.send(
      buildClosureEmail(
        user.email,
        `${new URL(appOrigin).origin}/closure/cancel/${token}`,
        closure.purgeAfter,
      ),
    );
  },

  info: async (token) => {
    const closure = await auth.companyClosure.findUnique({
      where: { cancelTokenHash: hashToken(token) },
    });

    return closure && !closure.cancelledAt && !closure.purgedAt && closure.purgeAfter > now()
      ? { purgeAfter: closure.purgeAfter }
      : null;
  },

  cancel: async (token) => {
    const at = now();
    const tokenHash = hashToken(token);
    const closure = await auth.companyClosure.findUnique({ where: { cancelTokenHash: tokenHash } });

    if (!closure || closure.cancelledAt || closure.purgedAt || closure.purgeAfter <= at) {
      throw new ClosureError('LINK_INVALID');
    }

    await auth.$transaction(async (tx) => {
      // 한 번만 성공하도록 조건부로 폐기 (동시에 두 번 눌러도 한 쪽만 통과)
      const { count } = await tx.companyClosure.updateMany({
        where: {
          cancelTokenHash: tokenHash,
          cancelledAt: null,
          purgedAt: null,
          purgeAfter: { gt: at },
        },
        data: { cancelledAt: at, cancelTokenHash: null },
      });

      if (count !== 1) {
        throw new ClosureError('LINK_INVALID');
      }

      await tx.company.updateMany({
        where: { id: closure.companyId, status: 'CLOSING' },
        data: { status: 'ACTIVE' },
      });
    });

    const user = await auth.user.findFirst({ where: { companyId: closure.companyId } });

    if (user?.email) {
      await notifier.notify('CLOSURE_CANCELLED', user.email);
    }
  },
});

/**
 * @description 해지 안내 메일 발송 작업 처리기 등록
 * @param queue 작업 큐
 * @param service 해지 서비스
 */
export const registerClosureWorker = async (queue: JobQueue, service: ClosureService) => {
  await queue.register(CLOSURE_NOTICE_QUEUE, { retryLimit: 5, retryDelaySeconds: 30 });
  await queue.work<AuthenticatedAccount>(CLOSURE_NOTICE_QUEUE, (account) =>
    service.deliverNotice(account),
  );
};
