import {
  ALERT_KINDS,
  CERTIFICATE_EXPIRING_DAYS,
  assembleDashboard,
  monthRange,
  previousMonth,
  shiftDate,
  todayInSeoul,
  dashboardCalendarRange,
  type AlertDismiss,
  type AlertSettings,
  type AlertSettingsUpdate,
  type DashboardResponse,
} from '@field-note/shared';

import type { AssignmentService } from '../assignment/assignmentService';
import type { PrismaClient } from '../db/client';
import { loadRules } from '../company/companyRules';
import { withCompany } from '../db/withCompany';

export type DashboardService = {
  // 홈 대시보드: 위젯과 켜 둔 알림 (알림은 저장하지 않고 열 때마다 기록을 보고 계산)
  get: (companyId: string) => Promise<DashboardResponse>;
  getSettings: (companyId: string) => Promise<AlertSettings>;
  // 보낸 종류만 켜고 끔 (행이 없는 종류는 켜짐이 기본값)
  saveSettings: (companyId: string, update: AlertSettingsUpdate) => Promise<AlertSettings>;
  // 알림 숨기기: 키를 남기면 조건이 바뀌기 전까지 홈·알림에 나오지 않음 (같은 키를 다시 숨겨도 무시)
  dismiss: (companyId: string, userId: string, input: AlertDismiss) => Promise<void>;
};

const fromDate = (value: Date) => value.toISOString().slice(0, 10);

// 예전에 저장된 알림 종류(메모함 알림 등 현재 없는 종류)는 무시
const toSettings = (rows: { kind: string; enabled: boolean }[]): AlertSettings => {
  const saved = new Map(rows.map((row) => [row.kind, row.enabled]));

  return { items: ALERT_KINDS.map((kind) => ({ kind, enabled: saved.get(kind) ?? true })) };
};

/**
 * @description 대시보드·알림 서비스 (앱 계정으로 자기 회사 범위에서만 조회, 알림 설정만 저장)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param assignments 투입 서비스 (이번 달 인력 배치 조회용)
 * @param now 현재 시각 (시험에서 고정)
 * @returns 대시보드·알림 서비스
 */
export const createDashboardService = (
  app: PrismaClient,
  assignments: AssignmentService,
  now: () => Date = () => new Date(),
): DashboardService => {
  const loadSettings = (companyId: string) =>
    withCompany(app, companyId, async (tx) => toSettings(await tx.alertPreference.findMany()));

  return {
    get: async (companyId) => {
      const today = todayInSeoul(now());
      const calendar = await assignments.calendar(companyId, dashboardCalendarRange(today));
      const settings = await loadSettings(companyId);
      const data = await withCompany(app, companyId, async (tx) => {
        const projects = await tx.project.findMany({
          where: { status: { in: ['PLANNED', 'IN_PROGRESS', 'SUSPENDED'] } },
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            siteName: true,
            plannedStart: true,
            plannedEnd: true,
          },
        });
        const ids = projects.map((project) => project.id);
        const prevMonth = previousMonth(today);
        const prevRange = monthRange(prevMonth);
        const [
          plans,
          logs,
          records,
          todayRows,
          todayLogs,
          dismissals,
          draftLogCount,
          changes,
          warranties,
          openRepairs,
          certificates,
          credentials,
          prevClose,
          prevLogCount,
        ] = await Promise.all([
          tx.projectAssignment.findMany({
            where: { projectId: { in: ids }, cancelledAt: null, plannedMinutes: { not: null } },
            select: { projectId: true, plannedMinutes: true },
          }),
          tx.workLog.findMany({
            where: { projectId: { in: ids }, status: 'SAVED' },
            select: { projectId: true, entries: { select: { minutes: true } } },
          }),
          tx.projectProgressRecord.findMany({
            where: { projectId: { in: ids } },
            orderBy: [{ recordedOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            select: { projectId: true, percent: true, recordedOn: true },
          }),
          tx.projectAssignment.findMany({
            where: {
              cancelledAt: null,
              startDate: { lte: new Date(`${today}T00:00:00.000Z`) },
              endDate: { gte: new Date(`${today}T00:00:00.000Z`) },
              project: { status: 'IN_PROGRESS' },
              employee: { status: 'ACTIVE' },
            },
            select: { projectId: true, employeeId: true },
          }),
          tx.workLog.findMany({
            where: { workDate: new Date(`${today}T00:00:00.000Z`), status: 'SAVED' },
            select: { projectId: true, entries: { select: { employeeId: true } } },
          }),
          tx.alertDismissal.findMany({ select: { alertKey: true } }),
          tx.workLog.count({ where: { status: 'DRAFT' } }),
          tx.changeWork.findMany({
            where: { status: 'NEGOTIATING' },
            select: { id: true, projectId: true, seq: true, statusChangedOn: true },
          }),
          // 보증 중 프로젝트의 종료 예정일, 접수·처리 중 보수 요청
          tx.projectWarranty.findMany({
            where: { project: { status: 'WARRANTY' } },
            select: {
              endOn: true,
              project: { select: { id: true, code: true, name: true } },
            },
          }),
          tx.repairRequest.findMany({
            where: { status: { in: ['RECEIVED', 'IN_PROGRESS'] } },
            select: {
              id: true,
              projectId: true,
              seq: true,
              receivedOn: true,
              status: true,
              project: { select: { name: true } },
            },
          }),
          // 보증서: 완료·보증 중 프로젝트의 지우지 않은 보증서 중 만료가 가까운 것
          tx.warrantyCertificate.findMany({
            where: {
              removedAt: null,
              expiresOn: {
                lte: new Date(`${shiftDate(today, CERTIFICATE_EXPIRING_DAYS)}T00:00:00.000Z`),
              },
              project: { status: { in: ['COMPLETED', 'WARRANTY'] } },
              document: { deletedAt: null },
            },
            select: {
              projectId: true,
              expiresOn: true,
              project: { select: { name: true } },
              document: { select: { title: true } },
            },
          }),
          // 직원 서류: 퇴사하지 않은 직원의 지우지 않은 서류 (갱신본이 있는지 보려고 만료일이 없는 것까지 모두)
          tx.employeeCredential.findMany({
            where: { removedAt: null, employee: { status: { not: 'LEFT' } } },
            select: {
              employeeId: true,
              typeId: true,
              expiresOn: true,
              employee: { select: { name: true } },
              type: { select: { name: true } },
            },
          }),
          tx.monthlyClose.findFirst({
            where: { month: new Date(`${prevRange.from}T00:00:00.000Z`) },
          }),
          tx.workLog.count({
            where: {
              status: 'SAVED',
              workDate: {
                gte: new Date(`${prevRange.from}T00:00:00.000Z`),
                lte: new Date(`${prevRange.to}T00:00:00.000Z`),
              },
            },
          }),
        ]);

        return {
          rules: await loadRules(tx),
          projects,
          plans,
          logs,
          records,
          todayRows,
          todayLogs,
          dismissals,
          draftLogCount,
          changes,
          warranties,
          openRepairs,
          certificates,
          credentials,
          unclosedMonth: !prevClose?.isClosed && prevLogCount > 0 ? prevMonth : null,
        };
      });
      // 같은 직원·종류의 서류는 만료 없는 서류 또는 더 늦게 만료되는 갱신본이 있으면 가장 늦은 것만 집계
      const latestCredentials = new Map<
        string,
        { employeeId: string; employeeName: string; typeName: string; expiresOn: string | null }
      >();

      for (const row of data.credentials) {
        const key = `${row.employeeId}:${row.typeId}`;
        const expiresOn = row.expiresOn ? fromDate(row.expiresOn) : null;
        const current = latestCredentials.get(key);

        if (
          !current ||
          expiresOn === null ||
          (current.expiresOn !== null && expiresOn > current.expiresOn)
        ) {
          latestCredentials.set(key, {
            employeeId: row.employeeId,
            employeeName: row.employee.name,
            typeName: row.type.name,
            expiresOn,
          });
        }
      }
      const planned = new Map<string, number>();
      const used = new Map<string, number>();
      const latest = new Map<string, { percent: number; recordedOn: string }>();

      for (const plan of data.plans) {
        planned.set(plan.projectId, (planned.get(plan.projectId) ?? 0) + plan.plannedMinutes!);
      }

      for (const log of data.logs) {
        used.set(
          log.projectId,
          (used.get(log.projectId) ?? 0) +
            log.entries.reduce((sum, entry) => sum + entry.minutes, 0),
        );
      }

      // 기록은 기준일 최근순이므로 프로젝트마다 처음 나온 것이 현재 진행률
      for (const record of data.records) {
        if (!latest.has(record.projectId)) {
          latest.set(record.projectId, {
            percent: record.percent,
            recordedOn: fromDate(record.recordedOn),
          });
        }
      }

      return {
        dashboard: assembleDashboard({
          today,
          rules: data.rules,
          projects: data.projects.map((project) => ({
            id: project.id,
            code: project.code,
            name: project.name,
            siteName: project.siteName,
            status: project.status,
            plannedStart: fromDate(project.plannedStart),
            plannedEnd: fromDate(project.plannedEnd),
            plannedMinutes: planned.get(project.id) ?? null,
            usedMinutes: used.get(project.id) ?? 0,
            progressPercent: latest.get(project.id)?.percent ?? null,
            progressRecordedOn: latest.get(project.id)?.recordedOn ?? null,
          })),
          todayAssignments: data.todayRows,
          todayLogProjectIds: data.todayLogs.map((log) => log.projectId),
          todayLoggedEmployeeIds: data.todayLogs.flatMap((log) =>
            log.entries.map((entry) => entry.employeeId),
          ),
          draftLogCount: data.draftLogCount,
          calendar,
          negotiatingChanges: data.changes.map((change) => ({
            id: change.id,
            projectId: change.projectId,
            seq: change.seq,
            statusChangedOn: fromDate(change.statusChangedOn),
          })),
          warrantyProjects: data.warranties.map((row) => ({
            id: row.project.id,
            code: row.project.code,
            name: row.project.name,
            endOn: fromDate(row.endOn),
          })),
          openRepairs: data.openRepairs.map((row) => ({
            id: row.id,
            projectId: row.projectId,
            projectName: row.project.name,
            seq: row.seq,
            receivedOn: fromDate(row.receivedOn),
            status: row.status as 'RECEIVED' | 'IN_PROGRESS',
          })),
          certificates: data.certificates.map((row) => ({
            projectId: row.projectId,
            projectName: row.project.name,
            title: row.document.title,
            expiresOn: fromDate(row.expiresOn),
          })),
          credentials: [...latestCredentials.values()].flatMap((item) =>
            item.expiresOn ? [{ ...item, expiresOn: item.expiresOn }] : [],
          ),
          unclosedMonth: data.unclosedMonth,
          enabled: new Set(settings.items.filter((item) => item.enabled).map((item) => item.kind)),
          dismissedKeys: new Set(data.dismissals.map((item) => item.alertKey)),
        }),
        settings,
      };
    },

    getSettings: loadSettings,

    dismiss: (companyId, userId, input) =>
      withCompany(app, companyId, async (tx) => {
        await tx.alertDismissal.createMany({
          data: [...new Set(input.keys)].map((alertKey) => ({
            companyId,
            alertKey,
            dismissedBy: userId,
            dismissedAt: now(),
          })),
          skipDuplicates: true,
        });
      }),

    saveSettings: (companyId, update) =>
      withCompany(app, companyId, async (tx) => {
        for (const item of update.items) {
          await tx.alertPreference.upsert({
            where: { companyId_kind: { companyId, kind: item.kind } },
            update: { enabled: item.enabled },
            create: { companyId, kind: item.kind, enabled: item.enabled },
          });
        }

        return toSettings(await tx.alertPreference.findMany());
      }),
  };
};
