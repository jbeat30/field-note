import cookieParser from 'cookie-parser';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import { csrfGuard } from './http/csrf';
import { createErrorHandler, notFoundHandler } from './http/errorHandler';
import { createMemoryIdempotencyStore, type IdempotencyStore } from './http/idempotency';
import { API_PREFIX, generateOpenApiDocument } from './http/openapi';
import { createRouteRegistry } from './http/route';
import type { AuthResolver } from './http/types';
import type { AccountService } from './auth/accountService';
import type { ClosureService } from './closure/closureService';
import { registerClosureRoutes } from './routes/closure';
import { registerEmployeeRoutes } from './routes/employees';
import { registerAssignmentRoutes } from './routes/assignments';
import { registerOptionRoutes } from './routes/options';
import { registerWorkLogRoutes } from './routes/workLogs';
import { registerPartnerRoutes } from './routes/partners';
import { registerProjectRoutes } from './routes/projects';
import type { CompanySettingsService } from './company/companySettingsService';
import type { OptionService } from './company/optionService';
import type { EmployeeService } from './employee/employeeService';
import type { AssignmentService } from './assignment/assignmentService';
import type { WorkLogService } from './workLog/workLogService';
import type { PartnerService } from './partner/partnerService';
import type { ProjectService } from './project/projectService';
import type { EmailVerificationService } from './auth/emailVerification';
import type { PasswordService } from './auth/passwordService';
import type { SecurityNotifier } from './email/securityNotice';
import type { InvitationStore } from './invitation/invitationStore';
import { createLogger, type Logger } from './logger';
import { registerAccountRoutes } from './routes/account';
import { registerSocialRoutes } from './routes/social';
import type { SocialService } from './auth/socialService';
import { mountFakeKakaoRoutes } from './social/fakeKakaoRoutes';
import type { SocialProviderChoice } from './social/provider';
import { registerAuthRoutes } from './routes/auth';
import { registerHealthRoutes } from './routes/health';
import { registerSampleRoutes } from './routes/samples';
import { createMemorySessionStore, type SessionStore } from './session/sessionStore';
import { createSessionResolver } from './session/cookie';

export type AppOptions = {
  // 기본은 세션 저장소의 쿠키 해석기 (테스트에서 교체 가능)
  resolveAuth?: AuthResolver;
  // 운영은 PostgreSQL 저장소를 주입, 기본은 메모리 저장소
  sessionStore?: SessionStore;
  // 없으면 초대 확인 API는 501 (운영은 PostgreSQL 저장소를 주입)
  invitationStore?: InvitationStore;
  // 없으면 가입·로그인·내 정보 API는 501
  accountService?: AccountService;
  // 없으면 이메일 인증 확인·재발송 API는 501
  emailVerification?: EmailVerificationService;
  // 없으면 비밀번호 재설정·변경 API는 501
  passwordService?: PasswordService;
  // 없으면 계정 해지 API는 501
  closure?: ClosureService;
  // 없으면 회사 설정 API는 501
  companySettings?: CompanySettingsService;
  options?: OptionService;
  employees?: EmployeeService;
  partners?: PartnerService;
  projects?: ProjectService;
  assignments?: AssignmentService;
  workLogs?: WorkLogService;
  // 소셜 로그인 설정 (없으면 소셜 로그인 API는 501)
  social?: {
    choice: SocialProviderChoice;
    service: SocialService;
    // 진행 상태 쿠키 암호화용 서버 비밀 값
    cookieSecret: string;
    // 개발 환경에서 가짜 제공자를 쓸 때만 지정 (가짜 로그인 화면을 켬)
    fakeSecret?: string;
  };
  // 계정 보안 변경 알림 요청기 (없으면 알림 생략)
  notifier?: SecurityNotifier;
  // CSRF Origin 검증 기준 웹 주소
  appOrigin?: string;
  isSecureCookie?: boolean;
  idempotencyStore?: IdempotencyStore;
  logger?: Logger;
  // 개발 환경에서만 API 문서 화면 제공
  isDocsEnabled?: boolean;
};

/**
 * @description 라우트 등록소 생성과 모든 라우트 등록 (OpenAPI 생성·일치 테스트에서도 사용)
 * @param options 앱 의존성
 * @returns 라우트 등록소
 */
export const createRegistry = (options: AppOptions = {}) => {
  const sessionStore = options.sessionStore ?? createMemorySessionStore();
  const registry = createRouteRegistry({
    resolveAuth: options.resolveAuth ?? createSessionResolver(sessionStore),
    idempotencyStore: options.idempotencyStore ?? createMemoryIdempotencyStore(),
  });

  registerHealthRoutes(registry);
  registerSampleRoutes(registry);
  registerAccountRoutes(registry, {
    invitationStore: options.invitationStore,
    accountService: options.accountService,
    emailVerification: options.emailVerification,
    passwordService: options.passwordService,
    companySettings: options.companySettings,
    notifier: options.notifier,
    logger: options.logger,
    sessionStore,
    isSecureCookie: options.isSecureCookie,
  });
  registerClosureRoutes(registry, options.closure);
  registerOptionRoutes(registry, options.options);
  registerEmployeeRoutes(registry, options.employees);
  registerPartnerRoutes(registry, options.partners);
  registerProjectRoutes(registry, options.projects);
  registerAssignmentRoutes(registry, options.assignments);
  registerWorkLogRoutes(registry, options.workLogs);
  registerSocialRoutes(
    registry,
    options.social && options.accountService
      ? {
          choice: options.social.choice,
          socialService: options.social.service,
          accountService: options.accountService,
          sessionStore,
          invitationStore: options.invitationStore,
          cookieSecret: options.social.cookieSecret,
          appOrigin: options.appOrigin ?? 'http://localhost:5173',
          isSecureCookie: options.isSecureCookie ?? false,
          logger: options.logger,
        }
      : undefined,
  );
  registerAuthRoutes(registry, { sessionStore, isSecureCookie: options.isSecureCookie ?? false });

  return registry;
};

/**
 * @description Express 앱 생성 (서버 기동과 분리해 테스트에서 재사용)
 * @param options 앱 의존성
 * @returns 라우트가 등록된 Express 앱
 */
export const createApp = (options: AppOptions = {}) => {
  const app = express();
  const sessionStore = options.sessionStore ?? createMemorySessionStore();
  const registry = createRegistry({ ...options, sessionStore });

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  if (options.isDocsEnabled) {
    app.use(
      '/api/docs',
      swaggerUi.serve,
      swaggerUi.setup(generateOpenApiDocument(registry.routes)),
    );
  }

  // 개발 환경에서만 켜지는 가짜 카카오 로그인 화면 (운영에서는 지정되지 않음)
  if (options.social?.fakeSecret) {
    mountFakeKakaoRoutes(app, options.social.fakeSecret);
  }

  app.use(API_PREFIX, csrfGuard(options.appOrigin ?? 'http://localhost:5173'), registry.router);
  app.use(notFoundHandler);
  app.use(createErrorHandler(options.logger ?? createLogger('silent')));

  return app;
};
