import type { RequestHandler } from 'express';

import { AppError } from './AppError';

export const CSRF_HEADER = 'X-Field-Note-Client';
export const CSRF_HEADER_VALUE = 'web';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * @description 상태를 바꾸는 요청의 CSRF 방어 (SameSite 쿠키에 더해 Origin 검증과 커스텀 헤더 요구)
 * 다른 사이트의 폼·이미지 요청은 커스텀 헤더를 붙일 수 없고, 헤더를 붙이는 요청은 CORS 검사를 거침
 * @param appOrigin 허용하는 웹 주소 (예: https://app.example.com)
 * @returns CSRF 미들웨어
 */
export const csrfGuard = (appOrigin: string): RequestHandler => {
  const allowedOrigin = new URL(appOrigin).origin;

  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const origin = req.get('Origin');

    if (origin && origin !== allowedOrigin) {
      next(new AppError('CSRF_REJECTED'));
      return;
    }

    if (req.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
      next(new AppError('CSRF_REJECTED'));
      return;
    }

    next();
  };
};
