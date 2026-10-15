import {
  canRecordProgress,
  evaluateProjectHealth,
  todayInSeoul,
  type ProgressRecord,
  type ProgressRecordCreate,
  type ProjectHealth,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { loadRules } from '../company/companyRules';
import { withCompany } from '../db/withCompany';

export class ProgressError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[progress.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type ProgressService = {
  // 진행률 기록 목록 (기준일 최근순)
  list: (companyId: string, projectId: string) => Promise<ProgressRecord[]>;
  // 진행률 기록 추가 (예정·진행·중단에서만)
  create: (
    companyId: string,
    userId: string,
    projectId: string,
    input: ProgressRecordCreate,
  ) => Promise<ProgressRecord>;
  // 공수 소진율·예상 필요 공수·경고
  health: (companyId: string, projectId: string) => Promise<ProjectHealth>;
};

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const fromDate = (value: Date) => value.toISOString().slice(0, 10);

const toRecord = (row: Prisma.ProjectProgressRecordGetPayload<object>): ProgressRecord => ({
  id: row.id,
  percent: row.percent,
  recordedOn: fromDate(row.recordedOn),
  note: row.note,
  createdAt: row.createdAt.toISOString(),
});

const invalid = (path: string, message: string) => new ProgressError('INVALID', { path, message });

// 같은 기준일이면 나중에 입력한 기록이 현재 값
const LATEST_FIRST = [
  { recordedOn: 'desc' as const },
  { createdAt: 'desc' as const },
  { id: 'desc' as const },
];

/**
 * @description 진행률·진행 점검 서비스 (앱 계정으로 자기 회사 범위에서만 조회·추가, 기록은 고치거나 지우지 않음)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param now 현재 시각 (시험에서 고정)
 * @returns 진행률 서비스
 */
export const createProgressService = (
  app: PrismaClient,
  now: () => Date = () => new Date(),
): ProgressService => ({
  list: (companyId, projectId) =>
    withCompany(app, companyId, async (tx) => {
      if (!(await tx.project.findFirst({ where: { id: projectId }, select: { id: true } }))) {
        throw new ProgressError('NOT_FOUND');
      }

      return (
        await tx.projectProgressRecord.findMany({ where: { projectId }, orderBy: LATEST_FIRST })
      ).map(toRecord);
    }),

  create: (companyId, userId, projectId, input) =>
    withCompany(app, companyId, async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId } });

      if (!project) {
        throw new ProgressError('NOT_FOUND');
      }

      if (!canRecordProgress(project.status)) {
        throw invalid('projectId', '이 상태의 프로젝트에는 진행률을 입력할 수 없습니다');
      }

      const recordedOn = input.recordedOn ?? todayInSeoul(now());

      if (recordedOn > todayInSeoul(now())) {
        throw invalid('body.recordedOn', '기준일은 오늘 이후로 정할 수 없습니다');
      }

      return toRecord(
        await tx.projectProgressRecord.create({
          data: {
            companyId,
            projectId,
            percent: input.percent,
            recordedOn: toDate(recordedOn),
            note: input.note ?? null,
            recordedBy: userId,
          },
        }),
      );
    }),

  health: (companyId, projectId) =>
    withCompany(app, companyId, async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId } });

      if (!project) {
        throw new ProgressError('NOT_FOUND');
      }

      const rules = await loadRules(tx);
      const [latest, assignments, used] = await Promise.all([
        tx.projectProgressRecord.findFirst({ where: { projectId }, orderBy: LATEST_FIRST }),
        tx.projectAssignment.findMany({
          where: { projectId, cancelledAt: null },
          select: { plannedMinutes: true },
        }),
        tx.workLogEntry.aggregate({
          where: { workLog: { projectId, status: 'SAVED' } },
          _sum: { minutes: true },
        }),
      ]);
      const planned = assignments.flatMap((item) =>
        item.plannedMinutes === null ? [] : [item.plannedMinutes],
      );

      return evaluateProjectHealth({
        status: project.status,
        plannedMinutes: planned.length > 0 ? planned.reduce((sum, value) => sum + value, 0) : null,
        usedMinutes: used._sum.minutes ?? 0,
        progressPercent: latest?.percent ?? null,
        progressRecordedOn: latest ? fromDate(latest.recordedOn) : null,
        plannedStart: fromDate(project.plannedStart),
        plannedEnd: fromDate(project.plannedEnd),
        today: todayInSeoul(now()),
        rules,
      });
    }),
});
