import type { RequestHandler } from 'express';

import { AppError } from './AppError';
import type { AuthContext, AuthResolver } from './types';

/**
 * @description 세션이 없는 요청을 401로 차단하고 인증 정보를 res.locals.auth에 저장
 * @param resolveAuth 요청에서 세션 인증 정보를 찾는 함수
 * @returns 인증 미들웨어
 */
export const requireAuth =
  (resolveAuth: AuthResolver): RequestHandler =>
  async (req, res, next) => {
    const auth = await resolveAuth(req, res);

    if (!auth) {
      next(new AppError('UNAUTHORIZED'));
      return;
    }

    res.locals.auth = auth;
    next();
  };

/**
 * @description 이메일 인증을 마치지 않은 계정을 403으로 차단 (requireAuth 뒤에 둠)
 * 인증 화면이 쓰는 라우트만 allowUnverifiedEmail로 제외하므로, 화면 이동에만 의존하지 않고 API를 직접 호출해도 막힘
 * @param isEmailVerified 계정의 이메일 인증 여부 조회 함수
 * @returns 인증 확인 미들웨어
 */
export const requireVerifiedEmail =
  (isEmailVerified: (auth: AuthContext) => Promise<boolean>): RequestHandler =>
  async (_req, res, next) => {
    const auth = res.locals.auth;

    if (!auth || !(await isEmailVerified(auth))) {
      next(new AppError('EMAIL_NOT_VERIFIED'));
      return;
    }

    next();
  };
