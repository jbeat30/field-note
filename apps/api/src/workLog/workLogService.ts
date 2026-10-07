import {
  assignmentStatusCheck,
  checkWorkDate,
  dailyOverMinutes,
  isLateInput,
  todayInSeoul,
  validateWorkLogForSave,
  workLogSnapshotSchema,
  workLogStatusCheck,
  type WorkLog,
  type WorkLogListQuery,
  type WorkLogRevision,
  type WorkLogSave,
  type WorkLogSummary,
  type WorkLogWarning,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

type Clock = () => Date;

export class WorkLogError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID' | 'CONFLICT',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[workLog.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type WorkLogService = {
  // 프로젝트의 일지 목록 (요약, 최근 날짜가 맨 앞)
  list: (
    companyId: string,
    projectId: string,
    query: WorkLogListQuery,
  ) => Promise<WorkLogSummary[]>;
  get: (companyId: string, projectId: string, workDate: string) => Promise<WorkLog>;
  // 그날 일지를 만들거나 고침. 이미 있으면 expectedVersion이 현재 버전과 같아야 하고, 저장된 일지를 고치면 고치기 전 값이 수정 이력에 남음
  save: (
    companyId: string,
    userId: string,
    projectId: string,
    workDate: string,
    input: WorkLogSave,
  ) => Promise<WorkLog>;
  // 수정 이력 (최근이 맨 앞)
  revisions: (companyId: string, projectId: string, workDate: string) => Promise<WorkLogRevision[]>;
};

type LogRow = Prisma.WorkLogGetPayload<{ include: { entries: true } }>;

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const fromDate = (value: Date) => value.toISOString().slice(0, 10);

const invalid = (path: string, message: string) =>
  new WorkLogError('INVALID', { path: `body.${path}`, message });

const sortEntries = (entries: { employeeId: string; categoryId: string; minutes: number }[]) =>
  [...entries]
    .map(({ employeeId, categoryId, minutes }) => ({ employeeId, categoryId, minutes }))
    .sort(
      (a, b) =>
        a.employeeId.localeCompare(b.employeeId) || a.categoryId.localeCompare(b.categoryId),
    );

const isLate = (row: { workDate: Date; savedAt: Date | null }) =>
  isLateInput(fromDate(row.workDate), row.savedAt ? todayInSeoul(row.savedAt) : null);

const toSummary = (row: LogRow): WorkLogSummary => ({
  id: row.id,
  workDate: fromDate(row.workDate),
  status: row.status,
  isChange: row.isChange,
  isAfterService: row.isAfterService,
  isLate: isLate(row),
  entryCount: row.entries.length,
  totalMinutes: row.entries.reduce((sum, entry) => sum + entry.minutes, 0),
  hasContent: row.content.trim().length > 0,
});

// 경고: 하루 합계 공수 초과(저장된 다른 프로젝트 일지 포함), 휴직·퇴사 직원 (막지는 않음, 서비스 기획서 §9.4)
const warningsFor = async (
  tx: Prisma.TransactionClient,
  row: LogRow,
): Promise<WorkLogWarning[]> => {
  const employeeIds = [...new Set(row.entries.map((entry) => entry.employeeId))];

  if (employeeIds.length === 0) {
    return [];
  }

  const [settings, employees, others] = await Promise.all([
    tx.companySettings.findFirst(),
    tx.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, status: true },
    }),
    tx.workLogEntry.findMany({
      where: {
        employeeId: { in: employeeIds },
        workLog: { workDate: row.workDate, status: 'SAVED', NOT: { id: row.id } },
      },
      include: {
        workLog: { include: { project: { select: { id: true, code: true, name: true } } } },
      },
    }),
  ]);
  const limit = dailyOverMinutes(settings?.standardWorkMinutes ?? 480);
  const status = new Map(employees.map((employee) => [employee.id, employee.status]));
  const warnings: WorkLogWarning[] = [];

  for (const employeeId of employeeIds) {
    const own = row.entries
      .filter((entry) => entry.employeeId === employeeId)
      .reduce((sum, entry) => sum + entry.minutes, 0);
    const byProject = new Map<
      string,
      { projectId: string; projectCode: string; projectName: string; minutes: number }
    >();

    for (const other of others.filter((item) => item.employeeId === employeeId)) {
      const project = other.workLog.project;
      const known = byProject.get(project.id);

      byProject.set(project.id, {
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        minutes: (known?.minutes ?? 0) + other.minutes,
      });
    }

    const total = own + [...byProject.values()].reduce((sum, item) => sum + item.minutes, 0);

    if (total > limit) {
      warnings.push({
        type: 'DAILY_OVER',
        employeeId,
        totalMinutes: total,
        otherProjects: [...byProject.values()],
      });
    }

    if (status.get(employeeId) === 'ON_LEAVE') warnings.push({ type: 'ON_LEAVE', employeeId });
    if (status.get(employeeId) === 'LEFT') warnings.push({ type: 'LEFT', employeeId });
  }

  return warnings;
};

const toWorkLog = async (
  tx: Prisma.TransactionClient,
  row: LogRow,
  autoAssignedEmployeeIds: string[] = [],
): Promise<WorkLog> => ({
  id: row.id,
  projectId: row.projectId,
  workDate: fromDate(row.workDate),
  status: row.status,
  content: row.content,
  area: row.area,
  notes: row.notes,
  isChange: row.isChange,
  isAfterService: row.isAfterService,
  version: row.version,
  savedAt: row.savedAt ? row.savedAt.toISOString() : null,
  isLate: isLate(row),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  entries: sortEntries(row.entries),
  warnings: await warningsFor(tx, row),
  autoAssignedEmployeeIds,
});

// 프로젝트 행을 잠가 같은 프로젝트의 일지·투입·기간 변경이 동시에 들어와도 검사가 어긋나지 않게 함
const lockProject = async (tx: Prisma.TransactionClient, projectId: string) => {
  await tx.$queryRaw`SELECT id FROM projects WHERE id = ${projectId}::uuid FOR UPDATE`;

  const project = await tx.project.findFirst({ where: { id: projectId } });

  if (!project) {
    throw new WorkLogError('NOT_FOUND');
  }

  return project;
};

const findLog = (tx: Prisma.TransactionClient, projectId: string, workDate: string) =>
  tx.workLog.findFirst({
    where: { projectId, workDate: toDate(workDate) },
    include: { entries: true },
  });

/**
 * @description 작업일지 서비스 (앱 계정으로 자기 회사 범위에서만 조회·수정, 일지는 지우지 않음)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param now 시계 (오늘 날짜·저장 시각 판정용)
 * @returns 작업일지 서비스
 */
export const createWorkLogService = (
  app: PrismaClient,
  now: Clock = () => new Date(),
): WorkLogService => ({
  list: (companyId, projectId, { from, to, status }) =>
    withCompany(app, companyId, async (tx) => {
      if (!(await tx.project.findFirst({ where: { id: projectId }, select: { id: true } }))) {
        throw new WorkLogError('NOT_FOUND');
      }

      const rows = await tx.workLog.findMany({
        where: {
          projectId,
          status,
          workDate: { gte: from ? toDate(from) : undefined, lte: to ? toDate(to) : undefined },
        },
        include: { entries: true },
        orderBy: { workDate: 'desc' },
      });

      return rows.map(toSummary);
    }),

  get: (companyId, projectId, workDate) =>
    withCompany(app, companyId, async (tx) => {
      const row = await findLog(tx, projectId, workDate);

      if (!row) {
        throw new WorkLogError('NOT_FOUND');
      }

      return toWorkLog(tx, row);
    }),

  save: (companyId, userId, projectId, workDate, input) =>
    withCompany(app, companyId, async (tx) => {
      const project = await lockProject(tx, projectId);
      const confirmed = input.confirmStatus === true;
      const statusCheck = workLogStatusCheck(project.status, {
        confirmStatus: confirmed,
        isAfterService: input.isAfterService,
      });

      if (!statusCheck.ok) {
        throw invalid(statusCheck.path, statusCheck.message);
      }

      const dateCheck = checkWorkDate(
        workDate,
        { plannedStart: fromDate(project.plannedStart), plannedEnd: fromDate(project.plannedEnd) },
        todayInSeoul(now()),
      );

      if (!dateCheck.ok) {
        throw invalid(dateCheck.path, dateCheck.message);
      }

      const saveCheck = validateWorkLogForSave(input);

      if (!saveCheck.ok) {
        throw invalid(saveCheck.path, saveCheck.message);
      }

      const existing = await findLog(tx, projectId, workDate);

      // 낙관적 잠금: 화면이 본 버전이 현재와 다르면 다른 곳에서 먼저 수정된 것
      if (!existing && input.expectedVersion != null) {
        throw new WorkLogError('CONFLICT');
      }

      if (existing && input.expectedVersion !== existing.version) {
        throw new WorkLogError('CONFLICT');
      }

      if (existing?.status === 'SAVED' && input.status === 'DRAFT') {
        throw invalid('status', '저장된 일지는 임시 저장으로 되돌릴 수 없습니다');
      }

      // 직원·작업 구분: 같은 회사의 직원, 작업 구분 목록의 항목만. 숨긴 작업 구분은 이 일지가 이미 쓰고 있을 때만 유지
      const employeeIds = [...new Set(input.entries.map((entry) => entry.employeeId))];
      const categoryIds = [...new Set(input.entries.map((entry) => entry.categoryId))];
      const employees = await tx.employee.findMany({ where: { id: { in: employeeIds } } });

      if (employees.length !== employeeIds.length) {
        throw invalid('entries', '선택할 수 없는 직원이 있습니다');
      }

      const categories = await tx.optionItem.findMany({
        where: { id: { in: categoryIds }, kind: 'WORK_CATEGORY' },
      });
      const usedCategories = new Set(existing?.entries.map((entry) => entry.categoryId) ?? []);

      if (categories.length !== categoryIds.length) {
        throw invalid('entries', '선택할 수 없는 작업 구분이 있습니다');
      }

      if (categories.some((category) => !category.isActive && !usedCategories.has(category.id))) {
        throw invalid('entries', '숨긴 작업 구분은 새로 고를 수 없습니다');
      }

      // 투입 등록이 안 된 직원을 일지에 넣으면 투입을 자동으로 추가할지 확인 (서비스 기획서 §9.3). 저장할 때만 확인하고 퇴사한 직원은 경고만
      const autoAssigned: string[] = [];

      if (input.status === 'SAVED') {
        const covered = await tx.projectAssignment.findMany({
          where: {
            projectId,
            employeeId: { in: employeeIds },
            cancelledAt: null,
            startDate: { lte: toDate(workDate) },
            endDate: { gte: toDate(workDate) },
          },
          select: { employeeId: true },
        });
        const coveredIds = new Set(covered.map((item) => item.employeeId));
        const missing = employees.filter(
          (employee) => employee.status !== 'LEFT' && !coveredIds.has(employee.id),
        );

        if (missing.length > 0) {
          if (input.addMissingAssignments !== true) {
            throw invalid(
              'addMissingAssignments',
              `투입 등록이 안 된 직원이 있습니다 (${missing.map((employee) => employee.name).join(', ')}). 투입을 자동으로 추가할지 확인해 주세요`,
            );
          }

          const assignable = assignmentStatusCheck(project.status, confirmed);

          if (!assignable.ok) {
            throw invalid(
              'addMissingAssignments',
              `투입을 자동으로 추가할 수 없습니다. ${assignable.message}`,
            );
          }

          await tx.projectAssignment.createMany({
            data: missing.map((employee) => ({
              companyId,
              projectId,
              employeeId: employee.id,
              startDate: toDate(workDate),
              endDate: toDate(workDate),
            })),
          });
          autoAssigned.push(...missing.map((employee) => employee.id));
        }
      }

      const savedAt = existing?.savedAt ?? (input.status === 'SAVED' ? now() : null);
      const fields = {
        status: input.status,
        content: input.content,
        area: input.area || null,
        notes: input.notes || null,
        isChange: input.isChange,
        isAfterService: input.isAfterService,
        savedAt,
      };

      let logId: string;

      if (!existing) {
        logId = (
          await tx.workLog.create({
            data: { companyId, projectId, workDate: toDate(workDate), ...fields },
          })
        ).id;
      } else {
        logId = existing.id;

        // 저장된 일지를 고치면 고치기 전 값을 남김 (임시 저장 중의 수정은 기록하지 않음)
        if (existing.status === 'SAVED') {
          await tx.workLogRevision.create({
            data: {
              companyId,
              workLogId: existing.id,
              version: existing.version,
              snapshot: workLogSnapshotSchema.parse({
                status: existing.status,
                content: existing.content,
                area: existing.area,
                notes: existing.notes,
                isChange: existing.isChange,
                isAfterService: existing.isAfterService,
                entries: sortEntries(existing.entries),
              }),
              changedBy: userId,
            },
          });
        }

        await tx.workLogEntry.deleteMany({ where: { workLogId: existing.id } });
        await tx.workLog.update({
          where: { companyId_id: { companyId, id: existing.id } },
          data: { ...fields, version: existing.version + 1 },
        });
      }

      await tx.workLogEntry.createMany({
        data: input.entries.map((entry) => ({ companyId, workLogId: logId, ...entry })),
      });

      const saved = await tx.workLog.findFirstOrThrow({
        where: { id: logId },
        include: { entries: true },
      });

      return toWorkLog(tx, saved, autoAssigned);
    }),

  revisions: (companyId, projectId, workDate) =>
    withCompany(app, companyId, async (tx) => {
      const row = await findLog(tx, projectId, workDate);

      if (!row) {
        throw new WorkLogError('NOT_FOUND');
      }

      const rows = await tx.workLogRevision.findMany({
        where: { workLogId: row.id },
        orderBy: { version: 'desc' },
      });

      return rows.map((revision) => ({
        id: revision.id,
        version: revision.version,
        snapshot: workLogSnapshotSchema.parse(revision.snapshot),
        changedAt: revision.changedAt.toISOString(),
      }));
    }),
});
