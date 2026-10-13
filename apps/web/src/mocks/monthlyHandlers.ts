import {
  MONTHLY_DRAFT_LIMIT,
  REPORT_XLSX_CONTENT_TYPE,
  monthLockCheck,
  monthRange,
  monthlyCloseSchema,
  monthlyHoursQuerySchema,
  monthlyReopenSchema,
  todayInSeoul,
  validateMonthClose,
  type ErrorCode,
  type MonthlyCloseEvent,
  type MonthlyHours,
  type MonthlyHoursRow,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import { addMockAudit } from './auditHandlers';
import type { MockAccount } from './data';
import { getCurrentAccount, getEmployees, getProjects, getWorkLogs } from './state';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

type MockClose = {
  isClosed: boolean;
  standardWorkMinutes: number;
  monthlyWorkDays: number;
  closedAt: string | null;
};

type Store = { closes: Map<string, MockClose>; events: Map<string, MonthlyCloseEvent[]> };

// 목업 저장소: 회사별 월 공수 확정 상태와 이력 (새로고침하면 초기화). 실제 서버가 하는 일을 흉내 낸다
const stores = new Map<string, Store>();

export const resetMockMonthly = () => stores.clear();

// 회사 구분 값 (회사가 없는 가입 직후 계정은 계정 단위로 나눔)
const scopeOf = (account: MockAccount) => account.companyId ?? account.loginId;

const storeOf = (account: MockAccount): Store => {
  const existing = stores.get(scopeOf(account));

  if (existing) return existing;

  const store: Store = { closes: new Map(), events: new Map() };

  stores.set(scopeOf(account), store);

  return store;
};

/**
 * @description 확정된 달 목록 (작업 내역 저장 목업이 확정된 달을 막는 데 씀)
 * @param account 현재 계정
 * @returns YYYY-MM 목록
 */
export const getMockClosedMonths = (account: MockAccount) =>
  [...storeOf(account).closes.entries()]
    .filter(([, close]) => close.isClosed)
    .map(([month]) => month);

/**
 * @description 이 날짜의 작업 내역를 고칠 수 있는지 (확정된 달은 재오픈해야 함)
 * @param account 현재 계정
 * @param workDate 작업 일자
 * @returns 통과 여부와 거부 사유
 */
export const mockMonthLockCheck = (account: MockAccount, workDate: string) =>
  monthLockCheck(workDate, getMockClosedMonths(account));

const sumsOf = (account: MockAccount, month: string): MonthlyHoursRow[] => {
  const { from, to } = monthRange(month);
  const projects = getProjects(account);
  const employees = getEmployees(account);
  const sums = new Map<string, MonthlyHoursRow>();

  for (const log of getWorkLogs(account)) {
    if (log.status !== 'SAVED' || log.workDate < from || log.workDate > to) continue;

    const project = projects.find((item) => item.id === log.projectId);

    if (!project) continue;

    for (const entry of log.entries) {
      const employee = employees.find((item) => item.id === entry.employeeId);

      if (!employee) continue;

      const key = `${project.id}:${employee.id}`;
      const current = sums.get(key);

      sums.set(key, {
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        employeeId: employee.id,
        employeeName: employee.name,
        minutes: (current?.minutes ?? 0) + entry.minutes,
      });
    }
  }

  return [...sums.values()].sort(
    (a, b) =>
      a.projectCode.localeCompare(b.projectCode) ||
      a.employeeName.localeCompare(b.employeeName, 'ko') ||
      a.employeeId.localeCompare(b.employeeId),
  );
};

const draftsOf = (account: MockAccount, month: string) => {
  const { from, to } = monthRange(month);
  const projects = getProjects(account);
  const drafts = getWorkLogs(account)
    .filter((log) => log.status === 'DRAFT' && log.workDate >= from && log.workDate <= to)
    .sort((a, b) => a.workDate.localeCompare(b.workDate) || a.id.localeCompare(b.id));

  return {
    count: drafts.length,
    list: drafts.slice(0, MONTHLY_DRAFT_LIMIT).map((log) => ({
      projectId: log.projectId,
      projectName: projects.find((item) => item.id === log.projectId)?.name ?? '',
      workDate: log.workDate,
    })),
  };
};

const toHours = (account: MockAccount, month: string): MonthlyHours => {
  const store = storeOf(account);
  const state = store.closes.get(month);
  const drafts = draftsOf(account, month);
  const closed = state?.isClosed === true;

  return {
    month,
    isClosed: closed,
    closedAt: closed ? (state.closedAt ?? null) : null,
    // 확정된 달은 확정 당시 값으로 고정
    standardWorkMinutes: closed ? state.standardWorkMinutes : account.settings.standardWorkMinutes,
    monthlyWorkDays: closed ? state.monthlyWorkDays : account.settings.monthlyWorkDays,
    workUnitMode: account.settings.workUnitMode,
    draftLogCount: drafts.count,
    drafts: drafts.list,
    rows: sumsOf(account, month),
    events: [...(store.events.get(month) ?? [])].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    ),
  };
};

/**
 * @description 월 공수표·확정 목업 핸들러 (실제 서버와 같은 규칙: 이번 달까지만 확정, 임시 저장 확인, 확정 당시 기준값 고정, 재오픈 사유 필수, 이력)
 * @param helpers 목업 공통 응답·본문 검사
 */
export const createMonthlyHandlers = ({ apiError, parseBody }: Helpers) => {
  const latency = () => delay(300);
  const invalid = (path: string, message: string) =>
    apiError('VALIDATION_ERROR', [{ path, message }]);
  const queryOf = (request: Request) => {
    const parsed = monthlyHoursQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    return parsed.success
      ? { month: parsed.data.month }
      : {
          response: apiError(
            'VALIDATION_ERROR',
            parsed.error.issues.map((issue) => ({
              path: ['query', ...issue.path].join('.'),
              message: issue.message,
            })),
          ),
        };
  };

  return [
    http.get('/api/v1/monthly-hours', async ({ request }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const query = queryOf(request);

      if ('response' in query) return query.response;

      return HttpResponse.json(toHours(account, query.month));
    }),

    http.post('/api/v1/monthly-hours/close', async ({ request }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const body = await parseBody(request, monthlyCloseSchema);

      if ('response' in body) return body.response;

      const store = storeOf(account);
      const drafts = draftsOf(account, body.data.month);
      const checked = validateMonthClose({
        month: body.data.month,
        today: todayInSeoul(new Date()),
        isClosed: store.closes.get(body.data.month)?.isClosed === true,
        draftLogCount: drafts.count,
        confirmDrafts: body.data.confirmDrafts === true,
      });

      if (!checked.ok) return invalid(`body.${checked.path}`, checked.message);

      const at = new Date().toISOString();

      store.closes.set(body.data.month, {
        isClosed: true,
        standardWorkMinutes: account.settings.standardWorkMinutes,
        monthlyWorkDays: account.settings.monthlyWorkDays,
        closedAt: at,
      });
      store.events.set(body.data.month, [
        ...(store.events.get(body.data.month) ?? []),
        {
          id: crypto.randomUUID(),
          kind: 'CLOSED',
          reason: null,
          draftLogCount: drafts.count,
          standardWorkMinutes: account.settings.standardWorkMinutes,
          monthlyWorkDays: account.settings.monthlyWorkDays,
          createdAt: at,
        },
      ]);

      addMockAudit(account, {
        action: 'MONTH_CLOSED',
        targetType: 'COMPANY',
        targetId: account.companyId ?? account.loginId,
        targetName: null,
        summary:
          drafts.count > 0
            ? `${body.data.month} · 임시 저장 작업 내역 ${drafts.count}건 확인`
            : body.data.month,
      });

      return HttpResponse.json(toHours(account, body.data.month));
    }),

    http.post('/api/v1/monthly-hours/reopen', async ({ request }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const body = await parseBody(request, monthlyReopenSchema);

      if ('response' in body) return body.response;

      const store = storeOf(account);
      const state = store.closes.get(body.data.month);

      if (!state?.isClosed) return invalid('body.month', '확정하지 않은 달입니다');

      state.isClosed = false;
      state.closedAt = null;
      store.events.set(body.data.month, [
        ...(store.events.get(body.data.month) ?? []),
        {
          id: crypto.randomUUID(),
          kind: 'REOPENED',
          reason: body.data.reason.trim(),
          draftLogCount: draftsOf(account, body.data.month).count,
          standardWorkMinutes: state.standardWorkMinutes,
          monthlyWorkDays: state.monthlyWorkDays,
          createdAt: new Date().toISOString(),
        },
      ]);

      addMockAudit(account, {
        action: 'MONTH_REOPENED',
        targetType: 'COMPANY',
        targetId: account.companyId ?? account.loginId,
        targetName: null,
        summary: `${body.data.month} · ${body.data.reason.trim()}`,
      });

      return HttpResponse.json(toHours(account, body.data.month));
    }),

    http.get('/api/v1/monthly-hours.xlsx', async ({ request }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const query = queryOf(request);

      if ('response' in query) return query.response;

      addMockAudit(account, {
        action: 'REPORT_EXPORTED',
        targetType: 'COMPANY',
        targetId: account.companyId ?? account.loginId,
        targetName: null,
        summary: `월 공수표 엑셀 · ${query.month}`,
      });

      // 서버와 같은 파일 이름 규칙. 내용은 자리 파일 (실제 엑셀 서식은 서버가 만든다)
      return new HttpResponse(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
        headers: {
          'Content-Type': REPORT_XLSX_CONTENT_TYPE,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`월공수표_${query.month}.xlsx`)}`,
        },
      });
    }),
  ];
};
