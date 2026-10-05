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
