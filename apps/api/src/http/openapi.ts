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

// 문서 화면에서 묶어 보여 줄 도메인 이름 (주소의 첫 마디 기준, 없는 마디는 주소 그대로 표시)
const TAG_LABELS: Record<string, string> = {
  health: '상태 확인',
  public: '공개 정보',
  samples: '샘플',
  invitations: '초대',
  auth: '로그인·가입',
  me: '내 계정',
  company: '회사',
  employees: '직원',
  partners: '명부(고객·협력사)',
  projects: '프로젝트',
  'staffing-calendar': '인력 배치',
  'pay-rates': '단가',
  'change-works': '변경·추가 작업',
  'audit-logs': '활동 기록',
  'repair-requests': '보수 요청',
  'monthly-hours': '월 공수표',
  dashboard: '대시보드',
  alerts: '알림',
  files: '파일 업로드',
  photos: '사진',
  memos: '메모',
  materials: '자재',
  'material-records': '자재 기록',
  'ledger-entries': '원장',
  documents: '문서함',
  search: '검색',
};

// 주소의 첫 마디로 도메인 구분 (예: /projects/{id}/photos → projects, 확장자는 제외)
const tagOf = (path: string) => {
  const segment = path.split('/')[1] ?? '';
  const name = segment.replace(/\.\w+$/, '');

  return TAG_LABELS[name] ?? name;
};

const API_DESCRIPTION = [
  '로그인 세션 쿠키(sid)로 인증합니다. 회사는 세션에서만 정해지므로 요청에 회사 ID를 넣지 않습니다.',
  '',
  '상태를 바꾸는 호출(POST·PUT·PATCH·DELETE)은 X-Field-Note-Client: web 헤더가 필요하고, Origin이 있으면 웹 주소와 같아야 합니다.',
  '재시도에 안전해야 하는 호출은 Idempotency-Key 헤더(8~128자)를 받습니다.',
  '',
  '오류는 { error: { code, message, details? } } 형식이며, 화면은 message 대신 code로 분기합니다.',
].join('\n');

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
      tags: [tagOf(spec.path)],
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
          : spec.file
            ? {
                description: '파일 내려받기 (Content-Disposition 헤더에 파일 이름)',
                content: {
                  [spec.file.contentType]: { schema: { type: 'string', format: 'binary' } },
                },
              }
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
    info: { title: 'field-note API', version: 'v1', description: API_DESCRIPTION },
    servers: [{ url: '/', description: '이 문서를 연 서버' }],
    tags: [...new Set(routes.map((spec) => tagOf(spec.path)))].map((name) => ({ name })),
  });
};
