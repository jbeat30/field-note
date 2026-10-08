import { createApp } from './app';
import { createAccountService } from './auth/accountService';
import {
  createEmailVerificationService,
  registerEmailVerificationWorker,
} from './auth/emailVerification';
import { createSocialService } from './auth/socialService';
import { createPasswordService, registerPasswordResetWorker } from './auth/passwordService';
import { createClosureService, registerClosureWorker } from './closure/closureService';
import { createCompanySettingsService } from './company/companySettingsService';
import { createOptionService } from './company/optionService';
import { createEmployeeService } from './employee/employeeService';
import { createAssignmentService } from './assignment/assignmentService';
import { createWorkLogService } from './workLog/workLogService';
import { createPartnerService } from './partner/partnerService';
import { createProjectService } from './project/projectService';
import { createPrismaClient } from './db/client';
import { createSmtpMailer } from './email/mailer';
import { createSecurityNotifier, registerSecurityNoticeWorker } from './email/securityNotice';
import { parseEnv } from './env';
import { createFileService, registerFileWorker } from './file/fileService';
import { createPhotoService } from './photo/photoService';
import { createPrismaInvitationStore } from './invitation/invitationStore';
import { createLogger } from './logger';
import { chooseSocialProvider } from './social/provider';
import { createPgBossQueue } from './queue/jobQueue';
import { createPrismaSessionStore } from './session/sessionStore';
import { createS3Storage } from './storage/objectStorage';

const main = async () => {
  const env = parseEnv();
  const logger = createLogger(env.LOG_LEVEL);

  // 회사 범위 밖 전용 계정은 세션·초대·인증 코드 처리에만 연결 (업무 쿼리는 withCompany 경로로만)
  const authPrisma = createPrismaClient(env.DATABASE_AUTH_URL);
  const sessionStore = createPrismaSessionStore(authPrisma);
  const invitationStore = createPrismaInvitationStore(authPrisma);
  // 로그인 후 회사 범위 조회는 앱 계정(RLS 적용)으로만 수행
  const appPrisma = createPrismaClient(env.DATABASE_URL);
  const accountService = createAccountService({ auth: authPrisma, app: appPrisma });
  const companySettings = createCompanySettingsService(appPrisma);
  const options = createOptionService(appPrisma);
  const employees = createEmployeeService(appPrisma);
  const partners = createPartnerService(appPrisma);
  const projects = createProjectService(appPrisma);
  const assignments = createAssignmentService(appPrisma);
  const workLogs = createWorkLogService(appPrisma);

  // 작업 큐와 처리기는 같은 프로세스에서 동작 (기술 기획서 §3). 큐는 전용 계정으로 접속
  const queue = await createPgBossQueue(env.DATABASE_QUEUE_URL, logger);
  // 객체 저장소 (로컬은 버킷이 없으면 만든다. 운영은 운영자가 버킷을 미리 준비)
  const { storage, ensureBucket } = createS3Storage({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
  });

  if (env.NODE_ENV !== 'production') {
    await ensureBucket(env.APP_ORIGIN);
  }

  const files = createFileService({ app: appPrisma, storage, queue });
  const photos = createPhotoService(appPrisma, storage);
  const mailer = createSmtpMailer({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    from: env.SMTP_FROM,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
  });
  const emailVerification = createEmailVerificationService({
    auth: authPrisma,
    queue,
    mailer,
    secret: env.CODE_HASH_SECRET,
  });
  const notifier = createSecurityNotifier(queue);
  const passwordService = createPasswordService({
    auth: authPrisma,
    queue,
    mailer,
    accountService,
    sessionStore,
    notifier,
    appOrigin: env.APP_ORIGIN,
  });

  // 카카오 키가 있으면 카카오, 없고 개발 환경이면 가짜 제공자, 운영에서 키가 없으면 소셜 로그인은 꺼짐
  const socialChoice = chooseSocialProvider({
    nodeEnv: env.NODE_ENV,
    appOrigin: env.APP_ORIGIN,
    kakao: { clientId: env.KAKAO_CLIENT_ID, clientSecret: env.KAKAO_CLIENT_SECRET },
    fakeSecret: env.OAUTH_COOKIE_SECRET,
  });

  logger.info({ socialProvider: socialChoice.kind }, '[api.main] 소셜 로그인 제공자');

  const closure = createClosureService({
    auth: authPrisma,
    queue,
    mailer,
    accountService,
    notifier,
    appOrigin: env.APP_ORIGIN,
  });

  await registerClosureWorker(queue, closure);
  await registerFileWorker(queue, files);
  await registerEmailVerificationWorker(queue, emailVerification);
  await registerPasswordResetWorker(queue, passwordService);
  await registerSecurityNoticeWorker(queue, mailer);

  const server = createApp({
    logger,
    sessionStore,
    invitationStore,
    accountService,
    emailVerification,
    passwordService,
    companySettings,
    options,
    employees,
    partners,
    projects,
    assignments,
    workLogs,
    files,
    photos,
    closure,
    social: {
      choice: socialChoice,
      service: createSocialService({ auth: authPrisma }),
      cookieSecret: env.OAUTH_COOKIE_SECRET,
      fakeSecret: socialChoice.kind === 'fake' ? env.OAUTH_COOKIE_SECRET : undefined,
    },
    notifier,
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
