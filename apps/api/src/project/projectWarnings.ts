import { evaluateProjectHealth, todayInSeoul, type ProjectWarningType } from '@field-note/shared';

import { loadRules } from '../company/companyRules';
import type { Prisma } from '../db/client';

const fromDate = (value: Date) => value.toISOString().slice(0, 10);

// 경고 대상 상태 (진행·중단), 그 밖의 상태는 경고 없음
const ACTIVE = ['IN_PROGRESS', 'SUSPENDED'] as const;

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
