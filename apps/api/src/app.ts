import cookieParser from 'cookie-parser';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import { csrfGuard } from './http/csrf';
import { createErrorHandler, notFoundHandler } from './http/errorHandler';
import { createMemoryIdempotencyStore, type IdempotencyStore } from './http/idempotency';
import { API_PREFIX, generateOpenApiDocument } from './http/openapi';
import { createRouteRegistry } from './http/route';
import type { AuthResolver } from './http/types';
import type { InvitationStore } from './invitation/invitationStore';
import { createLogger, type Logger } from './logger';
import { registerAccountRoutes } from './routes/account';
import { registerAuthRoutes } from './routes/auth';
import { registerHealthRoutes } from './routes/health';
import { registerSampleRoutes } from './routes/samples';
import { registerSessionRoutes } from './routes/session';
import { createMemorySessionStore, type SessionStore } from './session/sessionStore';
import { createSessionResolver } from './session/cookie';

export type AppOptions = {
  // 기본은 세션 저장소의 쿠키 해석기 (테스트에서 교체 가능)
  resolveAuth?: AuthResolver;
  // 운영은 PostgreSQL 저장소를 주입, 기본은 메모리 저장소
  sessionStore?: SessionStore;
  // 없으면 초대 확인 API는 501 (운영은 PostgreSQL 저장소를 주입)
  invitationStore?: InvitationStore;
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
  registerSessionRoutes(registry);
  registerSampleRoutes(registry);
  registerAccountRoutes(registry, { invitationStore: options.invitationStore });
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

  app.use(API_PREFIX, csrfGuard(options.appOrigin ?? 'http://localhost:5173'), registry.router);
  app.use(notFoundHandler);
  app.use(createErrorHandler(options.logger ?? createLogger('silent')));

  return app;
};
