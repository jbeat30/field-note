import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

import { AppError } from './AppError';

export type RateLimitOptions = {
  windowMs: number;
  limit: number;
};

/**
 * @description 공통 오류 형식으로 응답하는 요청 횟수 제한
 * @param options 제한 시간 창(ms)과 허용 횟수
 * @returns 속도 제한 미들웨어
 */
export const createRateLimiter = ({ windowMs, limit }: RateLimitOptions): RequestHandler =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new AppError('TOO_MANY_REQUESTS'));
    },
  });

// 기본 한도 (요청이 많은 화면도 정상 사용에서는 닿지 않는 값이고, 스크립트로 쓸어 가는 호출과 반복 호출을 막기 위함)
export const DEFAULT_RATE_LIMITS = {
  // 접속 주소(IP)당 모든 API 호출: 로그인 전 호출도 포함 (사무실처럼 한 주소를 여럿이 써도 넉넉한 값)
  ip: { windowMs: 60_000, limit: 600 },
  // 로그인한 사용자당 모든 API 호출
  user: { windowMs: 60_000, limit: 300 },
  // 로그인한 사용자당 엑셀 같은 파일 내려받기 (만드는 데 서버 자원을 많이 씀)
  export: { windowMs: 60_000, limit: 10 },
} as const satisfies Record<string, RateLimitOptions>;

/**
 * @description 로그인한 사용자별 요청 횟수 제한 (requireAuth 뒤에 둠, 같은 주소를 여럿이 써도 사용자마다 따로 셈)
 * @param options 제한 시간 창(ms)과 허용 횟수
 * @returns 속도 제한 미들웨어
 */
export const createUserRateLimiter = ({ windowMs, limit }: RateLimitOptions): RequestHandler =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (_req, res) => res.locals.auth?.userId ?? 'anonymous',
    handler: (_req, _res, next) => {
      next(new AppError('TOO_MANY_REQUESTS'));
    },
  });
