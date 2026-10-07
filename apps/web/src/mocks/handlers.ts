import {
  closureCancelSchema,
  closureRequestSchema,
  closureTokenParamsSchema,
  companySettingsSchema,
  socialStartRequestSchema,
  EMPLOYEE_MAX_PER_COMPANY,
  EMPLOYEE_STATUSES,
  emailChangeSchema,
  employeeCreateSchema,
  employeeListQuerySchema,
  employeeParamsSchema,
  employeeUpdateSchema,
  resolveEmployeeStatus,
  todayInSeoul,
  type EmployeeDetail,
  type OptionKind,
  normalizeOptionName,
  OPTION_KINDS,
  OPTION_MAX_PER_KIND,
  optionCreateSchema,
  optionParamsSchema,
  optionReorderSchema,
  optionUpdateSchema,
  passwordChangeSchema,
  passwordResetConfirmSchema,
  passwordResetParamsSchema,
  passwordResetRequestSchema,
  emailVerifyRequestSchema,
  ERROR_MESSAGES,
  ERROR_STATUS,
  invitationParamsSchema,
  loginRequestSchema,
  signupRequestSchema,
  type ErrorCode,
  type MeResponse,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import {
  DEMO_ACCOUNTS,
  DEMO_INVITATION,
  LEGAL_DOCUMENTS,
  MOCK_CLOSURE_TOKEN,
  MOCK_EMAIL_CODE,
  MOCK_LOCKED_LOGIN_ID,
  MOCK_KAKAO_PROFILES,
  MOCK_RESET_TOKEN,
  MOCK_TAKEN_LOGIN_ID,
  type MockAccount,
} from './data';
import {
  addAccount,
  applyPendingEmail,
  cancelClosure,
  consumeMockReset,
  findClosingAccount,
  getEmployees,
  getOptions,
  saveEmployees,
  saveOptions,
  startClosure,
  getMockResetTarget,
  isEmailInUse,
  isMockResetUsable,
  requestMockReset,
  setPassword,
  setPendingEmail,
  clearFailedLogins,
  findAccount,
  findAccountByKakao,
  setKakaoProfile,
  getCurrentAccount,
  isLoginLocked,
  listDevices,
  recordFailedLogin,
  removeDevice,
  signIn,
  signOut,
  updateSettings,
  MOCK_MAX_FAILED_LOGINS,
} from './state';

// 실제 API와 같은 상태 코드·오류 형식을 쓴다 (공유 패키지의 같은 표 사용)
const STATUS = ERROR_STATUS;

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

// 직종·직원 구분은 같은 회사의 해당 종류 항목만 고를 수 있고, 숨긴 항목은 새로 고를 수 없음 (서버와 같은 규칙)
const checkOption = (
  account: MockAccount,
  kind: OptionKind,
  path: string,
  label: string,
  id: string | null | undefined,
  currentId: string | null,
) => {
  if (!id || id === currentId) return null;

  const option = getOptions(account).find((item) => item.id === id && item.kind === kind);

  if (!option) {
    return apiError('VALIDATION_ERROR', [{ path, message: `선택할 수 없는 ${label}입니다` }]);
  }

  return option.isActive
    ? null
    : apiError('VALIDATION_ERROR', [{ path, message: `숨긴 ${label}은 새로 고를 수 없습니다` }]);
};

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

    // 이메일 변경 중이면 새 주소로 반영, 아니면 가입 인증 완료
    applyPendingEmail(account);

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

    // 해지 요청 중인 계정은 비밀번호가 맞을 때만 상태를 알려 주고 로그인은 막음
    if (account.closingPurgeAfter) return apiError('ACCOUNT_CLOSING');

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

  // 비밀번호 재설정: 가입 여부와 관계없이 같은 응답 (시연용으로 일치하는 계정만 대상 기록)
  http.post('/api/v1/auth/password-reset/request', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const body = await parseBody(request, passwordResetRequestSchema);

    if ('response' in body) return body.response;

    const target = DEMO_ACCOUNTS.find(
      (account) => account.email === body.data.email.trim().toLowerCase(),
    );

    if (target) requestMockReset(target.loginId);

    return HttpResponse.json({ success: true });
  }),

  http.get('/api/v1/auth/password-reset/:token', async ({ params }) => {
    await simulateLatency();

    const parsed = passwordResetParamsSchema.safeParse(params);

    if (!parsed.success || parsed.data.token !== MOCK_RESET_TOKEN || !isMockResetUsable()) {
      return apiError('NOT_FOUND');
    }

    return HttpResponse.json({ success: true });
  }),

  http.post('/api/v1/auth/password-reset/confirm', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const body = await parseBody(request, passwordResetConfirmSchema);

    if ('response' in body) return body.response;

    if (body.data.token !== MOCK_RESET_TOKEN || !isMockResetUsable()) return apiError('NOT_FOUND');

    const account = findAccount(getMockResetTarget() ?? 'hanbit');

    if (account) {
      setPassword(account, body.data.newPassword);
      clearFailedLogins(account.loginId);
    }

    // 실제 서버처럼 모든 기기 로그아웃, 링크는 한 번만
    signOut();
    consumeMockReset();

    return HttpResponse.json({ success: true });
  }),

  http.post('/api/v1/me/password', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, passwordChangeSchema);

    if ('response' in body) return body.response;

    if (isLoginLocked(account.loginId)) return apiError('ACCOUNT_LOCKED');

    if (account.password !== body.data.currentPassword) {
      // 로그인과 같은 실패 횟수·잠금 정책
      if (recordFailedLogin(account.loginId) >= MOCK_MAX_FAILED_LOGINS) {
        return apiError('ACCOUNT_LOCKED');
      }

      return apiError('CURRENT_PASSWORD_INVALID');
    }

    clearFailedLogins(account.loginId);
    setPassword(account, body.data.newPassword);

    return HttpResponse.json({ success: true });
  }),

  http.get('/api/v1/company/options', async () => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    // 종류 순서대로, 같은 종류 안에서는 정해진 순서 그대로
    const items = getOptions(account);

    return HttpResponse.json({
      items: OPTION_KINDS.flatMap((kind) => items.filter((item) => item.kind === kind)),
    });
  }),

  http.post('/api/v1/company/options', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, optionCreateSchema);

    if ('response' in body) return body.response;

    const items = getOptions(account);
    const { kind, name } = body.data;
    const key = normalizeOptionName(name);

    if (items.some((item) => item.kind === kind && normalizeOptionName(item.name) === key)) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.name', message: '이미 같은 이름이 있습니다' },
      ]);
    }

    if (items.filter((item) => item.kind === kind).length >= OPTION_MAX_PER_KIND) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.name', message: '항목은 종류마다 100개까지 만들 수 있습니다' },
      ]);
    }

    const created = { id: crypto.randomUUID(), kind, name, isActive: true };

    saveOptions(account, [...items, created]);

    return HttpResponse.json(created, { status: 201 });
  }),

  http.put('/api/v1/company/options/order', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, optionReorderSchema);

    if ('response' in body) return body.response;

    const items = getOptions(account);
    const sameKind = items.filter((item) => item.kind === body.data.kind);
    const known = new Set(sameKind.map((item) => item.id));
    const { ids } = body.data;

    // 서버와 같은 규칙: 해당 종류의 모든 항목을 한 번씩만 보내야 함
    if (
      new Set(ids).size !== ids.length ||
      ids.length !== known.size ||
      ids.some((id) => !known.has(id))
    ) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.ids', message: '목록이 바뀌었습니다. 새로 고친 뒤 다시 시도해 주세요' },
      ]);
    }

    const byId = new Map(sameKind.map((item) => [item.id, item]));
    const reordered = ids.map((id) => byId.get(id)!);
    let cursor = 0;

    // 같은 종류 항목이 있던 자리에 새 순서대로 다시 채워 넣음
    saveOptions(
      account,
      items.map((item) => (item.kind === body.data.kind ? reordered[cursor++]! : item)),
    );

    return HttpResponse.json({ success: true });
  }),

  http.patch('/api/v1/company/options/:id', async ({ request, params }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsedParams = optionParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    const body = await parseBody(request, optionUpdateSchema);

    if ('response' in body) return body.response;

    const items = getOptions(account);
    const target = items.find((item) => item.id === parsedParams.data.id);

    if (!target) return apiError('NOT_FOUND');

    const { name, isActive } = body.data;

    if (
      name !== undefined &&
      items.some(
        (item) =>
          item.id !== target.id &&
          item.kind === target.kind &&
          normalizeOptionName(item.name) === normalizeOptionName(name),
      )
    ) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.name', message: '이미 같은 이름이 있습니다' },
      ]);
    }

    const updated = { ...target, name: name ?? target.name, isActive: isActive ?? target.isActive };

    saveOptions(
      account,
      items.map((item) => (item.id === target.id ? updated : item)),
    );

    return HttpResponse.json(updated);
  }),

  http.get('/api/v1/employees', async ({ request }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const query = employeeListQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    if (!query.success) {
      return apiError(
        'VALIDATION_ERROR',
        query.error.issues.map((issue) => ({
          path: ['query', ...issue.path].join('.'),
          message: issue.message,
        })),
      );
    }

    const { status, jobTypeId, workerTypeId, q } = query.data;
    // 서버와 같은 규칙: 목록에는 생년월일·연락처·메모를 싣지 않고, 재직 → 휴직 → 퇴사 순에 이름순
    const items = getEmployees(account)
      .filter(
        (item) =>
          (!status || item.status === status) &&
          (!jobTypeId || item.jobTypeId === jobTypeId) &&
          (!workerTypeId || item.workerTypeId === workerTypeId) &&
          (!q || item.name.toLowerCase().includes(q.toLowerCase())),
      )
      .sort(
        (a, b) =>
          EMPLOYEE_STATUSES.indexOf(a.status) - EMPLOYEE_STATUSES.indexOf(b.status) ||
          a.name.localeCompare(b.name, 'ko'),
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
        title: item.title,
        jobTypeId: item.jobTypeId,
        workerTypeId: item.workerTypeId,
        status: item.status,
        hiredOn: item.hiredOn,
        leftOn: item.leftOn,
      }));

    return HttpResponse.json({ items });
  }),

  http.post('/api/v1/employees', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, employeeCreateSchema);

    if ('response' in body) return body.response;

    const employees = getEmployees(account);
    const input = body.data;

    if (employees.length >= EMPLOYEE_MAX_PER_COMPANY) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body', message: '직원은 회사마다 500명까지 등록할 수 있습니다' },
      ]);
    }

    const optionError =
      checkOption(account, 'JOB_TYPE', 'body.jobTypeId', '직종', input.jobTypeId, null) ??
      checkOption(
        account,
        'WORKER_TYPE',
        'body.workerTypeId',
        '직원 구분',
        input.workerTypeId,
        null,
      );

    if (optionError) return optionError;

    if (input.birthDate && input.birthDate > todayInSeoul(new Date())) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.birthDate', message: '생년월일은 오늘 이전이어야 합니다' },
      ]);
    }

    const now = new Date().toISOString();
    const created: EmployeeDetail = {
      id: crypto.randomUUID(),
      name: input.name,
      title: input.title ?? null,
      jobTypeId: input.jobTypeId ?? null,
      workerTypeId: input.workerTypeId ?? null,
      status: input.status ?? 'ACTIVE',
      hiredOn: input.hiredOn ?? null,
      leftOn: null,
      birthDate: input.birthDate ?? null,
      phone: input.phone ?? null,
      memo: input.memo || null,
      createdAt: now,
      updatedAt: now,
    };

    saveEmployees(account, [...employees, created]);

    return HttpResponse.json(created, { status: 201 });
  }),

  http.get('/api/v1/employees/:id', async ({ params }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = employeeParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    const found = getEmployees(account).find((item) => item.id === parsed.data.id);

    return found ? HttpResponse.json(found) : apiError('NOT_FOUND');
  }),

  http.patch('/api/v1/employees/:id', async ({ request, params }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = employeeParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    const body = await parseBody(request, employeeUpdateSchema);

    if ('response' in body) return body.response;

    const employees = getEmployees(account);
    const current = employees.find((item) => item.id === parsed.data.id);

    if (!current) return apiError('NOT_FOUND');

    const input = body.data;
    const today = todayInSeoul(new Date());
    const resolved = resolveEmployeeStatus(
      { status: current.status, leftOn: current.leftOn },
      { status: input.status, leftOn: input.leftOn },
      today,
    );

    if (!resolved.ok) {
      return apiError('VALIDATION_ERROR', [{ path: 'body.leftOn', message: resolved.message }]);
    }

    const optionError =
      checkOption(
        account,
        'JOB_TYPE',
        'body.jobTypeId',
        '직종',
        input.jobTypeId,
        current.jobTypeId,
      ) ??
      checkOption(
        account,
        'WORKER_TYPE',
        'body.workerTypeId',
        '직원 구분',
        input.workerTypeId,
        current.workerTypeId,
      );

    if (optionError) return optionError;

    if (input.birthDate && input.birthDate > today) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.birthDate', message: '생년월일은 오늘 이전이어야 합니다' },
      ]);
    }

    const hiredOn = input.hiredOn === undefined ? current.hiredOn : input.hiredOn;

    if (hiredOn && resolved.leftOn && resolved.leftOn < hiredOn) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.leftOn', message: '퇴사일은 입사일보다 빠를 수 없습니다' },
      ]);
    }

    // 보낸 항목만 바꾸고, 보내지 않은(undefined) 항목은 그대로 둠
    const updated: EmployeeDetail = {
      ...current,
      name: input.name ?? current.name,
      title: input.title === undefined ? current.title : input.title,
      jobTypeId: input.jobTypeId === undefined ? current.jobTypeId : input.jobTypeId,
      workerTypeId: input.workerTypeId === undefined ? current.workerTypeId : input.workerTypeId,
      status: resolved.status,
      hiredOn,
      leftOn: resolved.leftOn,
      birthDate: input.birthDate === undefined ? current.birthDate : input.birthDate,
      phone: input.phone === undefined ? current.phone : input.phone,
      memo: input.memo === undefined ? current.memo : input.memo || null,
      updatedAt: new Date().toISOString(),
    };

    saveEmployees(
      account,
      employees.map((item) => (item.id === current.id ? updated : item)),
    );

    return HttpResponse.json(updated);
  }),

  http.post('/api/v1/me/closure', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, closureRequestSchema);

    if ('response' in body) return body.response;

    // 비밀번호 로그인이 있는 계정만 비밀번호를 다시 확인
    if (account.hasPassword !== false) {
      if (!body.data.currentPassword) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.currentPassword', message: '현재 비밀번호를 입력해 주세요' },
        ]);
      }

      if (isLoginLocked(account.loginId)) return apiError('ACCOUNT_LOCKED');

      if (account.password !== body.data.currentPassword) {
        if (recordFailedLogin(account.loginId) >= MOCK_MAX_FAILED_LOGINS) {
          return apiError('ACCOUNT_LOCKED');
        }

        return apiError('CURRENT_PASSWORD_INVALID');
      }

      clearFailedLogins(account.loginId);
    }

    const purgeAfter = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    startClosure(account, purgeAfter);
    // 실제 서버처럼 요청 즉시 모든 기기 로그아웃
    signOut();

    return HttpResponse.json({ purgeAfter });
  }),

  http.get('/api/v1/auth/closure/:token', async ({ params }) => {
    await simulateLatency();

    const parsed = closureTokenParamsSchema.safeParse(params);
    const closing = findClosingAccount();

    if (
      !parsed.success ||
      parsed.data.token !== MOCK_CLOSURE_TOKEN ||
      !closing?.closingPurgeAfter
    ) {
      return apiError('NOT_FOUND');
    }

    return HttpResponse.json({ purgeAfter: closing.closingPurgeAfter });
  }),

  http.post('/api/v1/auth/closure/cancel', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const body = await parseBody(request, closureCancelSchema);

    if ('response' in body) return body.response;

    const closing = findClosingAccount();

    if (body.data.token !== MOCK_CLOSURE_TOKEN || !closing) return apiError('NOT_FOUND');

    cancelClosure(closing);

    return HttpResponse.json({ success: true });
  }),

  http.post('/api/v1/me/email/change', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, emailChangeSchema);

    if ('response' in body) return body.response;

    if (isLoginLocked(account.loginId)) return apiError('ACCOUNT_LOCKED');

    if (account.password !== body.data.currentPassword) {
      if (recordFailedLogin(account.loginId) >= MOCK_MAX_FAILED_LOGINS) {
        return apiError('ACCOUNT_LOCKED');
      }

      return apiError('CURRENT_PASSWORD_INVALID');
    }

    clearFailedLogins(account.loginId);

    const newEmail = body.data.newEmail.trim().toLowerCase();

    if (newEmail === account.email) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.newEmail', message: '현재 이메일과 같습니다' },
      ]);
    }

    if (isEmailInUse(newEmail)) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.newEmail', message: '이미 사용 중인 이메일입니다' },
      ]);
    }

    setPendingEmail(account, newEmail);

    return HttpResponse.json({ resendAfterSeconds: 30 });
  }),

  // 소셜 로그인 (카카오). 시작은 목업 카카오 화면(/mock-kakao) 주소를 돌려줌
  http.get('/api/v1/auth/social/providers', async () => {
    await simulateLatency();

    return HttpResponse.json({ kakao: true });
  }),

  http.post('/api/v1/auth/kakao/start', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const body = await parseBody(request, socialStartRequestSchema);

    if ('response' in body) return body.response;

    if (body.data.purpose === 'login') {
      return HttpResponse.json({ url: '/mock-kakao?purpose=login' });
    }

    if (body.data.inviteToken !== DEMO_INVITATION.token) return apiError('NOT_FOUND');

    const agreed = body.data.consents
      .filter((consent) => consent.isAgreed)
      .map((consent) => consent.documentId);
    const query = new URLSearchParams({
      purpose: 'signup',
      token: body.data.inviteToken,
      agreed: agreed.join(','),
    });

    return HttpResponse.json({ url: `/mock-kakao?${query.toString()}` });
  }),

  http.post('/api/v1/me/social/kakao/start', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');
    if (!getCurrentAccount()) return apiError('UNAUTHORIZED');

    return HttpResponse.json({ url: '/mock-kakao?purpose=link' });
  }),

  http.get('/api/v1/me/social', async () => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    return HttpResponse.json({
      hasPassword: account.hasPassword !== false,
      kakao: { isLinked: account.kakaoProfileKey !== undefined },
    });
  }),

  http.delete('/api/v1/me/social/kakao', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    // 비밀번호 로그인이 없으면 마지막 로그인 수단이라 해제할 수 없음 (실제 서버와 같은 규칙)
    if (account.hasPassword === false) return apiError('LAST_LOGIN_METHOD');

    setKakaoProfile(account, undefined);

    return HttpResponse.json({ success: true });
  }),

  // 계약 밖의 목업 전용 주소: 목업 카카오 화면에서 계정을 고르면 서버 콜백이 하던 일을 흉내 내고 이동할 주소를 돌려줌
  http.post('/api/__mock/kakao/complete', async ({ request }) => {
    await simulateLatency();

    const { purpose, profileKey, token, agreed } = (await request.json()) as {
      purpose: 'login' | 'link' | 'signup';
      profileKey: string | null;
      token?: string;
      agreed?: string;
    };
    const profile = MOCK_KAKAO_PROFILES.find((item) => item.key === profileKey);
    const returnPath =
      purpose === 'link' ? '/settings' : purpose === 'signup' ? `/invite/${token ?? ''}` : '/login';
    const to = (path: string, result?: string) => ({
      redirect: result ? `${path}?social=${result}` : path,
    });

    if (!profile) return HttpResponse.json(to(returnPath, 'cancelled'));

    if (purpose === 'login') {
      const account = findAccountByKakao(profile.key);

      if (!account) return HttpResponse.json(to('/login', 'not-linked'));

      if (account.closingPurgeAfter) return HttpResponse.json(to('/login', 'closing'));

      signIn(account.loginId);

      return HttpResponse.json(to(account.isEmailVerified ? '/' : '/verify-email'));
    }

    if (purpose === 'link') {
      const current = getCurrentAccount();

      if (!current) return HttpResponse.json(to('/settings', 'failed'));

      if (findAccountByKakao(profile.key) && findAccountByKakao(profile.key) !== current) {
        return HttpResponse.json(to('/settings', 'already-linked'));
      }

      setKakaoProfile(current, profile.key);

      return HttpResponse.json(to('/settings', 'linked'));
    }

    // 초대 가입: 인증된 이메일이 있는 카카오 계정만 가능, 필수 약관 동의 확인
    if (token !== DEMO_INVITATION.token)
      return HttpResponse.json(to('/login', 'invitation-invalid'));

    const agreedIds = new Set((agreed ?? '').split(',').filter(Boolean));

    if (
      !LEGAL_DOCUMENTS.filter((document) => document.isRequired).every((document) =>
        agreedIds.has(document.id),
      )
    ) {
      return HttpResponse.json(to(returnPath, 'failed'));
    }

    if (!profile.verifiedEmail) return HttpResponse.json(to(returnPath, 'email-required'));

    if (isEmailInUse(profile.verifiedEmail))
      return HttpResponse.json(to(returnPath, 'email-taken'));

    if (findAccountByKakao(profile.key)) return HttpResponse.json(to(returnPath, 'already-linked'));

    const account: MockAccount = {
      loginId: `kakao-${profile.key}`,
      password: '',
      hasPassword: false,
      kakaoProfileKey: profile.key,
      displayName: DEMO_INVITATION.adminName,
      email: profile.verifiedEmail,
      isEmailVerified: true,
      companyName: DEMO_INVITATION.companyName,
      settings: { standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
    };

    addAccount(account);
    signIn(account.loginId);

    return HttpResponse.json(to('/'));
  }),
];
