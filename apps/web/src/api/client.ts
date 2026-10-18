import type { paths } from '@field-note/shared/openapi';
import createClient, { type Middleware } from 'openapi-fetch';

// 서버 CSRF 방어가 요구하는 값 (apps/api/src/http/csrf.ts와 같아야 함)
const CSRF_HEADER = 'X-Field-Note-Client';
const CSRF_HEADER_VALUE = 'web';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// 실패한 쓰기 요청을 같은 내용으로 다시 보낼 때 같은 멱등 키를 쓰는 기간
const KEY_REUSE_MS = 2 * 60_000;
// 일시적인 서버 장애로 보고 조회를 다시 시도하는 응답 코드
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const GET_RETRY_DELAYS_MS = [400, 1200];

type PendingKey = { key: string; expiresAt: number };

// 아직 끝나지 않았거나 실패한 쓰기 요청의 내용(메서드·주소·본문) → 멱등 키
const pendingKeys = new Map<string, PendingKey>();
// 멱등 키 → 요청 내용 (응답이 왔을 때 어떤 요청인지 찾기 위함)
const signaturesByKey = new Map<string, string>();

const signatureOf = async (request: Request) =>
  `${request.method} ${request.url} ${await request.clone().text()}`;

const prunePendingKeys = (now: number) => {
  for (const [signature, pending] of pendingKeys) {
    if (pending.expiresAt <= now) {
      pendingKeys.delete(signature);
      signaturesByKey.delete(pending.key);
    }
  }
};

const settle = (key: string | null) => {
  const signature = key ? signaturesByKey.get(key) : undefined;

  if (key && signature) {
    pendingKeys.delete(signature);
    signaturesByKey.delete(key);
  }
};

// 세션이 만료돼 서버가 로그인을 요구할 때 화면이 로그인으로 이동하도록 알리는 함수 (앱이 시작할 때 등록)
let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

const isUnauthorized = async (response: Response) => {
  if (response.status !== 401) {
    return false;
  }

  try {
    const body = (await response.clone().json()) as { error?: { code?: string } };

    // 비밀번호가 틀려서 나는 401(INVALID_CREDENTIALS)은 세션 만료가 아님
    return body.error?.code === 'UNAUTHORIZED';
  } catch {
    return false;
  }
};

// 쓰기 요청마다 CSRF 헤더와 멱등 키를 붙임 (회선 불안으로 재전송돼도 서버가 한 번만 처리)
// 같은 내용의 요청이 아직 끝나지 않았거나(더블 클릭) 서버 오류·연결 끊김으로 실패한 뒤 다시 보내면 같은 키를 써서 중복 저장을 막음
// 성공하거나 입력 오류(4xx)로 끝나면 키를 버려 다음 요청은 새 키를 씀, 호출부가 Idempotency-Key를 직접 지정하면 그대로 씀
export const writeRequestMiddleware: Middleware = {
  onRequest: async ({ request }) => {
    if (WRITE_METHODS.has(request.method)) {
      request.headers.set(CSRF_HEADER, CSRF_HEADER_VALUE);

      if (!request.headers.has('Idempotency-Key')) {
        const now = Date.now();
        const signature = await signatureOf(request);

        prunePendingKeys(now);

        const key = pendingKeys.get(signature)?.key ?? crypto.randomUUID();

        pendingKeys.set(signature, { key, expiresAt: now + KEY_REUSE_MS });
        signaturesByKey.set(key, signature);
        request.headers.set('Idempotency-Key', key);
      }
    }

    return request;
  },
  onResponse: async ({ request, response }) => {
    const key = request.headers.get('Idempotency-Key');

    // 서버 오류(5xx)와 요청 과다(429)는 같은 요청을 다시 보낼 수 있으므로 키를 남기고, 그 밖의 응답은 끝난 요청으로 봄
    if (key && response.status < 500 && response.status !== 429) {
      settle(key);
    }

    if (await isUnauthorized(response)) {
      unauthorizedHandler?.();
    }

    return undefined;
  },
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * @description 조회(GET) 요청만 연결이 끊기거나 게이트웨이 오류(502·503·504)일 때 짧게 두 번까지 다시 시도하는 fetch
 * 쓰기 요청은 중복 저장 위험이 있어 자동으로 다시 보내지 않고 사용자가 다시 누르면 같은 멱등 키로 보냄
 * 요청 과다(429)와 입력·권한 오류(4xx)는 다시 시도해도 같은 결과이거나 상황이 나빠지므로 다시 시도하지 않음
 * @param request 요청
 * @returns 응답
 */
export const fetchWithRetry = async (request: Request): Promise<Response> => {
  if (request.method !== 'GET') {
    return fetch(request);
  }

  for (let attempt = 0; ; attempt += 1) {
    const isLast = attempt >= GET_RETRY_DELAYS_MS.length;

    try {
      const response = await fetch(request.clone());

      if (isLast || !RETRYABLE_STATUS.has(response.status)) {
        return response;
      }
    } catch (error) {
      if (isLast || request.signal.aborted) {
        throw error;
      }
    }

    await sleep(GET_RETRY_DELAYS_MS[attempt]!);
  }
};

/**
 * @description 서버 API 문서에서 생성한 타입 기반 API 클라이언트 (손으로 요청·응답 타입을 쓰지 않음)
 * @param baseUrl API 서버 주소 (운영과 같은 도메인이면 빈 문자열)
 * @returns 타입 있는 fetch 클라이언트
 */
export const createApiClient = (baseUrl = '') => {
  const client = createClient<paths>({
    baseUrl,
    credentials: 'same-origin',
    fetch: fetchWithRetry,
  });

  client.use(writeRequestMiddleware);

  return client;
};

export const apiClient = createApiClient();
