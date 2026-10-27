import {
  ALERT_KINDS,
  alertDismissSchema,
  alertSettingsUpdateSchema,
  assembleDashboard,
  monthOf,
  monthRange,
  previousMonth,
  shiftDate,
  todayInSeoul,
  dashboardCalendarRange,
  type AlertKind,
  type AlertSettings,
  type ErrorCode,
  type StaffingCalendar,
} from '@field-note/shared';
import { http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import { listMockChangeWorks } from './changeWorkHandlers';
import { listMockCredentialExpiries } from './credentialHandlers';
import type { MockAccount } from './data';
import { getMockClosedMonths } from './monthlyHandlers';
import { listMockOpenRepairs } from './repairHandlers';
import { listMockWarrantyDashboard } from './warrantyHandlers';
import {
  getAssignments,
  getCurrentAccount,
  getEmployees,
  getProgressRecords,
  getProjects,
  getRules,
  getWorkLogs,
  dismissAlerts,
  saveAlertSettings,
} from './state';
import { mockDelay } from './latency';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

// 설정하지 않은 종류는 켜짐 (서버와 같은 기본값)
const settingsOf = (account: MockAccount): AlertSettings => ({
  items: ALERT_KINDS.map((kind) => ({ kind, enabled: account.alertSettings?.[kind] ?? true })),
});

// 이번 달 인력 배치 (인력 배치 캘린더 목업과 같은 규칙: 취소한 투입·취소된 프로젝트 제외, 퇴사 직원은 투입이 있을 때만)
const calendarOf = (account: MockAccount, from: string, to: string): StaffingCalendar => {
  const projects = getProjects(account);
  const assignments = getAssignments(account).flatMap((row) => {
    const project = projects.find((item) => item.id === row.projectId);

    return !row.cancelledAt &&
      project &&
      project.status !== 'CANCELLED' &&
      row.startDate <= to &&
      row.endDate >= from
      ? [
          {
            id: row.id,
            employeeId: row.employeeId,
            projectId: row.projectId,
            projectCode: project.code,
            projectName: project.name,
            projectStatus: project.status,
            startDate: row.startDate,
            endDate: row.endDate,
          },
        ]
      : [];
  });
  // 저장된 작업 내역에 그 사람이 들어간 날만 (임시 저장·취소된 프로젝트 제외, 서버와 같은 규칙)
  const workDays = new Map<string, StaffingCalendar['workDays'][number]>();

  for (const log of getWorkLogs(account)) {
    const project = projects.find((item) => item.id === log.projectId);

    if (log.status !== 'SAVED' || !project || project.status === 'CANCELLED') continue;

    if (log.workDate < from || log.workDate > to) continue;

    for (const entry of log.entries) {
      const key = `${entry.employeeId}|${log.workDate}|${project.id}`;
      const current = workDays.get(key);

      if (current) {
        current.minutes += entry.minutes;
      } else if (entry.minutes > 0) {
        workDays.set(key, {
          employeeId: entry.employeeId,
          workDate: log.workDate,
          projectId: project.id,
          projectCode: project.code,
          projectName: project.name,
          projectStatus: project.status,
          minutes: entry.minutes,
        });
      }
    }
  }

  const assigned = new Set([
    ...assignments.map((item) => item.employeeId),
    ...[...workDays.values()].map((item) => item.employeeId),
  ]);

  return {
    from,
    to,
    assignments,
    workDays: [...workDays.values()],
    employees: getEmployees(account)
      .filter((item) => item.status !== 'LEFT' || assigned.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        title: item.title ?? null,
        status: item.status,
        leftOn: item.leftOn ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id)),
  };
};

const buildDashboard = (account: MockAccount) => {
  const now = new Date();
  const today = todayInSeoul(now);
  const range = dashboardCalendarRange(today);
  const settings = settingsOf(account);
  const projects = getProjects(account).filter((project) =>
    ['PLANNED', 'IN_PROGRESS', 'SUSPENDED'].includes(project.status),
  );
  const ids = new Set(projects.map((project) => project.id));
  const logs = getWorkLogs(account);
  const assignments = getAssignments(account).filter((item) => !item.cancelledAt);
  const employees = getEmployees(account);
  // 같은 기준일이면 나중에 입력한 기록이 현재 값 (서버와 같은 순서)
  const latestProgress = (projectId: string) =>
    [...getProgressRecords(account, projectId)].sort(
      (a, b) => b.recordedOn.localeCompare(a.recordedOn) || b.createdAt.localeCompare(a.createdAt),
    )[0];
  const warranty = listMockWarrantyDashboard(account);
  // 그날 진행 중 프로젝트에 투입되는 재직 직원 (서버와 같은 조건)
  const assignmentsOn = (date: string) =>
    assignments
      .filter(
        (item) =>
          item.startDate <= date &&
          item.endDate >= date &&
          projects.find((project) => project.id === item.projectId)?.status === 'IN_PROGRESS' &&
          employees.find((employee) => employee.id === item.employeeId)?.status === 'ACTIVE',
      )
      .map((item) => ({ projectId: item.projectId, employeeId: item.employeeId }));
  // 지난달에 저장한 작업 내역이 있는데 확정하지 않았으면 알림 (서버와 같은 규칙)
  const prevMonth = previousMonth(today);
  const prevRange = monthRange(prevMonth);
  const hasPrevLogs = logs.some(
    (log) =>
      log.status === 'SAVED' && log.workDate >= prevRange.from && log.workDate <= prevRange.to,
  );

  return {
    dashboard: assembleDashboard({
      today,
      rules: getRules(account),
      projects: projects.map((project) => {
        const plans = assignments
          .filter((item) => item.projectId === project.id && item.plannedMinutes !== null)
          .map((item) => item.plannedMinutes!);
        const progress = latestProgress(project.id);

        return {
          id: project.id,
          code: project.code,
          name: project.name,
          siteName: project.siteName,
          status: project.status,
          plannedStart: project.plannedStart,
          plannedEnd: project.plannedEnd,
          plannedMinutes: plans.length > 0 ? plans.reduce((sum, value) => sum + value, 0) : null,
          usedMinutes: logs
            .filter((log) => log.projectId === project.id && log.status === 'SAVED')
            .flatMap((log) => log.entries)
            .reduce((sum, entry) => sum + entry.minutes, 0),
          progressPercent: progress?.percent ?? null,
          progressRecordedOn: progress?.recordedOn ?? null,
        };
      }),
      todayAssignments: assignmentsOn(today),
      yesterdayAssignments: assignmentsOn(shiftDate(today, -1)),
      monthClosed: false,
      todayLogProjectIds: logs
        .filter((log) => log.workDate === today && log.status === 'SAVED')
        .map((log) => log.projectId),
      todayLoggedEmployeeIds: logs
        .filter((log) => log.workDate === today && log.status === 'SAVED')
        .flatMap((log) => log.entries.map((entry) => entry.employeeId)),
      draftLogCount: logs.filter((log) => log.status === 'DRAFT').length,
      calendar: calendarOf(account, range.from, range.to),
      negotiatingChanges: [...ids].flatMap((projectId) =>
        listMockChangeWorks(account, projectId)
          .filter((work) => work.status === 'NEGOTIATING')
          .map((work) => ({
            id: work.id,
            projectId,
            seq: work.seq,
            statusChangedOn: work.statusChangedOn,
          })),
      ),
      warrantyProjects: warranty.projects,
      openRepairs: listMockOpenRepairs(account),
      certificates: warranty.certificates,
      credentials: listMockCredentialExpiries(account),
      unclosedMonth:
        hasPrevLogs && !getMockClosedMonths(account).includes(monthOf(prevRange.from))
          ? prevMonth
          : null,
      enabled: new Set<AlertKind>(
        settings.items.filter((item) => item.enabled).map((item) => item.kind),
      ),
      dismissedKeys: new Set(account.dismissedAlerts ?? []),
    }),
    settings,
  };
};

/**
 * @description 홈 대시보드·알림 설정 목업 핸들러 (서버와 같은 공유 규칙으로 기록을 보고 계산, 알림은 저장하지 않음)
 * @param helpers 목업 공통 응답·본문 검사
 */
export const createDashboardHandlers = ({ apiError, parseBody }: Helpers) => [
  http.get('/api/v1/dashboard', async () => {
    await mockDelay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    return HttpResponse.json(buildDashboard(account));
  }),

  http.post('/api/v1/alerts/dismiss', async ({ request }) => {
    await mockDelay(200);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, alertDismissSchema);

    if ('response' in body) return body.response;

    dismissAlerts(account, body.data.keys);

    return HttpResponse.json({ success: true });
  }),

  http.get('/api/v1/company/alert-settings', async () => {
    await mockDelay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    return HttpResponse.json(settingsOf(account));
  }),

  http.put('/api/v1/company/alert-settings', async ({ request }) => {
    await mockDelay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, alertSettingsUpdateSchema);

    if ('response' in body) return body.response;

    saveAlertSettings(account, body.data.items);

    return HttpResponse.json(settingsOf(account));
  }),
];
