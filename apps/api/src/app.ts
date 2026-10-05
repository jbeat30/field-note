import express from 'express';
import swaggerUi from 'swagger-ui-express';

import { createErrorHandler, notFoundHandler } from './http/errorHandler';
import { createMemoryIdempotencyStore, type IdempotencyStore } from './http/idempotency';
import { API_PREFIX, generateOpenApiDocument } from './http/openapi';
import { createRouteRegistry } from './http/route';
import type { AuthResolver } from './http/types';
import { createLogger, type Logger } from './logger';
import { registerHealthRoutes } from './routes/health';
import { registerSampleRoutes } from './routes/samples';
import { registerSessionRoutes } from './routes/session';

export type AppOptions = {
  // 세션 구현(T0-7) 전에는 항상 인증 없음
  resolveAuth?: AuthResolver;
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
  const registry = createRouteRegistry({
    resolveAuth: options.resolveAuth ?? (async () => null),
    idempotencyStore: options.idempotencyStore ?? createMemoryIdempotencyStore(),
  });

  registerHealthRoutes(registry);
  registerSessionRoutes(registry);
  registerSampleRoutes(registry);

  return registry;
};

/**
 * @description Express 앱 생성 (서버 기동과 분리해 테스트에서 재사용)
 * @param options 앱 의존성
 * @returns 라우트가 등록된 Express 앱
 */
export const createApp = (options: AppOptions = {}) => {
  const app = express();
  const registry = createRegistry(options);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  if (options.isDocsEnabled) {
    app.use(
      '/api/docs',
      swaggerUi.serve,
      swaggerUi.setup(generateOpenApiDocument(registry.routes)),
    );
  }

  app.use(API_PREFIX, registry.router);
  app.use(notFoundHandler);
  app.use(createErrorHandler(options.logger ?? createLogger('silent')));

  return app;
};
