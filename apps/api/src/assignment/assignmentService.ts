import {
  assignmentStatusCheck,
  checkAssignmentPeriod,
  overlapRange,
  type Assignment,
  type AssignmentCancel,
  type AssignmentCreate,
  type AssignmentUpdate,
  type AssignmentWarning,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class AssignmentError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[assignment.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type AssignmentService = {
  // 프로젝트의 투입 목록 (기본은 취소하지 않은 것만). 겹침·휴직·퇴사 경고가 함께 붙음
  list: (companyId: string, projectId: string, includeCancelled: boolean) => Promise<Assignment[]>;
  create: (companyId: string, projectId: string, input: AssignmentCreate) => Promise<Assignment>;
  update: (
    companyId: string,
    projectId: string,
    id: string,
    input: AssignmentUpdate,
  ) => Promise<Assignment>;
  // 투입 취소: 지우지 않고 취소 시각만 기록
  cancel: (
    companyId: string,
    projectId: string,
    id: string,
    input: AssignmentCancel,
  ) => Promise<Assignment>;
};

type Row = Prisma.ProjectAssignmentGetPayload<object>;

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const fromDate = (value: Date) => value.toISOString().slice(0, 10);

const invalid = (path: string, message: string) =>
  new AssignmentError('INVALID', { path, message });

// 같은 날 다른 프로젝트에 겹쳐 배정되거나 휴직·퇴사 직원이면 경고 (막지는 않음, 서비스 기획서 §9.4)
// 취소된 프로젝트·취소한 투입은 겹침으로 보지 않는다
const warningsFor = async (tx: Prisma.TransactionClient, rows: Row[]) => {
  const warnings = new Map<string, AssignmentWarning[]>(rows.map((row) => [row.id, []]));
  const employeeIds = [...new Set(rows.map((row) => row.employeeId))];

  if (employeeIds.length === 0) {
    return warnings;
  }

  const [employees, others] = await Promise.all([
    tx.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, status: true },
    }),
    tx.projectAssignment.findMany({
      where: {
        employeeId: { in: employeeIds },
        cancelledAt: null,
        projectId: { notIn: [...new Set(rows.map((row) => row.projectId))] },
        project: { status: { not: 'CANCELLED' } },
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    }),
  ]);
  const status = new Map(employees.map((employee) => [employee.id, employee.status]));

  for (const row of rows) {
    const list = warnings.get(row.id)!;

    for (const other of others.filter((item) => item.employeeId === row.employeeId)) {
      const range = overlapRange(
        fromDate(row.startDate),
        fromDate(row.endDate),
        fromDate(other.startDate),
        fromDate(other.endDate),
      );

      if (range) {
        list.push({
          type: 'OVERLAP',
          projectId: other.project.id,
          projectCode: other.project.code,
          projectName: other.project.name,
          ...range,
        });
      }
    }

    if (status.get(row.employeeId) === 'ON_LEAVE') list.push({ type: 'ON_LEAVE' });
    if (status.get(row.employeeId) === 'LEFT') list.push({ type: 'LEFT' });
  }

  return warnings;
};

const toAssignment = (row: Row, warnings: AssignmentWarning[]): Assignment => ({
  id: row.id,
  projectId: row.projectId,
  employeeId: row.employeeId,
  startDate: fromDate(row.startDate),
  endDate: fromDate(row.endDate),
  plannedMinutes: row.plannedMinutes,
  cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
  warnings,
});

const withWarnings = async (tx: Prisma.TransactionClient, row: Row) =>
  toAssignment(row, (await warningsFor(tx, [row])).get(row.id) ?? []);

// 프로젝트 행을 잠가 같은 프로젝트의 투입·기간 변경이 동시에 들어와도 겹침 검사가 어긋나지 않게 함
const lockProject = async (tx: Prisma.TransactionClient, projectId: string) => {
  await tx.$queryRaw`SELECT id FROM projects WHERE id = ${projectId}::uuid FOR UPDATE`;

  const project = await tx.project.findFirst({ where: { id: projectId } });

  if (!project) {
    throw new AssignmentError('NOT_FOUND');
  }

  return project;
};

// 같은 프로젝트·같은 직원의 취소하지 않은 투입과 기간이 겹치면 오류 (경고가 아님: 한 사람이 한 프로젝트에 겹쳐 두 번 잡히면 안 됨)
const assertNoSameProjectOverlap = async (
  tx: Prisma.TransactionClient,
  projectId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
  exceptId: string | null,
) => {
  const existing = await tx.projectAssignment.findMany({
    where: {
      projectId,
      employeeId,
      cancelledAt: null,
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
  });

  for (const item of existing) {
    const range = overlapRange(
      startDate,
      endDate,
      fromDate(item.startDate),
      fromDate(item.endDate),
    );

    if (range) {
      throw invalid(
        'body.startDate',
        `같은 직원이 이 프로젝트에 ${fromDate(item.startDate)} ~ ${fromDate(item.endDate)}로 이미 투입되어 있습니다. 기존 투입의 기간을 수정해 주세요`,
      );
    }
  }
};

const assertStatus = (
  status: Parameters<typeof assignmentStatusCheck>[0],
  confirmed: boolean | undefined,
) => {
  const checked = assignmentStatusCheck(status, confirmed === true);

  if (!checked.ok) {
    throw invalid(`body.${checked.path}`, checked.message);
  }
};

/**
 * @description 투입 서비스 (앱 계정으로 자기 회사 범위에서만 조회·수정, 삭제하지 않고 취소 표시만 남김)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @returns 투입 서비스
 */
export const createAssignmentService = (app: PrismaClient): AssignmentService => ({
  list: (companyId, projectId, includeCancelled) =>
    withCompany(app, companyId, async (tx) => {
      if (!(await tx.project.findFirst({ where: { id: projectId }, select: { id: true } }))) {
        throw new AssignmentError('NOT_FOUND');
      }

      const rows = await tx.projectAssignment.findMany({
        where: { projectId, ...(includeCancelled ? {} : { cancelledAt: null }) },
        orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      });
      const warnings = await warningsFor(tx, rows);

      return rows.map((row) =>
        toAssignment(row, row.cancelledAt ? [] : (warnings.get(row.id) ?? [])),
      );
    }),

  create: (companyId, projectId, input) =>
    withCompany(app, companyId, async (tx) => {
      const project = await lockProject(tx, projectId);

      assertStatus(project.status, input.confirmSuspended);

      const employee = await tx.employee.findFirst({ where: { id: input.employeeId } });

      if (!employee) {
        throw invalid('body.employeeId', '선택할 수 없는 직원입니다');
      }

      // 퇴사한 직원은 신규 투입에서 제외 (서비스 기획서 §8.6)
      if (employee.status === 'LEFT') {
        throw invalid('body.employeeId', '퇴사한 직원은 투입할 수 없습니다');
      }

      const period = checkAssignmentPeriod(input.startDate, input.endDate, {
        plannedStart: fromDate(project.plannedStart),
        plannedEnd: fromDate(project.plannedEnd),
      });

      if (!period.ok) {
        throw invalid(`body.${period.path}`, period.message);
      }

      await assertNoSameProjectOverlap(
        tx,
        projectId,
        input.employeeId,
        input.startDate,
        input.endDate,
        null,
      );

      return withWarnings(
        tx,
        await tx.projectAssignment.create({
          data: {
            companyId,
            projectId,
            employeeId: input.employeeId,
            startDate: toDate(input.startDate),
            endDate: toDate(input.endDate),
            plannedMinutes: input.plannedMinutes ?? null,
          },
        }),
      );
    }),

  update: (companyId, projectId, id, input) =>
    withCompany(app, companyId, async (tx) => {
      const project = await lockProject(tx, projectId);
      const current = await tx.projectAssignment.findFirst({ where: { id, projectId } });

      if (!current) {
        throw new AssignmentError('NOT_FOUND');
      }

      if (current.cancelledAt) {
        throw invalid('body', '취소된 투입은 수정할 수 없습니다');
      }

      assertStatus(project.status, input.confirmSuspended);

      const startDate = input.startDate ?? fromDate(current.startDate);
      const endDate = input.endDate ?? fromDate(current.endDate);
      const period = checkAssignmentPeriod(startDate, endDate, {
        plannedStart: fromDate(project.plannedStart),
        plannedEnd: fromDate(project.plannedEnd),
      });

      if (!period.ok) {
        throw invalid(`body.${period.path}`, period.message);
      }

      await assertNoSameProjectOverlap(tx, projectId, current.employeeId, startDate, endDate, id);

      return withWarnings(
        tx,
        await tx.projectAssignment.update({
          where: { companyId_id: { companyId, id } },
          data: {
            startDate: toDate(startDate),
            endDate: toDate(endDate),
            plannedMinutes: input.plannedMinutes,
          },
        }),
      );
    }),

  cancel: (companyId, projectId, id, input) =>
    withCompany(app, companyId, async (tx) => {
      const project = await lockProject(tx, projectId);
      const current = await tx.projectAssignment.findFirst({ where: { id, projectId } });

      if (!current) {
        throw new AssignmentError('NOT_FOUND');
      }

      if (current.cancelledAt) {
        throw invalid('body', '이미 취소된 투입입니다');
      }

      assertStatus(project.status, input.confirmSuspended);

      return toAssignment(
        await tx.projectAssignment.update({
          where: { companyId_id: { companyId, id } },
          data: { cancelledAt: new Date() },
        }),
        [],
      );
    }),
});
