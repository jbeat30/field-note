import type { ErrorRequestHandler, RequestHandler } from 'express';

import type { Logger } from '../logger';

import { AppError } from './AppError';

/**
 * @description 매칭되는 라우트가 없을 때 404 오류 형식으로 응답
 */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND'));
};

/**
 * @description 모든 오류를 공통 형식으로 변환 (예상 밖 오류는 내부 내용을 숨기고 로그에만 기록)
 * @param logger 오류 기록용 로거
 * @returns Express 오류 처리 미들웨어
 */
export const createErrorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const appError = error instanceof AppError ? error : new AppError('INTERNAL_ERROR');

    if (!(error instanceof AppError)) {
      logger.error(
        { err: error, method: req.method, path: req.path },
        '[http.errorHandler] 처리되지 않은 오류',
      );
    }

    res.status(appError.status).json(appError.toResponse());
  };
