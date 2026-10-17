import type { RequestHandler } from 'express';

/**
 * @description API 응답 공통 보안 헤더 (형식 추측 차단, 프레임 삽입 차단, 주소 정보 전달 차단)
 * @returns 보안 헤더 미들웨어
 */
export const securityHeaders = (): RequestHandler => (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
};
