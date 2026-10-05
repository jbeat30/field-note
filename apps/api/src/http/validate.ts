import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { AppError } from './AppError';

export type ValidateSchemas = {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
};

/**
 * @description 요청 params·query·body를 Zod로 검증하고 결과를 res.locals.input에 저장
 * @param schemas 위치별 검증 스키마 (없는 위치는 검증하지 않음)
 * @returns 검증 실패 시 VALIDATION_ERROR(400)로 넘기는 미들웨어
 */
export const validate =
  (schemas: ValidateSchemas): RequestHandler =>
  (req, res, next) => {
    const details: { path: string; message: string }[] = [];
    const input: Record<'params' | 'query' | 'body', unknown> = {
      params: req.params,
      query: req.query,
      body: req.body,
    };

    for (const location of ['params', 'query', 'body'] as const) {
      const schema = schemas[location];

      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[location]);

      if (result.success) {
        input[location] = result.data;
        continue;
      }

      // 입력 값은 개인정보일 수 있어 위치와 사유만 응답
      for (const issue of result.error.issues) {
        details.push({ path: [location, ...issue.path].join('.'), message: issue.message });
      }
    }

    if (details.length > 0) {
      next(new AppError('VALIDATION_ERROR', details));
      return;
    }

    res.locals.input = input;
    next();
  };
