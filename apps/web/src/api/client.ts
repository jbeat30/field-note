import type { paths } from '@field-note/shared/openapi';
import createClient, { type Middleware } from 'openapi-fetch';

// 서버 CSRF 방어가 요구하는 값 (apps/api/src/http/csrf.ts와 같아야 함)
const CSRF_HEADER = 'X-Field-Note-Client';
const CSRF_HEADER_VALUE = 'web';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// 쓰기 요청마다 CSRF 헤더와 멱등 키를 붙임 (회선 불안으로 재전송돼도 서버가 한 번만 처리)
// 재시도 시 같은 키를 쓰려면 호출부에서 Idempotency-Key 헤더를 직접 지정
export const writeRequestMiddleware: Middleware = {
  onRequest: ({ request }) => {
    if (WRITE_METHODS.has(request.method)) {
      request.headers.set(CSRF_HEADER, CSRF_HEADER_VALUE);

      if (!request.headers.has('Idempotency-Key')) {
        request.headers.set('Idempotency-Key', crypto.randomUUID());
      }
    }

    return request;
  },
};

/**
 * @description 서버 API 문서에서 생성한 타입 기반 API 클라이언트 (손으로 요청·응답 타입을 쓰지 않음)
 * @param baseUrl API 서버 주소 (운영과 같은 도메인이면 빈 문자열)
 * @returns 타입 있는 fetch 클라이언트
 */
export const createApiClient = (baseUrl = '') => {
  const client = createClient<paths>({ baseUrl, credentials: 'same-origin' });

  client.use(writeRequestMiddleware);

  return client;
};

export const apiClient = createApiClient();
