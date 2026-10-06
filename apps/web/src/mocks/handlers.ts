import {
  companySettingsSchema,
  emailVerifyRequestSchema,
  ERROR_MESSAGES,
  invitationParamsSchema,
  loginRequestSchema,
  signupRequestSchema,
  type ErrorCode,
  type MeResponse,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import {
  DEMO_INVITATION,
  LEGAL_DOCUMENTS,
  MOCK_EMAIL_CODE,
  MOCK_LOCKED_LOGIN_ID,
  MOCK_TAKEN_LOGIN_ID,
  type MockAccount,
} from './data';
import {
  addAccount,
  clearFailedLogins,
  findAccount,
  getCurrentAccount,
  isLoginLocked,
  listDevices,
  markEmailVerified,
  recordFailedLogin,
  removeDevice,
  signIn,
  signOut,
  updateSettings,
  MOCK_MAX_FAILED_LOGINS,
} from './state';

// 실제 API와 같은 상태 코드·오류 형식을 쓴다 (apps/api/src/http/AppError.ts와 동일)
const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  CSRF_REJECTED: 403,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_LOCKED: 423,
  LOGIN_ID_TAKEN: 409,
  EMAIL_CODE_INVALID: 400,
  NOT_IMPLEMENTED: 501,
  NOT_FOUND: 404,
  IDEMPOTENCY_KEY_REQUIRED: 400,
  IDEMPOTENCY_KEY_REUSED: 422,
  IDEMPOTENCY_IN_PROGRESS: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};

const apiError = (code: ErrorCode, details?: { path: string; message: string }[]) =>
  HttpResponse.json(
    { error: { code, message: ERROR_MESSAGES[code], details } },
    { status: STATUS[code] },
  );

// 실제 서버 응답 시간에 가까운 지연 (로딩 상태 확인용)
const simulateLatency = () => delay(400);

const CSRF_HEADER = 'X-Field-Note-Client';

type Parsed<T> = { data: T } | { response: Response };

// 서버와 같은 방식으로 본문을 공유 스키마로 검증
const parseBody = async <T>(request: Request, schema: ZodType<T>): Promise<Parsed<T>> => {
  const result = schema.safeParse(await request.json().catch(() => null));

  if (result.success) {
    return { data: result.data };
  }

  return {
    response: apiError(
      'VALIDATION_ERROR',
      result.error.issues.map((issue) => ({
        path: ['body', ...issue.path].join('.'),
        message: issue.message,
      })),
    ),
  };
};

const toMe = (account: MockAccount): MeResponse => ({
  displayName: account.displayName,
  email: account.email,
  isEmailVerified: account.isEmailVerified,
  companyName: account.companyName,
});

// 쓰기 요청에 CSRF 헤더가 빠지면 서버처럼 거부해 웹 클라이언트 회귀를 잡는다
const hasCsrfHeader = (request: Request) => request.headers.get(CSRF_HEADER) === 'web';

export const handlers = [
  http.get('/api/v1/health', async () => {
    await simulateLatency();

    return HttpResponse.json({ status: 'ok', service: 'field-note' });
  }),

  http.get('/api/v1/invitations/:token', async ({ params }) => {
    await simulateLatency();

    const parsed = invitationParamsSchema.safeParse(params);

    if (!parsed.success || parsed.data.token !== DEMO_INVITATION.token) {
      return apiError('NOT_FOUND');
    }

    return HttpResponse.json({
      companyName: DEMO_INVITATION.companyName,
      adminName: DEMO_INVITATION.adminName,
      expiresAt: new Date(Date.now() + DEMO_INVITATION.expiresInDays * 86_400_000).toISOString(),
      documents: LEGAL_DOCUMENTS,
    });
  }),

  http.post('/api/v1/auth/signup', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const body = await parseBody(request, signupRequestSchema);

    if ('response' in body) return body.response;

    const { inviteToken, loginId, password, email, consents } = body.data;

    if (inviteToken !== DEMO_INVITATION.token) return apiError('NOT_FOUND');

    const requiredIds = LEGAL_DOCUMENTS.filter((document) => document.isRequired).map(
      (document) => document.id,
    );
    const agreedIds = new Set(
      consents.filter((consent) => consent.isAgreed).map((consent) => consent.documentId),
    );

    if (!requiredIds.every((id) => agreedIds.has(id))) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.consents', message: '필수 약관에 모두 동의해야 합니다' },
      ]);
    }

    if (loginId === MOCK_TAKEN_LOGIN_ID || findAccount(loginId)) return apiError('LOGIN_ID_TAKEN');

    addAccount({
      loginId,
      password,
      displayName: DEMO_INVITATION.adminName,
      email,
      isEmailVerified: false,
      companyName: DEMO_INVITATION.companyName,
      settings: { standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
    });
    signIn(loginId);

    return HttpResponse.json({ email, resendAfterSeconds: 30 }, { status: 201 });
  }),

  http.post('/api/v1/auth/email/verify', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, emailVerifyRequestSchema);

    if ('response' in body) return body.response;

    if (body.data.code !== MOCK_EMAIL_CODE) return apiError('EMAIL_CODE_INVALID');

    markEmailVerified(account);

    return HttpResponse.json(toMe(account));
  }),

  http.post('/api/v1/auth/email/resend', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');
    if (!getCurrentAccount()) return apiError('UNAUTHORIZED');

    return HttpResponse.json({ resendAfterSeconds: 30 });
  }),

  http.post('/api/v1/auth/login', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const body = await parseBody(request, loginRequestSchema);

    if ('response' in body) return body.response;

    const loginId = body.data.loginId.toLowerCase();

    if (loginId === MOCK_LOCKED_LOGIN_ID || isLoginLocked(loginId))
      return apiError('ACCOUNT_LOCKED');

    const account = findAccount(loginId);

    // 아이디 존재 여부를 알려 주지 않도록 같은 오류로 응답
    if (!account || account.password !== body.data.password) {
      // 실제 서버처럼 존재하는 계정만 실패 횟수를 세고, 잠금을 일으킨 실패에도 잠금 오류로 응답
      if (account && recordFailedLogin(loginId) >= MOCK_MAX_FAILED_LOGINS)
        return apiError('ACCOUNT_LOCKED');

      return apiError('INVALID_CREDENTIALS');
    }

    clearFailedLogins(loginId);
    signIn(account.loginId);

    return HttpResponse.json(toMe(account));
  }),

  http.post('/api/v1/auth/logout', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');
    if (!getCurrentAccount()) return apiError('UNAUTHORIZED');

    signOut();

    return HttpResponse.json({ success: true });
  }),

  http.get('/api/v1/me', async () => {
    await simulateLatency();

    const account = getCurrentAccount();

    return account ? HttpResponse.json(toMe(account)) : apiError('UNAUTHORIZED');
  }),

  http.get('/api/v1/company/settings', async () => {
    await simulateLatency();

    const account = getCurrentAccount();

    return account ? HttpResponse.json(account.settings) : apiError('UNAUTHORIZED');
  }),

  http.put('/api/v1/company/settings', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, companySettingsSchema);

    if ('response' in body) return body.response;

    updateSettings(account, body.data);

    return HttpResponse.json(account.settings);
  }),

  http.get('/api/v1/me/devices', async () => {
    await simulateLatency();

    return getCurrentAccount()
      ? HttpResponse.json({ devices: listDevices() })
      : apiError('UNAUTHORIZED');
  }),

  http.delete('/api/v1/me/devices/:id', async ({ request, params }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');
    if (!getCurrentAccount()) return apiError('UNAUTHORIZED');

    // 현재 기기는 로그아웃 API로만 종료
    if (params.id === 'device-current' || !removeDevice(String(params.id)))
      return apiError('NOT_FOUND');

    return HttpResponse.json({ success: true });
  }),
];
