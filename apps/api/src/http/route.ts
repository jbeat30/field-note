import { Router, type RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { idempotency, type IdempotencyStore } from './idempotency';
import { createRateLimiter, type RateLimitOptions } from './rateLimit';
import { requireAuth } from './requireAuth';
import type { AuthContext, AuthResolver } from './types';
import { validate } from './validate';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

// 라우트 한 개의 계약 (실행과 OpenAPI 문서가 같은 정의를 쓴다)
export type RouteSpec = {
  method: HttpMethod;
  // OpenAPI 형식 경로 (예: /samples/{id}), 서버 경로 접두사 제외
  path: string;
  summary: string;
  auth: 'required' | 'none';
  request?: { params?: ZodType; query?: ZodType; body?: ZodType };
  response: { status: number; schema: ZodType };
  // true면 Idempotency-Key 헤더 필수 (인증 필요 라우트만 가능)
  idempotent?: boolean;
  rateLimit?: RateLimitOptions;
};

export type RouteContext = {
  params: unknown;
  query: unknown;
  body: unknown;
  // auth: 'required'인 라우트에서만 존재
  auth: AuthContext | undefined;
};

export type RouteHandler = (context: RouteContext) => Promise<unknown>;

export type RouteRegistry = {
  router: Router;
  routes: readonly RouteSpec[];
  add: (spec: RouteSpec, handler: RouteHandler) => void;
};

export type RouteDependencies = {
  resolveAuth: AuthResolver;
  idempotencyStore: IdempotencyStore;
};

const toExpressPath = (openApiPath: string) => openApiPath.replace(/\{(\w+)\}/g, ':$1');

/**
 * @description 라우트 등록소 생성. 모든 라우트는 add로만 등록하며 표준 순서
 * (속도 제한 → 검증 → 인증 → 멱등 키 → 핸들러)와 응답 스키마 파싱을 강제한다
 * @param deps 인증 해석기와 멱등 키 저장소
 * @returns 라우터와 등록된 라우트 목록 (OpenAPI 생성·일치 테스트에서 사용)
 */
export const createRouteRegistry = (deps: RouteDependencies): RouteRegistry => {
  const router = Router();
  const routes: RouteSpec[] = [];

  const add = (spec: RouteSpec, handler: RouteHandler) => {
    if (spec.idempotent && spec.auth !== 'required') {
      throw new Error(
        `[http.route] 멱등 키는 인증 필요 라우트에만 사용 ${spec.method} ${spec.path}`,
      );
    }

    const middlewares: RequestHandler[] = [];

    if (spec.rateLimit) {
      middlewares.push(createRateLimiter(spec.rateLimit));
    }

    if (spec.request) {
      middlewares.push(validate(spec.request));
    }

    if (spec.auth === 'required') {
      middlewares.push(requireAuth(deps.resolveAuth));
    }

    if (spec.idempotent) {
      middlewares.push(idempotency(deps.idempotencyStore));
    }

    // 응답은 스키마로 파싱해 내보내 불필요한 필드(내부 ID, 다른 회사 정보)가 나가지 않게 함
    const respond: RequestHandler = async (_req, res) => {
      const input = res.locals.input;
      const data = await handler({
        params: input?.params,
        query: input?.query,
        body: input?.body,
        auth: res.locals.auth,
      });

      res.status(spec.response.status).json(spec.response.schema.parse(data));
    };

    router[spec.method](toExpressPath(spec.path), ...middlewares, respond);
    routes.push(spec);
  };

  return { router, routes, add };
};
