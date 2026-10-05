import type { RequestHandler } from 'express';

import { AppError } from './AppError';
import type { AuthResolver } from './types';

/**
 * @description 세션이 없는 요청을 401로 차단하고 인증 정보를 res.locals.auth에 저장
 * @param resolveAuth 요청에서 세션 인증 정보를 찾는 함수
 * @returns 인증 미들웨어
 */
export const requireAuth =
  (resolveAuth: AuthResolver): RequestHandler =>
  async (req, res, next) => {
    const auth = await resolveAuth(req);

    if (!auth) {
      next(new AppError('UNAUTHORIZED'));
      return;
    }

    res.locals.auth = auth;
    next();
  };
