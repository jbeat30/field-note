import { evaluateProjectHealth, todayInSeoul, type ProjectWarningType } from '@field-note/shared';

import { loadRules } from '../company/companyRules';
import type { Prisma } from '../db/client';

const fromDate = (value: Date) => value.toISOString().slice(0, 10);

// 경고 대상 상태 (진행·중단), 그 밖의 상태는 경고 없음
const ACTIVE = ['IN_PROGRESS', 'SUSPENDED'] as const;

/**
 * @description 목록에 보여 줄 프로젝트별 공수 소진율과 오늘 투입 인원 일괄 조회
 * @param tx 회사 범위 트랜잭션
 * @param ids 대상 프로젝트 ID
 * @param today 오늘(서울 기준)
 * @returns 프로젝트 ID별 소진율(계획 공수가 없으면 null)과 오늘 투입 인원
 */
export const loadProjectUsage = async (
  tx: Prisma.TransactionClient,
  ids: readonly string[],
  today: string,
): Promise<Map<string, { burnPercent: number | null; todayHeadcount: number }>> => {
  const result = new Map(
    ids.map((id) => [id, { burnPercent: null as number | null, todayHeadcount: 0 }]),
  );

  if (ids.length === 0) {
    return result;
  }

  const day = new Date(`${today}T00:00:00.000Z`);
  const [planned, used, assigned] = await Promise.all([
    tx.projectAssignment.groupBy({
      by: ['projectId'],
      where: { projectId: { in: [...ids] }, cancelledAt: null, plannedMinutes: { not: null } },
      _sum: { plannedMinutes: true },
    }),
    tx.$queryRaw<{ projectId: string; minutes: bigint }[]>`
      SELECT wl.project_id AS "projectId", COALESCE(SUM(e.minutes), 0)::bigint AS minutes
        FROM work_log_entries e
        JOIN work_logs wl ON wl.company_id = e.company_id AND wl.id = e.work_log_id
       WHERE wl.status = 'SAVED' AND wl.project_id = ANY(${[...ids]}::uuid[])
       GROUP BY wl.project_id`,
    tx.projectAssignment.findMany({
      where: {
        projectId: { in: [...ids] },
        cancelledAt: null,
        startDate: { lte: day },
        endDate: { gte: day },
        employee: { status: 'ACTIVE' },
      },
      select: { projectId: true, employeeId: true },
      distinct: ['projectId', 'employeeId'],
    }),
  ]);
  const usedBy = new Map(used.map((row) => [row.projectId, Number(row.minutes)]));

  for (const row of planned) {
    const minutes = row._sum.plannedMinutes;

    if (minutes && minutes > 0) {
      result.get(row.projectId)!.burnPercent =
        Math.round(((usedBy.get(row.projectId) ?? 0) / minutes) * 1000) / 10;
    }
  }

  for (const row of assigned) {
    result.get(row.projectId)!.todayHeadcount += 1;
  }

  return result;
};

/**
 * @description 프로젝트들의 경고 일괄 계산 (회사별 경고 기준 적용), 진행·중단 프로젝트만 경고 대상
 * 프로젝트별 개별 조회 대신 투입 계획 합계·저장된 작업 내역 합계·최근 진행률을 묶어서 조회
 * @param tx 회사 범위 트랜잭션
 * @param projects 대상 프로젝트
 * @param now 현재 시각
 * @returns 프로젝트 ID별 경고 (없으면 빈 배열)
 */
export const loadProjectWarnings = async (
  tx: Prisma.TransactionClient,
  projects: readonly {
    id: string;
    status: string;
    plannedStart: Date;
    plannedEnd: Date;
  }[],
  now: Date,
): Promise<Map<string, ProjectWarningType[]>> => {
  const result = new Map<string, ProjectWarningType[]>(projects.map((item) => [item.id, []]));
  const targets = projects.filter((item) => (ACTIVE as readonly string[]).includes(item.status));

  if (targets.length === 0) {
    return result;
  }

  const ids = targets.map((item) => item.id);
  const rules = await loadRules(tx);
  const [planned, used, progress] = await Promise.all([
    tx.projectAssignment.groupBy({
      by: ['projectId'],
      where: { projectId: { in: ids }, cancelledAt: null, plannedMinutes: { not: null } },
      _sum: { plannedMinutes: true },
    }),
    tx.$queryRaw<{ projectId: string; minutes: bigint }[]>`
      SELECT wl.project_id AS "projectId", COALESCE(SUM(e.minutes), 0)::bigint AS minutes
        FROM work_log_entries e
        JOIN work_logs wl ON wl.company_id = e.company_id AND wl.id = e.work_log_id
       WHERE wl.status = 'SAVED' AND wl.project_id = ANY(${ids}::uuid[])
       GROUP BY wl.project_id`,
    tx.projectProgressRecord.findMany({
      where: { projectId: { in: ids } },
      orderBy: [{ recordedOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      select: { projectId: true, percent: true, recordedOn: true },
    }),
  ]);
  const plannedBy = new Map(planned.map((row) => [row.projectId, row._sum.plannedMinutes]));
  const usedBy = new Map(used.map((row) => [row.projectId, Number(row.minutes)]));
  // 기록은 최근 것이 앞이므로 프로젝트마다 처음 나온 것이 최신
  const latest = new Map<string, { percent: number; recordedOn: Date }>();

  for (const record of progress) {
    if (!latest.has(record.projectId)) latest.set(record.projectId, record);
  }

  for (const project of targets) {
    const record = latest.get(project.id);

    result.set(
      project.id,
      evaluateProjectHealth({
        status: project.status as 'IN_PROGRESS' | 'SUSPENDED',
        plannedMinutes: plannedBy.get(project.id) ?? null,
        usedMinutes: usedBy.get(project.id) ?? 0,
        progressPercent: record?.percent ?? null,
        progressRecordedOn: record ? fromDate(record.recordedOn) : null,
        plannedStart: fromDate(project.plannedStart),
        plannedEnd: fromDate(project.plannedEnd),
        today: todayInSeoul(now),
        rules,
      }).warnings,
    );
  }

  return result;
};
