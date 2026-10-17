import { createApp } from './app';
import { createAccountService } from './auth/accountService';
import { createTotpService } from './auth/totpService';
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
import { createDashboardService } from './dashboard/dashboardService';
import { createCompletionService } from './completion/completionService';
import { createChangeWorkService } from './changeWork/changeWorkService';
import { createWarrantyService } from './warranty/warrantyService';
import { createRepairService } from './repair/repairService';
import { createMonthlyService } from './monthly/monthlyService';
import { createLaborService } from './labor/laborService';
import { createProgressService } from './progress/progressService';
import { createWorkLogService } from './workLog/workLogService';
import { createPartnerService } from './partner/partnerService';
import { createProjectService } from './project/projectService';
import { createPrismaClient } from './db/client';
import { createSmtpMailer } from './email/mailer';
import { createSecurityNotifier, registerSecurityNoticeWorker } from './email/securityNotice';
import { parseEnv } from './env';
import { createFileService, registerFileWorker } from './file/fileService';
import { createReportService } from './report/reportService';
import { createSearchService } from './search/searchService';
import { createDocumentService } from './document/documentService';
import { createPrismaIdempotencyStore } from './http/idempotencyStore';
import { createMaintenance, startMaintenanceSchedule } from './maintenance/maintenance';
import { createMaterialService } from './material/materialService';
import { createLedgerService } from './ledger/ledgerService';
import { createCompanyDataService } from './companyData/companyDataService';
import { createMemoService } from './memo/memoService';
import { createPhotoService } from './photo/photoService';
import { createPrismaInvitationStore } from './invitation/invitationStore';
import { createLogger } from './logger';
import { chooseSocialProviders } from './social/provider';
import { createPgBossQueue } from './queue/jobQueue';
import { createPrismaSessionStore } from './session/sessionStore';
import { createAuditService } from './audit/auditService';
import { createCredentialService } from './credential/credentialService';
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
  const totp = createTotpService({
    auth: authPrisma,
    secretKey: env.TOTP_ENCRYPTION_KEY,
    issuer: '필드노트',
  });
  const accountService = createAccountService({ auth: authPrisma, app: appPrisma, totp });
  const companySettings = createCompanySettingsService(appPrisma);
  const options = createOptionService(appPrisma);
  const employees = createEmployeeService(appPrisma);
  const partners = createPartnerService(appPrisma);
  const projects = createProjectService(appPrisma);
  const assignments = createAssignmentService(appPrisma);
  const workLogs = createWorkLogService(appPrisma);
  const progress = createProgressService(appPrisma);
  const labor = createLaborService(appPrisma);
  const changeWorks = createChangeWorkService(appPrisma);
  const warranty = createWarrantyService(appPrisma);
  const repairs = createRepairService(appPrisma);
  const monthly = createMonthlyService(appPrisma);

  // 작업 큐와 처리기는 같은 프로세스에서 동작, 큐는 전용 계정으로 접속
  const queue = await createPgBossQueue(env.DATABASE_QUEUE_URL, logger);
  // 객체 저장소 (로컬은 버킷이 없으면 생성, 운영은 운영자가 버킷을 사전 준비)
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
  const memos = createMemoService(appPrisma);
  const materials = createMaterialService(appPrisma);
  const ledger = createLedgerService(appPrisma);
  const companyData = createCompanyDataService({
    auth: authPrisma,
    app: appPrisma,
    accountService,
  });
  const documents = createDocumentService(appPrisma, storage);
  const credentials = createCredentialService({ app: appPrisma, storage });
  const audit = createAuditService(appPrisma);
  const search = createSearchService(appPrisma);
  const reports = createReportService(appPrisma, storage);
  const completion = createCompletionService(appPrisma, storage);
  const dashboard = createDashboardService(appPrisma, assignments);
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
    totp,
    sessionStore,
    notifier,
    appOrigin: env.APP_ORIGIN,
  });

  // 제공자별로 키가 있으면 실제 제공자, 없고 개발 환경이면 가짜 제공자, 운영에서 키가 없으면 해당 로그인은 꺼짐
  const socialChoices = chooseSocialProviders({
    nodeEnv: env.NODE_ENV,
    appOrigin: env.APP_ORIGIN,
    keys: {
      kakao: { clientId: env.KAKAO_CLIENT_ID, clientSecret: env.KAKAO_CLIENT_SECRET },
      naver: { clientId: env.NAVER_CLIENT_ID, clientSecret: env.NAVER_CLIENT_SECRET },
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    },
    fakeSecret: env.OAUTH_COOKIE_SECRET,
  });

  logger.info(
    {
      socialProviders: Object.fromEntries(
        Object.entries(socialChoices).map(([name, choice]) => [name, choice.kind]),
      ),
    },
    '[api.main] 소셜 로그인 제공자',
  );

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
    // 서버 재시작·다중 인스턴스에서도 재전송을 한 번만 처리하도록 키를 DB에 저장
    idempotencyStore: createPrismaIdempotencyStore(appPrisma),
    sessionStore,
    invitationStore,
    accountService,
    totp,
    emailVerification,
    passwordService,
    companySettings,
    options,
    employees,
    partners,
    projects,
    assignments,
    workLogs,
    progress,
    labor,
    changeWorks,
    warranty,
    repairs,
    monthly,
    credentials,
    audit,
    completion,
    dashboard,
    files,
    photos,
    memos,
    materials,
    ledger,
    companyData,
    documents,
    search,
    reports,
    closure,
    social: {
      choices: socialChoices,
      service: createSocialService({ auth: authPrisma }),
      cookieSecret: env.OAUTH_COOKIE_SECRET,
      fakeSecret: Object.values(socialChoices).some((choice) => choice.kind === 'fake')
        ? env.OAUTH_COOKIE_SECRET
        : undefined,
    },
    notifier,
    appOrigin: env.APP_ORIGIN,
    isSecureCookie: env.NODE_ENV === 'production',
    trustProxyHops: env.TRUST_PROXY_HOPS,
    isDocsEnabled: env.NODE_ENV === 'development',
  }).listen(env.PORT, () => {
    logger.info({ port: env.PORT }, '[api.main] 서버 시작');
  });

  // 만료 세션·방치된 업로드 신청·만료 멱등 키 정기 정리 (시작 직후 한 번, 이후 1시간마다)
  const stopMaintenance = startMaintenanceSchedule(
    createMaintenance({ auth: authPrisma, app: appPrisma, sessionStore, storage, logger }),
    logger,
  );

  // 종료 신호를 받으면 진행 중인 작업을 마무리하고 큐를 닫음
  const shutdown = () => {
    stopMaintenance();
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
