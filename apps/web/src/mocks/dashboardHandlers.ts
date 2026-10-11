import {
  ALERT_KINDS,
  INBOX_STALE_DAYS,
  alertSettingsUpdateSchema,
  assembleDashboard,
  todayInSeoul,
  weekRange,
  type AlertKind,
  type AlertSettings,
  type ErrorCode,
  type StaffingCalendar,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import { listMockChangeWorks } from './changeWorkHandlers';
import type { MockAccount } from './data';
import { listMockMemos } from './memoHandlers';
import {
  getAssignments,
  getCurrentAccount,
  getEmployees,
  getProgressRecords,
  getProjects,
  getWorkLogs,
  saveAlertSettings,
} from './state';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

const DAY_MS = 86_400_000;

// 설정하지 않은 종류는 켜짐 (서버와 같은 기본값)
const settingsOf = (account: MockAccount): AlertSettings => ({
  items: ALERT_KINDS.map((kind) => ({ kind, enabled: account.alertSettings?.[kind] ?? true })),
});

// 이번 주 인력 배치 (인력 배치 캘린더 목업과 같은 규칙: 취소한 투입·취소된 프로젝트 제외, 퇴사 직원은 투입이 있을 때만)
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
  const assigned = new Set(assignments.map((item) => item.employeeId));

  return {
    from,
    to,
    assignments,
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
  const week = weekRange(today);
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
  const staleBefore = now.getTime() - INBOX_STALE_DAYS * DAY_MS;
  const staleInbox = listMockMemos(account).filter(
    (memo) => memo.projectId === null && Date.parse(memo.createdAt) <= staleBefore,
  );
  const oldest = staleInbox.map((memo) => memo.createdAt).sort()[0];

  return {
    dashboard: assembleDashboard({
      today,
      projects: projects.map((project) => {
        const plans = assignments
          .filter((item) => item.projectId === project.id && item.plannedMinutes !== null)
          .map((item) => item.plannedMinutes!);
        const progress = latestProgress(project.id);

        return {
          id: project.id,
          code: project.code,
          name: project.name,
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
      todayAssignments: assignments
        .filter(
          (item) =>
            item.startDate <= today &&
            item.endDate >= today &&
            projects.find((project) => project.id === item.projectId)?.status === 'IN_PROGRESS' &&
            employees.find((employee) => employee.id === item.employeeId)?.status === 'ACTIVE',
        )
        .map((item) => ({ projectId: item.projectId, employeeId: item.employeeId })),
      todayLogProjectIds: logs
        .filter((log) => log.workDate === today && log.status === 'SAVED')
        .map((log) => log.projectId),
      staleInbox: {
        count: staleInbox.length,
        oldestDays: oldest
          ? Math.max(
              0,
              Math.round(
                (Date.parse(`${today}T00:00:00Z`) -
                  Date.parse(`${todayInSeoul(new Date(oldest))}T00:00:00Z`)) /
                  DAY_MS,
              ),
            )
          : 0,
      },
      draftLogCount: logs.filter((log) => log.status === 'DRAFT').length,
      calendar: calendarOf(account, week.from, week.to),
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
      enabled: new Set<AlertKind>(
        settings.items.filter((item) => item.enabled).map((item) => item.kind),
      ),
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
    await delay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    return HttpResponse.json(buildDashboard(account));
  }),

  http.get('/api/v1/company/alert-settings', async () => {
    await delay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    return HttpResponse.json(settingsOf(account));
  }),

  http.put('/api/v1/company/alert-settings', async ({ request }) => {
    await delay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const body = await parseBody(request, alertSettingsUpdateSchema);

    if ('response' in body) return body.response;

    saveAlertSettings(account, body.data.items);

    return HttpResponse.json(settingsOf(account));
  }),
];
