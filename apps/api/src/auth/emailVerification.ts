import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import type { PrismaClient } from '../db/client';
import type { Mailer } from '../email/mailer';
import { buildVerificationEmail } from '../email/verificationEmail';
import type { JobQueue } from '../queue/jobQueue';

type Clock = () => Date;

export const EMAIL_VERIFICATION_QUEUE = 'email-verification.send';

// 정책 (서비스 기획서 §6.7: 유효시간 10분 안팎, 재발송 간격과 시도 횟수 제한)
export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_INTERVAL_MS = 30 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_REQUESTS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

export type EmailVerificationErrorCode =
  'ALREADY_VERIFIED' | 'NO_EMAIL' | 'RESEND_TOO_SOON' | 'HOURLY_LIMIT' | 'CODE_INVALID';

export class EmailVerificationError extends Error {
  constructor(
    readonly code: EmailVerificationErrorCode,
    // 다시 요청할 수 있기까지 남은 초 (제한 오류에만 값이 있음)
    readonly retryAfterSeconds?: number,
  ) {
    super(`[auth.emailVerification] ${code}`);
  }
}

type Account = { userId: string; companyId: string };

export type EmailVerificationService = {
  // 인증 코드 발송 요청: 제한을 확인하고 기록한 뒤 작업 큐에 넣음 (코드 생성·발송은 작업 처리기)
  request: (account: Account) => Promise<{ resendAfterSeconds: number }>;
  // 작업 처리기에서 호출: 새 코드를 만들어 해시를 저장하고 메일 발송
  deliver: (account: Account) => Promise<void>;
  // 코드 확인: 성공하면 이메일 인증 완료와 계정 활성화
  verify: (account: Account, code: string) => Promise<void>;
};

type Deps = {
  auth: PrismaClient;
  queue: JobQueue;
  mailer: Mailer;
  // 코드 해시용 서버 비밀 값
  secret: string;
  now?: Clock;
};

const hashCode = (secret: string, account: Account, code: string) =>
  // 계정마다 다른 해시가 되도록 계정 식별자를 섞음
  createHmac('sha256', secret)
    .update(`${account.companyId}:${account.userId}:${code}`)
    .digest('hex');

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * @description 이메일 인증 코드 서비스 (회사 범위 밖 전용 계정으로 동작)
 * 코드 원문은 큐·DB·로그에 남기지 않는다: 작업 처리기가 발송 직전에 만들고 해시만 저장
 * @param deps 전용 계정 클라이언트, 작업 큐, 메일 발송기, 비밀 값
 * @returns 이메일 인증 서비스
 */
export const createEmailVerificationService = ({
  auth,
  queue,
  mailer,
  secret,
  now = () => new Date(),
}: Deps): EmailVerificationService => ({
  request: async (account) => {
    const at = now();

    await auth.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { companyId: account.companyId, id: account.userId },
      });

      if (!user) {
        throw new EmailVerificationError('NO_EMAIL');
      }

      if (user.emailVerifiedAt) {
        throw new EmailVerificationError('ALREADY_VERIFIED');
      }

      if (!user.email) {
        throw new EmailVerificationError('NO_EMAIL');
      }

      const existing = await tx.emailVerification.findUnique({
        where: { companyId_userId: { companyId: account.companyId, userId: account.userId } },
      });

      if (existing) {
        const waitMs = existing.lastRequestedAt.getTime() + RESEND_INTERVAL_MS - at.getTime();

        if (waitMs > 0) {
          throw new EmailVerificationError('RESEND_TOO_SOON', Math.ceil(waitMs / 1000));
        }

        const isSameWindow = existing.windowStartedAt.getTime() + HOUR_MS > at.getTime();

        if (isSameWindow && existing.requestCount >= MAX_REQUESTS_PER_HOUR) {
          throw new EmailVerificationError(
            'HOURLY_LIMIT',
            Math.ceil((existing.windowStartedAt.getTime() + HOUR_MS - at.getTime()) / 1000),
          );
        }

        await tx.emailVerification.update({
          where: { companyId_userId: { companyId: account.companyId, userId: account.userId } },
          data: {
            email: user.email,
            lastRequestedAt: at,
            ...(isSameWindow
              ? { requestCount: { increment: 1 } }
              : { requestCount: 1, windowStartedAt: at }),
          },
        });

        return;
      }

      await tx.emailVerification.create({
        data: {
          companyId: account.companyId,
          userId: account.userId,
          email: user.email,
          lastRequestedAt: at,
          windowStartedAt: at,
        },
      });
    });

    await queue.send(EMAIL_VERIFICATION_QUEUE, {
      companyId: account.companyId,
      userId: account.userId,
    });

    return { resendAfterSeconds: RESEND_INTERVAL_MS / 1000 };
  },

  deliver: async (account) => {
    const at = now();
    const user = await auth.user.findFirst({
      where: { companyId: account.companyId, id: account.userId },
    });

    // 그 사이 인증이 끝났거나 계정이 없으면 보낼 이유가 없음 (재시도하지 않고 종료)
    if (!user?.email || user.emailVerifiedAt) {
      return;
    }

    // 6자리 균등 난수 (앞자리가 0이어도 유지)
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

    // 요청 기록이 없는 채로 작업이 도착해도(예: 요청 직후 기록 유실) 새로 만들어 처리
    const fields = {
      email: user.email,
      codeHash: hashCode(secret, account, code),
      expiresAt: new Date(at.getTime() + CODE_TTL_MS),
      attempts: 0,
    };

    await auth.emailVerification.upsert({
      where: { companyId_userId: { companyId: account.companyId, userId: account.userId } },
      update: fields,
      create: {
        companyId: account.companyId,
        userId: account.userId,
        lastRequestedAt: at,
        windowStartedAt: at,
        ...fields,
      },
    });

    // 발송에 실패하면 예외가 작업 큐로 전달되어 재시도 (재시도마다 새 코드)
    await mailer.send(buildVerificationEmail(user.email, code, CODE_TTL_MS / 60_000));
  },

  verify: async (account, code) => {
    const at = now();

    await auth
      .$transaction(async (tx) => {
        const where = {
          companyId_userId: { companyId: account.companyId, userId: account.userId },
        };
        const record = await tx.emailVerification.findUnique({ where });
        const user = await tx.user.findFirst({
          where: { companyId: account.companyId, id: account.userId },
        });

        if (user?.emailVerifiedAt) {
          throw new EmailVerificationError('ALREADY_VERIFIED');
        }

        // 이메일이 바뀌었거나 코드가 없거나 만료되었거나 시도 횟수를 넘긴 경우는 같은 오류
        const isUsable =
          record?.codeHash &&
          record.expiresAt &&
          record.expiresAt > at &&
          record.attempts < MAX_CODE_ATTEMPTS &&
          record.email === user?.email;

        if (!isUsable) {
          throw new EmailVerificationError('CODE_INVALID');
        }

        if (!safeEqual(record.codeHash!, hashCode(secret, account, code))) {
          await tx.emailVerification.update({ where, data: { attempts: { increment: 1 } } });

          // 실패 횟수 기록을 롤백하지 않도록 트랜잭션 밖에서 오류 처리
          return 'MISMATCH' as const;
        }

        await tx.user.update({
          where: { companyId_id: { companyId: account.companyId, id: account.userId } },
          data: { emailVerifiedAt: at, status: 'ACTIVE' },
        });
        // 사용한 코드는 즉시 무효화
        await tx.emailVerification.update({
          where,
          data: { codeHash: null, expiresAt: null, attempts: 0 },
        });

        return 'VERIFIED' as const;
      })
      .then((result) => {
        if (result === 'MISMATCH') {
          throw new EmailVerificationError('CODE_INVALID');
        }
      });
  },
});

/**
 * @description 이메일 인증 발송 작업 처리기 등록
 * @param queue 작업 큐
 * @param service 이메일 인증 서비스
 */
export const registerEmailVerificationWorker = async (
  queue: JobQueue,
  service: EmailVerificationService,
) => {
  // 발송 실패 시 30초부터 시작해 지수적으로 늘려 5번까지 재시도
  await queue.register(EMAIL_VERIFICATION_QUEUE, { retryLimit: 5, retryDelaySeconds: 30 });
  await queue.work<Account>(EMAIL_VERIFICATION_QUEUE, (account) => service.deliver(account));
};
