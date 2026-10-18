import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { ZodType } from 'zod';

import type { ErrorCode } from '@field-note/shared';

import type { AuditEntry } from '../audit/auditService';
import { idempotency, type IdempotencyStore } from './idempotency';
import {
  createRateLimiter,
  createUserRateLimiter,
  DEFAULT_RATE_LIMITS,
  type RateLimitOptions,
} from './rateLimit';
import { requireAuth, requireVerifiedEmail } from './requireAuth';
import type { AuthContext, AuthResolver } from './types';
import { validate } from './validate';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

// 라우트 한 개의 계약 (실행과 OpenAPI 문서가 같은 정의 공유)
export type RouteSpec = {
  method: HttpMethod;
  // OpenAPI 형식 경로 (예: /samples/{id}), 서버 경로 접두사 제외
  path: string;
  summary: string;
  auth: 'required' | 'none';
  // true면 이메일 인증 전 계정도 호출할 수 있음 (인증 화면이 쓰는 요청만, 나머지 인증 필요 라우트는 인증을 마친 계정만)
  allowUnverifiedEmail?: boolean;
  request?: { params?: ZodType; query?: ZodType; body?: ZodType };
  response: { status: number; schema: ZodType };
  // true면 핸들러가 돌려준 주소로 이동시키는 라우트 (소셜 로그인 콜백처럼 브라우저 이동 응답), 응답 스키마는 쓰지 않음
  redirect?: boolean;
  // 파일을 내려주는 라우트 (엑셀 등), 핸들러는 { filename, body }를 돌려주고 응답 스키마는 쓰지 않음
  file?: { contentType: string };
  // true면 Idempotency-Key 헤더 필수 (인증 필요 라우트만 가능), 그 밖의 인증 필요 POST는 헤더가 있으면 같은 키의 재전송을 한 번만 처리
  idempotent?: boolean;
  rateLimit?: RateLimitOptions;
  // 이 라우트가 업무적으로 반환하는 오류 코드 (OpenAPI 문서에 응답으로 기록)
  errors?: readonly ErrorCode[];
  // 성공했을 때 활동 기록을 남기는 라우트 (데이터를 바꾸는 일), 인증 필요 라우트만 가능
  audit?: {
    // 바꾸기 전 상태 조회 (바뀐 내용의 전·후 기록용), 실패하면 null 처리
    before?: (context: RouteContext) => Promise<unknown>;
    // 남길 기록 (남기지 않으면 null), 처리 결과와 바꾸기 전 상태를 입력으로 받음
    entry: (context: RouteContext, result: unknown, before: unknown) => AuditEntry | null;
  };
};

export type RouteContext = {
  params: unknown;
  query: unknown;
  body: unknown;
  // auth: 'required'인 라우트에서만 존재
  auth: AuthContext | undefined;
  // 쿠키 설정처럼 응답 헤더가 필요한 경우에만 사용 (본문은 반환값으로 내보냄)
  request: Request;
  response: Response;
};

export type RouteHandler = (context: RouteContext) => Promise<unknown>;

export type RouteRegistry = {
  router: Router;
  routes: readonly RouteSpec[];
  add: (spec: RouteSpec, handler: RouteHandler) => void;
};

export type RouteDependencies = {
  resolveAuth: AuthResolver;
  // 계정의 이메일 인증 여부 조회 (없으면 확인하지 않음: 계정 서비스가 없는 테스트 앱)
  isEmailVerified?: (auth: AuthContext) => Promise<boolean>;
  // 로그인한 사용자별 전체 호출 한도와 파일 내려받기 한도 (없으면 기본값, false면 끔: 한꺼번에 많이 부르는 시험용)
  userRateLimit?: RateLimitOptions | false;
  exportRateLimit?: RateLimitOptions | false;
  idempotencyStore: IdempotencyStore;
  // 활동 기록 저장 함수 (없으면 기록 생략), 기록이 실패해도 이미 끝난 처리는 되돌리지 않고 알림
  recordAudit?: (companyId: string, actorId: string, entry: AuditEntry) => Promise<void>;
  onAuditError?: (error: unknown) => void;
};

const toExpressPath = (openApiPath: string) => openApiPath.replace(/\{(\w+)\}/g, ':$1');

/**
 * @description 라우트 등록소 생성, 모든 라우트는 add로만 등록하며 표준 순서
 * (속도 제한 → 검증 → 인증 → 멱등 키 → 핸들러)와 응답 스키마 파싱 강제
 * @param deps 인증 해석기와 멱등 키 저장소
 * @returns 라우터와 등록된 라우트 목록 (OpenAPI 생성·일치 테스트에서 사용)
 */
export const createRouteRegistry = (deps: RouteDependencies): RouteRegistry => {
  const router = Router();
  const routes: RouteSpec[] = [];

  const add = (spec: RouteSpec, handler: RouteHandler) => {
    if (spec.audit && spec.auth !== 'required') {
      throw new Error(
        `[http.route] 활동 기록은 인증 필요 라우트에만 사용 ${spec.method} ${spec.path}`,
      );
    }

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

      if (deps.isEmailVerified && !spec.allowUnverifiedEmail) {
        middlewares.push(requireVerifiedEmail(deps.isEmailVerified));
      }

      if (deps.userRateLimit !== false) {
        middlewares.push(createUserRateLimiter(deps.userRateLimit ?? DEFAULT_RATE_LIMITS.user));
      }

      if (spec.file && deps.exportRateLimit !== false) {
        middlewares.push(createUserRateLimiter(deps.exportRateLimit ?? DEFAULT_RATE_LIMITS.export));
      }
    }

    if (spec.idempotent) {
      middlewares.push(idempotency(deps.idempotencyStore));
    } else if (spec.method === 'post' && spec.auth === 'required' && !spec.file && !spec.redirect) {
      // 데이터를 만드는 요청은 회선이 불안해 다시 보내도 중복 저장되지 않게 함 (웹 앱이 키를 항상 보냄)
      middlewares.push(idempotency(deps.idempotencyStore, { optional: true }));
    }

    // 응답은 스키마로 파싱해 내보내 불필요한 필드(내부 ID, 다른 회사 정보)가 나가지 않게 함
    const respond: RequestHandler = async (req, res) => {
      const input = res.locals.input;
      const context: RouteContext = {
        params: input?.params,
        query: input?.query,
        body: input?.body,
        auth: res.locals.auth,
        request: req,
        response: res,
      };
      const before = spec.audit?.before ? await spec.audit.before(context).catch(() => null) : null;
      const data = await handler(context);

      // 성공한 뒤에 활동 기록을 남김 (기록 실패는 처리 결과를 바꾸지 않고 오류 로그로 알림)
      if (spec.audit && deps.recordAudit && context.auth) {
        try {
          const entry = spec.audit.entry(context, data, before);

          if (entry) await deps.recordAudit(context.auth.companyId, context.auth.userId, entry);
        } catch (error) {
          deps.onAuditError?.(error);
        }
      }

      if (spec.redirect) {
        res.redirect(302, String(data));
        return;
      }

      if (spec.file) {
        const { filename, body } = data as { filename: string; body: Buffer };

        // 한글 파일 이름도 깨지지 않게 RFC 5987 형식으로 보내고, 업무 파일이라 캐시하지 않음
        res
          .status(spec.response.status)
          .type(spec.file.contentType)
          .setHeader(
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          )
          .setHeader('Cache-Control', 'no-store')
          .send(body);
        return;
      }

      res.status(spec.response.status).json(spec.response.schema.parse(data));
    };

    router[spec.method](toExpressPath(spec.path), ...middlewares, respond);
    routes.push(spec);
  };

  return { router, routes, add };
};
