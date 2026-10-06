import { createApp } from './app';
import { createAccountService } from './auth/accountService';
import {
  createEmailVerificationService,
  registerEmailVerificationWorker,
} from './auth/emailVerification';
import { createPrismaClient } from './db/client';
import { createSmtpMailer } from './email/mailer';
import { parseEnv } from './env';
import { createPrismaInvitationStore } from './invitation/invitationStore';
import { createLogger } from './logger';
import { createPgBossQueue } from './queue/jobQueue';
import { createPrismaSessionStore } from './session/sessionStore';

const main = async () => {
  const env = parseEnv();
  const logger = createLogger(env.LOG_LEVEL);

  // 회사 범위 밖 전용 계정은 세션·초대·인증 코드 처리에만 연결 (업무 쿼리는 withCompany 경로로만)
  const authPrisma = createPrismaClient(env.DATABASE_AUTH_URL);
  const sessionStore = createPrismaSessionStore(authPrisma);
  const invitationStore = createPrismaInvitationStore(authPrisma);
  // 로그인 후 회사 범위 조회는 앱 계정(RLS 적용)으로만 수행
  const accountService = createAccountService({
    auth: authPrisma,
    app: createPrismaClient(env.DATABASE_URL),
  });

  // 작업 큐와 처리기는 같은 프로세스에서 동작 (기술 기획서 §3). 큐는 전용 계정으로 접속
  const queue = await createPgBossQueue(env.DATABASE_QUEUE_URL, logger);
  const emailVerification = createEmailVerificationService({
    auth: authPrisma,
    queue,
    mailer: createSmtpMailer({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      from: env.SMTP_FROM,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
    }),
    secret: env.CODE_HASH_SECRET,
  });

  await registerEmailVerificationWorker(queue, emailVerification);

  const server = createApp({
    logger,
    sessionStore,
    invitationStore,
    accountService,
    emailVerification,
    appOrigin: env.APP_ORIGIN,
    isSecureCookie: env.NODE_ENV === 'production',
    isDocsEnabled: env.NODE_ENV === 'development',
  }).listen(env.PORT, () => {
    logger.info({ port: env.PORT }, '[api.main] 서버 시작');
  });

  // 종료 신호를 받으면 진행 중인 작업을 마무리하고 큐를 닫음
  const shutdown = () => {
    server.close();
    void queue.stop().finally(() => process.exit(0));
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
};

main().catch((error: unknown) => {
  console.error('[api.main] 서버 시작 실패', error instanceof Error ? error.message : error);
  process.exit(1);
});
