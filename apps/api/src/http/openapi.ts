import {
  extendZodWithOpenApi,
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { errorResponseSchema } from '@field-note/shared';
import { z } from 'zod';

import { STATUS_BY_CODE } from './AppError';
import { IDEMPOTENCY_HEADER } from './idempotency';
import type { RouteSpec } from './route';

extendZodWithOpenApi(z);

export const API_PREFIX = '/api/v1';

const jsonContent = (schema: z.ZodType) => ({ 'application/json': { schema } });

/**
 * @description 등록된 라우트 계약에서 OpenAPI 3.1 문서 생성 (프론트 API 타입의 원본)
 * @param routes 라우트 등록소의 라우트 목록
 * @returns OpenAPI 문서 객체
 */
export const generateOpenApiDocument = (routes: readonly RouteSpec[]) => {
  const registry = new OpenAPIRegistry();

  for (const spec of routes) {
    const hasValidationError = Boolean(spec.request);

    registry.registerPath({
      method: spec.method,
      path: `${API_PREFIX}${spec.path}`,
      summary: spec.summary,
      security: spec.auth === 'required' ? [{ sessionCookie: [] }] : [],
      request: {
        params: spec.request?.params as z.ZodObject | undefined,
        query: spec.request?.query as z.ZodObject | undefined,
        headers: spec.idempotent
          ? z.object({ [IDEMPOTENCY_HEADER]: z.string().min(8).max(128) })
          : undefined,
        body: spec.request?.body
          ? { required: true, content: jsonContent(spec.request.body) }
          : undefined,
      },
      responses: {
        [spec.response.status]: spec.redirect
          ? { description: '다른 주소로 이동 (Location 헤더)' }
          : {
              description: '성공',
              content: jsonContent(spec.response.schema),
            },
        ...(hasValidationError || spec.idempotent
          ? { 400: { description: '입력 오류', content: jsonContent(errorResponseSchema) } }
          : {}),
        ...(spec.auth === 'required'
          ? { 401: { description: '로그인 필요', content: jsonContent(errorResponseSchema) } }
          : {}),
        ...Object.fromEntries(
          (spec.errors ?? []).map((code) => [
            STATUS_BY_CODE[code],
            { description: code, content: jsonContent(errorResponseSchema) },
          ]),
        ),
        ...(spec.rateLimit
          ? { 429: { description: '요청 과다', content: jsonContent(errorResponseSchema) } }
          : {}),
      },
    });
  }

  registry.registerComponent('securitySchemes', 'sessionCookie', {
    type: 'apiKey',
    in: 'cookie',
    name: 'sid',
  });

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: { title: 'field-note API', version: '0.1.0' },
  });
};
