import {
  ALERT_KINDS,
  INBOX_STALE_DAYS,
  assembleDashboard,
  todayInSeoul,
  weekRange,
  type AlertKind,
  type AlertSettings,
  type AlertSettingsUpdate,
  type DashboardResponse,
} from '@field-note/shared';

import type { AssignmentService } from '../assignment/assignmentService';
import type { PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export type DashboardService = {
  // 홈 대시보드: 위젯과 켜 둔 알림 (알림은 저장하지 않고 열 때마다 기록을 보고 계산)
  get: (companyId: string) => Promise<DashboardResponse>;
  getSettings: (companyId: string) => Promise<AlertSettings>;
  // 보낸 종류만 켜고 끈다 (행이 없는 종류는 켜짐이 기본값)
  saveSettings: (companyId: string, update: AlertSettingsUpdate) => Promise<AlertSettings>;
};

const fromDate = (value: Date) => value.toISOString().slice(0, 10);

const DAY_MS = 86_400_000;

const toSettings = (rows: { kind: AlertKind; enabled: boolean }[]): AlertSettings => {
  const saved = new Map(rows.map((row) => [row.kind, row.enabled]));

  return { items: ALERT_KINDS.map((kind) => ({ kind, enabled: saved.get(kind) ?? true })) };
};

/**
 * @description 대시보드·알림 서비스 (앱 계정으로 자기 회사 범위에서만 조회, 알림 설정만 저장)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param assignments 투입 서비스 (이번 주 인력 배치 조회용)
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
      const week = weekRange(today);
      const calendar = await assignments.calendar(companyId, week);
      const settings = await loadSettings(companyId);
      const staleBefore = new Date(now().getTime() - INBOX_STALE_DAYS * DAY_MS);
      const data = await withCompany(app, companyId, async (tx) => {
        const projects = await tx.project.findMany({
          where: { status: { in: ['PLANNED', 'IN_PROGRESS', 'SUSPENDED'] } },
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            plannedStart: true,
            plannedEnd: true,
          },
        });
        const ids = projects.map((project) => project.id);
        const [plans, logs, records, todayRows, todayLogs, staleInbox, draftLogCount, changes] =
          await Promise.all([
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
              select: { projectId: true },
            }),
            tx.memo.aggregate({
              where: { deletedAt: null, projectId: null, createdAt: { lte: staleBefore } },
              _count: true,
              _min: { createdAt: true },
            }),
            tx.workLog.count({ where: { status: 'DRAFT' } }),
            tx.changeWork.findMany({
              where: { status: 'NEGOTIATING' },
              select: { id: true, projectId: true, seq: true, statusChangedOn: true },
            }),
          ]);

        return {
          projects,
          plans,
          logs,
          records,
          todayRows,
          todayLogs,
          staleInbox,
          draftLogCount,
          changes,
        };
      });
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

      const oldest = data.staleInbox._min.createdAt;

      return {
        dashboard: assembleDashboard({
          today,
          projects: data.projects.map((project) => ({
            id: project.id,
            code: project.code,
            name: project.name,
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
          staleInbox: {
            count: data.staleInbox._count,
            oldestDays: oldest
              ? Math.max(
                  0,
                  Math.round(
                    (Date.parse(`${today}T00:00:00Z`) -
                      Date.parse(`${todayInSeoul(oldest)}T00:00:00Z`)) /
                      DAY_MS,
                  ),
                )
              : 0,
          },
          draftLogCount: data.draftLogCount,
          calendar,
          negotiatingChanges: data.changes.map((change) => ({
            id: change.id,
            projectId: change.projectId,
            seq: change.seq,
            statusChangedOn: fromDate(change.statusChangedOn),
          })),
          enabled: new Set(settings.items.filter((item) => item.enabled).map((item) => item.kind)),
        }),
        settings,
      };
    },

    getSettings: loadSettings,

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
