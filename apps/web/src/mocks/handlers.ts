import {
  closureCancelSchema,
  closureRequestSchema,
  closureTokenParamsSchema,
  companySettingsSchema,
  socialStartRequestSchema,
  EMPLOYEE_MAX_PER_COMPANY,
  PARTNER_KINDS,
  allowedProjectFields,
  assignmentCancelSchema,
  checkWorkDate,
  dailyOverMinutes,
  isLateInput,
  validateWorkLogForSave,
  summarizeEmployeeWork,
  summarizeProjectWork,
  workLogListQuerySchema,
  workSummaryQuerySchema,
  workLogParamsSchema,
  workLogSaveSchema,
  workLogStatusCheck,
  type WorkLogWarning,
  assignmentCreateSchema,
  assignmentParamsSchema,
  assignmentStatusCheck,
  assignmentUpdateSchema,
  checkAssignmentPeriod,
  overlapRange,
  periodChangeNeedsReason,
  type AssignmentWarning,
  formatProjectCode,
  PROJECT_STATUS_LABELS,
  projectTransitionSchema,
  validateProjectTransition,
  projectCreateSchema,
  projectListQuerySchema,
  projectParamsSchema,
  projectUpdateSchema,
  type ProjectDetail,
  PARTNER_MAX_PER_COMPANY,
  normalizePartnerName,
  partnerCreateSchema,
  partnerListQuerySchema,
  partnerParamsSchema,
  partnerUpdateSchema,
  type PartnerDetail,
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
  type AssignmentRow,
  type MockAccount,
  type MockWorkLog,
} from './data';
import {
  addAccount,
  applyPendingEmail,
  cancelClosure,
  consumeMockReset,
  findClosingAccount,
  getEmployees,
  getOptions,
  addProjectPeriodChange,
  addWorkLogRevision,
  getWorkLogRevisions,
  getWorkLogs,
  saveWorkLogs,
  addProjectStatusChange,
  getAssignments,
  getProjectPeriodHistory,
  saveAssignments,
  getPartners,
  getProjectHistory,
  getProjects,
  saveProjects,
  savePartners,
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
import { createMemoHandlers } from './memoHandlers';
import { createPhotoHandlers } from './photoHandlers';

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

// 프로젝트의 고객·담당자·공종 검사 (서버와 같은 규칙): 같은 회사의 해당 구분·종류만, 숨기거나 퇴사한 대상은 새로 고를 수 없음
const checkClient = (account: MockAccount, id: string, currentId: string | null) => {
  const partner = getPartners(account).find((item) => item.id === id && item.kind === 'CLIENT');

  if (!partner) {
    return apiError('VALIDATION_ERROR', [
      { path: 'body.clientId', message: '선택할 수 없는 고객입니다' },
    ]);
  }

  return partner.isActive || id === currentId
    ? null
    : apiError('VALIDATION_ERROR', [
        { path: 'body.clientId', message: '숨긴 고객은 새로 고를 수 없습니다' },
      ]);
};

const checkManager = (account: MockAccount, id: string, currentId: string | null) => {
  const employee = getEmployees(account).find((item) => item.id === id);

  if (!employee) {
    return apiError('VALIDATION_ERROR', [
      { path: 'body.managerId', message: '선택할 수 없는 담당자입니다' },
    ]);
  }

  return employee.status !== 'LEFT' || id === currentId
    ? null
    : apiError('VALIDATION_ERROR', [
        { path: 'body.managerId', message: '퇴사한 직원은 담당자로 지정할 수 없습니다' },
      ]);
};

const checkTrades = (account: MockAccount, ids: string[], currentIds: string[]) => {
  const invalid = (message: string) =>
    apiError('VALIDATION_ERROR', [{ path: 'body.tradeIds', message }]);

  if (new Set(ids).size !== ids.length) return invalid('같은 공종을 두 번 고를 수 없습니다');

  const options = getOptions(account).filter((item) => item.kind === 'TRADE');
  const found = ids.flatMap((id) => options.find((item) => item.id === id) ?? []);

  if (found.length !== ids.length) return invalid('선택할 수 없는 공종이 있습니다');

  return found.some((item) => !item.isActive && !currentIds.includes(item.id))
    ? invalid('숨긴 공종은 새로 고를 수 없습니다')
    : null;
};

// 같은 프로젝트·같은 직원의 취소하지 않은 투입과 기간이 겹치면 사유 문구를 돌려줌 (서버와 같은 규칙)
const findSameProjectOverlap = (
  account: MockAccount,
  projectId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
  exceptId: string | null,
) => {
  const clash = getAssignments(account).find(
    (item) =>
      item.projectId === projectId &&
      item.employeeId === employeeId &&
      !item.cancelledAt &&
      item.id !== exceptId &&
      overlapRange(startDate, endDate, item.startDate, item.endDate) !== null,
  );

  return clash
    ? `같은 직원이 이 프로젝트에 ${clash.startDate} ~ ${clash.endDate}로 이미 투입되어 있습니다. 기존 투입의 기간을 수정해 주세요`
    : null;
};

// 같은 날 다른 프로젝트에 겹쳐 배정되거나 휴직·퇴사 직원이면 경고 (막지는 않음)
const withAssignmentWarnings = (account: MockAccount, row: AssignmentRow) => {
  if (row.cancelledAt) return { ...row, warnings: [] as AssignmentWarning[] };

  const projects = getProjects(account);
  const warnings: AssignmentWarning[] = [];

  for (const other of getAssignments(account)) {
    if (
      other.employeeId !== row.employeeId ||
      other.cancelledAt ||
      other.projectId === row.projectId
    )
      continue;

    const project = projects.find((item) => item.id === other.projectId);
    const range = overlapRange(row.startDate, row.endDate, other.startDate, other.endDate);

    if (project && project.status !== 'CANCELLED' && range) {
      warnings.push({
        type: 'OVERLAP',
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        ...range,
      });
    }
  }

  const status = getEmployees(account).find((item) => item.id === row.employeeId)?.status;

  if (status === 'ON_LEAVE') warnings.push({ type: 'ON_LEAVE' });
  if (status === 'LEFT') warnings.push({ type: 'LEFT' });

  return { ...row, warnings };
};

// 일지 응답: 경고(하루 합계 초과·휴직·퇴사)는 응답할 때 계산 (서버와 같은 규칙, 저장된 다른 프로젝트 일지만 합계에 포함)
const toMockWorkLog = (
  account: MockAccount,
  log: MockWorkLog,
  autoAssignedEmployeeIds: string[],
) => {
  const employees = getEmployees(account);
  const projects = getProjects(account);
  const limit = dailyOverMinutes(account.settings.standardWorkMinutes);
  const warnings: WorkLogWarning[] = [];

  for (const employeeId of [...new Set(log.entries.map((entry) => entry.employeeId))]) {
    const own = log.entries
      .filter((entry) => entry.employeeId === employeeId)
      .reduce((sum, entry) => sum + entry.minutes, 0);
    const otherProjects = getWorkLogs(account)
      .filter(
        (other) =>
          other.id !== log.id && other.workDate === log.workDate && other.status === 'SAVED',
      )
      .flatMap((other) => {
        const minutes = other.entries
          .filter((entry) => entry.employeeId === employeeId)
          .reduce((sum, entry) => sum + entry.minutes, 0);
        const project = projects.find((item) => item.id === other.projectId);

        return minutes > 0 && project
          ? [
              {
                projectId: project.id,
                projectCode: project.code,
                projectName: project.name,
                minutes,
              },
            ]
          : [];
      });
    const total = own + otherProjects.reduce((sum, item) => sum + item.minutes, 0);

    if (total > limit)
      warnings.push({ type: 'DAILY_OVER', employeeId, totalMinutes: total, otherProjects });

    const status = employees.find((item) => item.id === employeeId)?.status;

    if (status === 'ON_LEAVE') warnings.push({ type: 'ON_LEAVE', employeeId });
    if (status === 'LEFT') warnings.push({ type: 'LEFT', employeeId });
  }

  return {
    ...log,
    isLate: isLateInput(log.workDate, log.savedAt ? todayInSeoul(new Date(log.savedAt)) : null),
    warnings,
    autoAssignedEmployeeIds,
  };
};

export const handlers = [
  ...createPhotoHandlers({ apiError, parseBody }),
  ...createMemoHandlers({ apiError, parseBody }),

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

  http.get('/api/v1/partners', async ({ request }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const query = partnerListQuerySchema.safeParse(
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

    const { kind, q } = query.data;
    const needle = q?.toLowerCase();
    // 서버와 같은 규칙: 목록에는 연락처·메모를 싣지 않고, 구분 순서에 이름순
    const items = getPartners(account)
      .filter(
        (item) =>
          (!kind || item.kind === kind) &&
          (!needle ||
            item.name.toLowerCase().includes(needle) ||
            (item.contactName ?? '').toLowerCase().includes(needle)),
      )
      .sort(
        (a, b) =>
          PARTNER_KINDS.indexOf(a.kind) - PARTNER_KINDS.indexOf(b.kind) ||
          a.name.localeCompare(b.name, 'ko'),
      )
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
        contactName: item.contactName,
        isActive: item.isActive,
      }));

    return HttpResponse.json({ items });
  }),

  http.post('/api/v1/partners', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, partnerCreateSchema);

    if ('response' in body) return body.response;

    const partners = getPartners(account);
    const input = body.data;

    if (partners.length >= PARTNER_MAX_PER_COMPANY) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body', message: '명부는 회사마다 1000곳까지 등록할 수 있습니다' },
      ]);
    }

    if (
      partners.some(
        (item) =>
          item.kind === input.kind &&
          normalizePartnerName(item.name) === normalizePartnerName(input.name),
      )
    ) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.name', message: '같은 구분에 이미 같은 상호가 있습니다' },
      ]);
    }

    const now = new Date().toISOString();
    const created: PartnerDetail = {
      id: crypto.randomUUID(),
      kind: input.kind,
      name: input.name,
      contactName: input.contactName ?? null,
      phone: input.phone ?? null,
      memo: input.memo || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    savePartners(account, [...partners, created]);

    return HttpResponse.json(created, { status: 201 });
  }),

  http.get('/api/v1/partners/:id', async ({ params }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = partnerParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    const found = getPartners(account).find((item) => item.id === parsed.data.id);

    return found ? HttpResponse.json(found) : apiError('NOT_FOUND');
  }),

  http.patch('/api/v1/partners/:id', async ({ request, params }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = partnerParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    const body = await parseBody(request, partnerUpdateSchema);

    if ('response' in body) return body.response;

    const partners = getPartners(account);
    const current = partners.find((item) => item.id === parsed.data.id);

    if (!current) return apiError('NOT_FOUND');

    const input = body.data;

    if (
      input.name !== undefined &&
      partners.some(
        (item) =>
          item.id !== current.id &&
          item.kind === current.kind &&
          normalizePartnerName(item.name) === normalizePartnerName(input.name!),
      )
    ) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.name', message: '같은 구분에 이미 같은 상호가 있습니다' },
      ]);
    }

    // 보낸 항목만 바꾸고, 보내지 않은(undefined) 항목은 그대로 둠 (구분은 바꿀 수 없음)
    const updated: PartnerDetail = {
      ...current,
      name: input.name ?? current.name,
      contactName: input.contactName === undefined ? current.contactName : input.contactName,
      phone: input.phone === undefined ? current.phone : input.phone,
      memo: input.memo === undefined ? current.memo : input.memo || null,
      isActive: input.isActive ?? current.isActive,
      updatedAt: new Date().toISOString(),
    };

    savePartners(
      account,
      partners.map((item) => (item.id === current.id ? updated : item)),
    );

    return HttpResponse.json(updated);
  }),

  http.get('/api/v1/projects', async ({ request }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const query = projectListQuerySchema.safeParse(
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

    const { status, clientId, managerId, tradeId, from, to, q, sort = 'recent' } = query.data;
    const needle = q?.toLowerCase();
    const codeKey = (code: string) => {
      const [year, sequence] = code.split('-').map(Number) as [number, number];

      return year * 1_000_000 + sequence;
    };
    // 서버와 같은 규칙: 목록에는 현장 연락처·출입 메모·계약일·메모를 싣지 않음
    const items = getProjects(account)
      .filter(
        (item) =>
          (!status || item.status === status) &&
          (!clientId || item.clientId === clientId) &&
          (!managerId || item.managerId === managerId) &&
          (!tradeId || item.tradeIds.includes(tradeId)) &&
          (!from || item.plannedEnd >= from) &&
          (!to || item.plannedStart <= to) &&
          (!needle ||
            item.name.toLowerCase().includes(needle) ||
            item.code.toLowerCase().includes(needle) ||
            item.siteName.toLowerCase().includes(needle)),
      )
      .sort((a, b) => {
        const recent = codeKey(b.code) - codeKey(a.code);

        if (sort === 'endDate') return a.plannedEnd.localeCompare(b.plannedEnd) || recent;
        if (sort === 'name') return a.name.localeCompare(b.name, 'ko') || recent;

        return recent;
      })
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        status: item.status,
        siteName: item.siteName,
        clientId: item.clientId,
        managerId: item.managerId,
        tradeIds: item.tradeIds,
        plannedStart: item.plannedStart,
        plannedEnd: item.plannedEnd,
      }));

    return HttpResponse.json({ items });
  }),

  http.post('/api/v1/projects', async ({ request }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, projectCreateSchema);

    if ('response' in body) return body.response;

    const projects = getProjects(account);
    const input = body.data;
    const tradeIds = input.tradeIds ?? [];
    const referenceError =
      checkClient(account, input.clientId, null) ??
      checkManager(account, input.managerId, null) ??
      checkTrades(account, tradeIds, []);

    if (referenceError) return referenceError;

    // 서버와 같은 규칙: 등록한 날(서울 기준) 연도로 그 해의 마지막 번호 다음 번호를 붙임
    const year = Number(todayInSeoul(new Date()).slice(0, 4));
    const last = projects
      .filter((item) => item.code.startsWith(`${year}-`))
      .reduce((max, item) => Math.max(max, Number(item.code.split('-')[1])), 0);
    const now = new Date().toISOString();
    const created: ProjectDetail = {
      id: crypto.randomUUID(),
      code: formatProjectCode(year, last + 1),
      name: input.name,
      status: 'PLANNED',
      siteName: input.siteName,
      siteAddress: input.siteAddress ?? null,
      siteMapUrl: input.siteMapUrl ?? null,
      siteContactName: input.siteContactName ?? null,
      siteContactPhone: input.siteContactPhone ?? null,
      accessMemo: input.accessMemo || null,
      clientId: input.clientId,
      managerId: input.managerId,
      tradeIds,
      contractDate: input.contractDate,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      actualStart: null,
      actualEnd: null,
      memo: input.memo || null,
      createdAt: now,
      updatedAt: now,
    };

    saveProjects(account, [...projects, created]);

    return HttpResponse.json(created, { status: 201 });
  }),

  http.get('/api/v1/projects/:id', async ({ params }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    const found = getProjects(account).find((item) => item.id === parsed.data.id);

    return found ? HttpResponse.json(found) : apiError('NOT_FOUND');
  }),

  http.patch('/api/v1/projects/:id', async ({ request, params }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    const body = await parseBody(request, projectUpdateSchema);

    if ('response' in body) return body.response;

    const projects = getProjects(account);
    const current = projects.find((item) => item.id === parsed.data.id);

    if (!current) return apiError('NOT_FOUND');

    const input = body.data;

    // 서버와 같은 규칙: 종료·취소는 수정 불가, 보증 중은 담당자·메모만
    const allowed = allowedProjectFields(current.status);

    if (allowed !== 'all') {
      const blocked = Object.entries(input).find(
        ([key, value]) => value !== undefined && !allowed.includes(key),
      );

      if (blocked) {
        return apiError('VALIDATION_ERROR', [
          allowed.length === 0
            ? {
                path: 'body',
                message: `'${PROJECT_STATUS_LABELS[current.status]}' 상태의 프로젝트는 수정할 수 없습니다`,
              }
            : {
                path: `body.${blocked[0]}`,
                message: `'${PROJECT_STATUS_LABELS[current.status]}' 상태에서는 담당자와 메모만 수정할 수 있습니다`,
              },
        ]);
      }
    }

    const referenceError =
      (input.clientId !== undefined
        ? checkClient(account, input.clientId, current.clientId)
        : null) ??
      (input.managerId !== undefined
        ? checkManager(account, input.managerId, current.managerId)
        : null) ??
      (input.tradeIds !== undefined
        ? checkTrades(account, input.tradeIds, current.tradeIds)
        : null);

    if (referenceError) return referenceError;

    // 한쪽 날짜만 바꿔도 합친 값으로 순서를 확인
    const plannedStart = input.plannedStart ?? current.plannedStart;
    const plannedEnd = input.plannedEnd ?? current.plannedEnd;

    if (plannedStart > plannedEnd) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.plannedEnd', message: '종료 예정일은 시작 예정일보다 빠를 수 없습니다' },
      ]);
    }

    // 예정 기간을 바꾸면 이력을 남김 (서버와 같은 규칙: 시작한 뒤에는 사유 필수, 투입이 새 기간 밖으로 나가면 거부)
    const periodChanged =
      plannedStart !== current.plannedStart || plannedEnd !== current.plannedEnd;
    const periodReason = input.periodChangeReason?.trim() || null;

    if (periodChanged) {
      if (periodChangeNeedsReason(current.status) && !periodReason) {
        return apiError('VALIDATION_ERROR', [
          {
            path: 'body.periodChangeReason',
            message: '시작한 프로젝트의 기간을 바꿀 때는 사유를 입력해 주세요',
          },
        ]);
      }

      const outside = getAssignments(account).filter(
        (item) =>
          item.projectId === current.id &&
          !item.cancelledAt &&
          (item.startDate < plannedStart || item.endDate > plannedEnd),
      ).length;

      if (outside > 0) {
        return apiError('VALIDATION_ERROR', [
          {
            path: input.plannedStart !== undefined ? 'body.plannedStart' : 'body.plannedEnd',
            message: `투입 ${outside}건이 새 기간 밖에 있습니다. 먼저 투입 기간을 조정하거나 취소해 주세요`,
          },
        ]);
      }

      addProjectPeriodChange(account, current.id, {
        id: crypto.randomUUID(),
        fromStart: current.plannedStart,
        fromEnd: current.plannedEnd,
        toStart: plannedStart,
        toEnd: plannedEnd,
        reason: periodReason,
        changedAt: new Date().toISOString(),
      });
    }

    // 보낸 항목만 바꾸고, 보내지 않은(undefined) 항목은 그대로 둠 (코드·상태는 바꿀 수 없음)
    const updated: ProjectDetail = {
      ...current,
      name: input.name ?? current.name,
      siteName: input.siteName ?? current.siteName,
      siteAddress: input.siteAddress === undefined ? current.siteAddress : input.siteAddress,
      siteMapUrl: input.siteMapUrl === undefined ? current.siteMapUrl : input.siteMapUrl,
      siteContactName:
        input.siteContactName === undefined ? current.siteContactName : input.siteContactName,
      siteContactPhone:
        input.siteContactPhone === undefined ? current.siteContactPhone : input.siteContactPhone,
      accessMemo: input.accessMemo === undefined ? current.accessMemo : input.accessMemo || null,
      clientId: input.clientId ?? current.clientId,
      managerId: input.managerId ?? current.managerId,
      tradeIds: input.tradeIds ?? current.tradeIds,
      contractDate: input.contractDate ?? current.contractDate,
      plannedStart,
      plannedEnd,
      memo: input.memo === undefined ? current.memo : input.memo || null,
      updatedAt: new Date().toISOString(),
    };

    saveProjects(
      account,
      projects.map((item) => (item.id === current.id ? updated : item)),
    );

    return HttpResponse.json(updated);
  }),

  http.post('/api/v1/projects/:id/status', async ({ request, params }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    const body = await parseBody(request, projectTransitionSchema);

    if ('response' in body) return body.response;

    const projects = getProjects(account);
    const current = projects.find((item) => item.id === parsed.data.id);

    if (!current) return apiError('NOT_FOUND');

    // 서버와 같은 규칙: 허용된 전환·날짜·사유를 공유 검사 함수로 확인
    const today = todayInSeoul(new Date());
    const effectiveOn = body.data.effectiveOn ?? today;
    const reason = body.data.reason?.trim() || null;
    const history = getProjectHistory(account, current.id);
    const lastEffectiveOn = history.reduce<string | null>(
      (latest, item) => (latest === null || item.effectiveOn > latest ? item.effectiveOn : latest),
      null,
    );
    const checked = validateProjectTransition({
      from: current.status,
      to: body.data.toStatus,
      effectiveOn,
      reason,
      actualStart: current.actualStart,
      lastEffectiveOn,
      today,
    });

    if (!checked.ok) {
      return apiError('VALIDATION_ERROR', [
        { path: `body.${checked.path}`, message: checked.message },
      ]);
    }

    const updated: ProjectDetail = {
      ...current,
      status: body.data.toStatus,
      // 처음 시작할 때만 실제 시작일을 기록하고, 완료할 때 실제 완료일을 기록
      actualStart:
        current.status === 'PLANNED' && body.data.toStatus === 'IN_PROGRESS'
          ? effectiveOn
          : current.actualStart,
      actualEnd: body.data.toStatus === 'COMPLETED' ? effectiveOn : current.actualEnd,
      updatedAt: new Date().toISOString(),
    };

    saveProjects(
      account,
      projects.map((item) => (item.id === current.id ? updated : item)),
    );
    addProjectStatusChange(account, current.id, {
      id: crypto.randomUUID(),
      fromStatus: current.status,
      toStatus: body.data.toStatus,
      effectiveOn,
      reason,
      changedAt: new Date().toISOString(),
    });

    return HttpResponse.json(updated);
  }),

  http.get('/api/v1/projects/:id/status-history', async ({ params }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    if (!getProjects(account).some((item) => item.id === parsed.data.id)) {
      return apiError('NOT_FOUND');
    }

    // 최근 변경이 맨 앞
    return HttpResponse.json({
      items: [...getProjectHistory(account, parsed.data.id)].sort((a, b) =>
        b.changedAt.localeCompare(a.changedAt),
      ),
    });
  }),

  http.get('/api/v1/projects/:id/assignments', async ({ request, params }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    if (!getProjects(account).some((item) => item.id === parsed.data.id)) {
      return apiError('NOT_FOUND');
    }

    const includeCancelled = new URL(request.url).searchParams.get('includeCancelled') === 'true';
    const rows = getAssignments(account)
      .filter(
        (item) => item.projectId === parsed.data.id && (includeCancelled || !item.cancelledAt),
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));

    return HttpResponse.json({ items: rows.map((row) => withAssignmentWarnings(account, row)) });
  }),

  http.post('/api/v1/projects/:id/assignments', async ({ request, params }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    const body = await parseBody(request, assignmentCreateSchema);

    if ('response' in body) return body.response;

    const project = getProjects(account).find((item) => item.id === parsed.data.id);

    if (!project) return apiError('NOT_FOUND');

    const input = body.data;
    const invalid = (path: string, message: string) =>
      apiError('VALIDATION_ERROR', [{ path: `body.${path}`, message }]);
    const statusCheck = assignmentStatusCheck(project.status, input.confirmSuspended === true);

    if (!statusCheck.ok) return invalid(statusCheck.path, statusCheck.message);

    const employee = getEmployees(account).find((item) => item.id === input.employeeId);

    if (!employee) return invalid('employeeId', '선택할 수 없는 직원입니다');
    if (employee.status === 'LEFT')
      return invalid('employeeId', '퇴사한 직원은 투입할 수 없습니다');

    const periodCheck = checkAssignmentPeriod(input.startDate, input.endDate, project);

    if (!periodCheck.ok) return invalid(periodCheck.path, periodCheck.message);

    const clash = findSameProjectOverlap(
      account,
      project.id,
      input.employeeId,
      input.startDate,
      input.endDate,
      null,
    );

    if (clash) return invalid('startDate', clash);

    const created: AssignmentRow = {
      id: crypto.randomUUID(),
      projectId: project.id,
      employeeId: input.employeeId,
      startDate: input.startDate,
      endDate: input.endDate,
      plannedMinutes: input.plannedMinutes ?? null,
      cancelledAt: null,
    };

    saveAssignments(account, [...getAssignments(account), created]);

    return HttpResponse.json(withAssignmentWarnings(account, created), { status: 201 });
  }),

  http.patch('/api/v1/projects/:id/assignments/:assignmentId', async ({ request, params }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = assignmentParamsSchema.safeParse({
      id: params.id,
      assignmentId: params.assignmentId,
    });

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params', message: 'Invalid UUID' }]);
    }

    const body = await parseBody(request, assignmentUpdateSchema);

    if ('response' in body) return body.response;

    const project = getProjects(account).find((item) => item.id === parsed.data.id);

    if (!project) return apiError('NOT_FOUND');

    const current = getAssignments(account).find(
      (item) => item.id === parsed.data.assignmentId && item.projectId === project.id,
    );

    if (!current) return apiError('NOT_FOUND');

    const invalid = (path: string, message: string) =>
      apiError('VALIDATION_ERROR', [{ path: path === 'body' ? 'body' : `body.${path}`, message }]);

    if (current.cancelledAt) return invalid('body', '취소된 투입은 수정할 수 없습니다');

    const statusCheck = assignmentStatusCheck(project.status, body.data.confirmSuspended === true);

    if (!statusCheck.ok) return invalid(statusCheck.path, statusCheck.message);

    const startDate = body.data.startDate ?? current.startDate;
    const endDate = body.data.endDate ?? current.endDate;
    const periodCheck = checkAssignmentPeriod(startDate, endDate, project);

    if (!periodCheck.ok) return invalid(periodCheck.path, periodCheck.message);

    const clash = findSameProjectOverlap(
      account,
      project.id,
      current.employeeId,
      startDate,
      endDate,
      current.id,
    );

    if (clash) return invalid('startDate', clash);

    const updated: AssignmentRow = {
      ...current,
      startDate,
      endDate,
      plannedMinutes:
        body.data.plannedMinutes === undefined ? current.plannedMinutes : body.data.plannedMinutes,
    };

    saveAssignments(
      account,
      getAssignments(account).map((item) => (item.id === current.id ? updated : item)),
    );

    return HttpResponse.json(withAssignmentWarnings(account, updated));
  }),

  http.post(
    '/api/v1/projects/:id/assignments/:assignmentId/cancel',
    async ({ request, params }) => {
      await simulateLatency();

      if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = assignmentParamsSchema.safeParse({
        id: params.id,
        assignmentId: params.assignmentId,
      });

      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', [{ path: 'params', message: 'Invalid UUID' }]);
      }

      const body = await parseBody(request, assignmentCancelSchema);

      if ('response' in body) return body.response;

      const project = getProjects(account).find((item) => item.id === parsed.data.id);
      const current = getAssignments(account).find(
        (item) => item.id === parsed.data.assignmentId && item.projectId === parsed.data.id,
      );

      if (!project || !current) return apiError('NOT_FOUND');

      if (current.cancelledAt) {
        return apiError('VALIDATION_ERROR', [{ path: 'body', message: '이미 취소된 투입입니다' }]);
      }

      const statusCheck = assignmentStatusCheck(
        project.status,
        body.data.confirmSuspended === true,
      );

      if (!statusCheck.ok) {
        return apiError('VALIDATION_ERROR', [
          { path: `body.${statusCheck.path}`, message: statusCheck.message },
        ]);
      }

      const cancelled: AssignmentRow = { ...current, cancelledAt: new Date().toISOString() };

      saveAssignments(
        account,
        getAssignments(account).map((item) => (item.id === current.id ? cancelled : item)),
      );

      return HttpResponse.json({ ...cancelled, warnings: [] });
    },
  ),

  http.get('/api/v1/projects/:id/period-history', async ({ params }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    if (!getProjects(account).some((item) => item.id === parsed.data.id)) {
      return apiError('NOT_FOUND');
    }

    return HttpResponse.json({
      items: [...getProjectPeriodHistory(account, parsed.data.id)].sort((a, b) =>
        b.changedAt.localeCompare(a.changedAt),
      ),
    });
  }),

  http.get('/api/v1/projects/:id/work-summary', async ({ request, params }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    if (!getProjects(account).some((item) => item.id === parsed.data.id))
      return apiError('NOT_FOUND');

    const query = workSummaryQuerySchema.safeParse(
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

    const { from, to, unit } = query.data;
    const logs = getWorkLogs(account).filter(
      (item) =>
        item.projectId === parsed.data.id &&
        (!from || item.workDate >= from) &&
        (!to || item.workDate <= to),
    );
    const saved = logs.filter((item) => item.status === 'SAVED');

    return HttpResponse.json(
      summarizeProjectWork({
        entries: saved.flatMap((log) =>
          log.entries.map((entry) => ({
            workDate: log.workDate,
            employeeId: entry.employeeId,
            categoryId: entry.categoryId,
            minutes: entry.minutes,
          })),
        ),
        savedLogCount: saved.length,
        draftLogCount: logs.length - saved.length,
        assignments: getAssignments(account).filter(
          (item) => item.projectId === parsed.data.id && !item.cancelledAt,
        ),
        unit: unit ?? 'week',
      }),
    );
  }),

  http.get('/api/v1/employees/:id/work-history', async ({ params }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = employeeParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    if (!getEmployees(account).some((item) => item.id === parsed.data.id))
      return apiError('NOT_FOUND');

    const employeeId = parsed.data.id;
    const logs = getWorkLogs(account).filter((item) => item.status === 'SAVED');

    return HttpResponse.json(
      summarizeEmployeeWork({
        entries: logs.flatMap((log) =>
          log.entries
            .filter((entry) => entry.employeeId === employeeId)
            .map((entry) => ({
              projectId: log.projectId,
              workDate: log.workDate,
              minutes: entry.minutes,
            })),
        ),
        assignments: getAssignments(account).filter(
          (item) => item.employeeId === employeeId && !item.cancelledAt,
        ),
        projects: new Map(getProjects(account).map((item) => [item.id, item])),
        today: todayInSeoul(new Date()),
      }),
    );
  }),

  http.get('/api/v1/projects/:id/work-logs', async ({ request, params }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    if (!getProjects(account).some((item) => item.id === parsed.data.id))
      return apiError('NOT_FOUND');

    const query = workLogListQuerySchema.safeParse(
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

    const { from, to, status } = query.data;
    const items = getWorkLogs(account)
      .filter(
        (item) =>
          item.projectId === parsed.data.id &&
          (!status || item.status === status) &&
          (!from || item.workDate >= from) &&
          (!to || item.workDate <= to),
      )
      .sort((a, b) => b.workDate.localeCompare(a.workDate))
      .map((item) => ({
        id: item.id,
        workDate: item.workDate,
        status: item.status,
        isChange: item.isChange,
        isAfterService: item.isAfterService,
        isLate: isLateInput(
          item.workDate,
          item.savedAt ? todayInSeoul(new Date(item.savedAt)) : null,
        ),
        entryCount: item.entries.length,
        totalMinutes: item.entries.reduce((sum, entry) => sum + entry.minutes, 0),
        hasContent: item.content.trim().length > 0,
      }));

    return HttpResponse.json({ items });
  }),

  http.get('/api/v1/projects/:id/work-logs/:workDate', async ({ params }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = workLogParamsSchema.safeParse({ id: params.id, workDate: params.workDate });

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params', message: 'Invalid' }]);
    }

    const log = getWorkLogs(account).find(
      (item) => item.projectId === parsed.data.id && item.workDate === parsed.data.workDate,
    );

    return log ? HttpResponse.json(toMockWorkLog(account, log, [])) : apiError('NOT_FOUND');
  }),

  http.put('/api/v1/projects/:id/work-logs/:workDate', async ({ request, params }) => {
    await simulateLatency();

    if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = workLogParamsSchema.safeParse({ id: params.id, workDate: params.workDate });

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params', message: 'Invalid' }]);
    }

    const body = await parseBody(request, workLogSaveSchema);

    if ('response' in body) return body.response;

    const project = getProjects(account).find((item) => item.id === parsed.data.id);

    if (!project) return apiError('NOT_FOUND');

    const input = body.data;
    const { workDate } = parsed.data;
    const invalid = (path: string, message: string) =>
      apiError('VALIDATION_ERROR', [{ path: `body.${path}`, message }]);
    const confirmed = input.confirmStatus === true;
    const statusCheck = workLogStatusCheck(project.status, {
      confirmStatus: confirmed,
      isAfterService: input.isAfterService,
    });

    if (!statusCheck.ok) return invalid(statusCheck.path, statusCheck.message);

    const dateCheck = checkWorkDate(workDate, project, todayInSeoul(new Date()));

    if (!dateCheck.ok) return invalid(dateCheck.path, dateCheck.message);

    const saveCheck = validateWorkLogForSave(input);

    if (!saveCheck.ok) return invalid(saveCheck.path, saveCheck.message);

    const logs = getWorkLogs(account);
    const existing = logs.find(
      (item) => item.projectId === project.id && item.workDate === workDate,
    );

    // 낙관적 잠금 (서버와 같은 규칙)
    if (!existing && input.expectedVersion != null) return apiError('CONFLICT');
    if (existing && input.expectedVersion !== existing.version) return apiError('CONFLICT');

    if (existing?.status === 'SAVED' && input.status === 'DRAFT') {
      return invalid('status', '저장된 일지는 임시 저장으로 되돌릴 수 없습니다');
    }

    const employees = getEmployees(account);
    const options = getOptions(account);
    const usedCategories = new Set(existing?.entries.map((entry) => entry.categoryId) ?? []);

    if (
      input.entries.some((entry) => !employees.some((employee) => employee.id === entry.employeeId))
    ) {
      return invalid('entries', '선택할 수 없는 직원이 있습니다');
    }

    const categories = input.entries.map((entry) =>
      options.find((item) => item.id === entry.categoryId && item.kind === 'WORK_CATEGORY'),
    );

    if (categories.some((category) => !category))
      return invalid('entries', '선택할 수 없는 작업 구분이 있습니다');

    if (categories.some((category) => !category!.isActive && !usedCategories.has(category!.id))) {
      return invalid('entries', '숨긴 작업 구분은 새로 고를 수 없습니다');
    }

    // 투입 등록이 없는 직원: 저장할 때 확인을 요구하고, 확인하면 그날 투입을 자동으로 추가
    const autoAssigned: string[] = [];

    if (input.status === 'SAVED') {
      const assignments = getAssignments(account);
      const missing = [...new Set(input.entries.map((entry) => entry.employeeId))].filter(
        (employeeId) => {
          const employee = employees.find((item) => item.id === employeeId)!;

          return (
            employee.status !== 'LEFT' &&
            !assignments.some(
              (item) =>
                item.projectId === project.id &&
                item.employeeId === employeeId &&
                !item.cancelledAt &&
                item.startDate <= workDate &&
                item.endDate >= workDate,
            )
          );
        },
      );

      if (missing.length > 0) {
        if (input.addMissingAssignments !== true) {
          const names = missing
            .map((id) => employees.find((item) => item.id === id)!.name)
            .join(', ');

          return invalid(
            'addMissingAssignments',
            `투입 등록이 안 된 직원이 있습니다 (${names}). 투입을 자동으로 추가할지 확인해 주세요`,
          );
        }

        const assignable = assignmentStatusCheck(project.status, confirmed);

        if (!assignable.ok) {
          return invalid(
            'addMissingAssignments',
            `투입을 자동으로 추가할 수 없습니다. ${assignable.message}`,
          );
        }

        saveAssignments(account, [
          ...assignments,
          ...missing.map((employeeId) => ({
            id: crypto.randomUUID(),
            projectId: project.id,
            employeeId,
            startDate: workDate,
            endDate: workDate,
            plannedMinutes: null,
            cancelledAt: null,
          })),
        ]);
        autoAssigned.push(...missing);
      }
    }

    const nowIso = new Date().toISOString();
    const entries = input.entries.map(({ employeeId, categoryId, minutes }) => ({
      employeeId,
      categoryId,
      minutes,
    }));
    const next: MockWorkLog = {
      id: existing?.id ?? crypto.randomUUID(),
      projectId: project.id,
      workDate,
      status: input.status,
      content: input.content,
      area: input.area || null,
      notes: input.notes || null,
      isChange: input.isChange,
      isAfterService: input.isAfterService,
      version: existing ? existing.version + 1 : 1,
      savedAt: existing?.savedAt ?? (input.status === 'SAVED' ? nowIso : null),
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
      entries,
    };

    // 저장된 일지를 고치면 고치기 전 값을 이력에 남김
    if (existing?.status === 'SAVED') {
      addWorkLogRevision(account, existing.id, {
        id: crypto.randomUUID(),
        version: existing.version,
        snapshot: {
          status: existing.status,
          content: existing.content,
          area: existing.area,
          notes: existing.notes,
          isChange: existing.isChange,
          isAfterService: existing.isAfterService,
          entries: existing.entries,
        },
        changedAt: nowIso,
      });
    }

    saveWorkLogs(
      account,
      existing ? logs.map((item) => (item.id === existing.id ? next : item)) : [...logs, next],
    );

    return HttpResponse.json(toMockWorkLog(account, next, autoAssigned));
  }),

  http.get('/api/v1/projects/:id/work-logs/:workDate/revisions', async ({ params }) => {
    await simulateLatency();

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = workLogParamsSchema.safeParse({ id: params.id, workDate: params.workDate });

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params', message: 'Invalid' }]);
    }

    const log = getWorkLogs(account).find(
      (item) => item.projectId === parsed.data.id && item.workDate === parsed.data.workDate,
    );

    if (!log) return apiError('NOT_FOUND');

    return HttpResponse.json({
      items: [...getWorkLogRevisions(account, log.id)].sort((a, b) => b.version - a.version),
    });
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
