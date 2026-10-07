import { z } from 'zod';

import { projectStatusSchema, type ProjectStatus } from './projects';

// 투입 (서비스 기획서 §9.1, §9.4). 직원을 프로젝트 예정 기간 안의 일정 기간에 배정한다
export const ASSIGNMENT_MAX_PLANNED_MINUTES = 6_000_000;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

// 같은 날 다른 프로젝트에 겹쳐 배정되면 경고(막지는 않음, §9.4). 휴직·퇴사 직원도 경고
export const assignmentWarningSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('OVERLAP'),
    projectId: z.uuid(),
    projectCode: z.string(),
    projectName: z.string(),
    // 겹치는 구간
    from: z.iso.date(),
    to: z.iso.date(),
  }),
  z.object({ type: z.literal('ON_LEAVE') }),
  z.object({ type: z.literal('LEFT') }),
]);

export type AssignmentWarning = z.infer<typeof assignmentWarningSchema>;

export const assignmentSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  employeeId: z.uuid(),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  // 계획 공수(분). 보여 줄 때 회사 기준시간으로 MD·시간으로 환산
  plannedMinutes: z.number().int().nullable(),
  // 취소한 투입은 지우지 않고 취소 시각만 남김
  cancelledAt: z.iso.datetime().nullable(),
  warnings: z.array(assignmentWarningSchema),
});

export type Assignment = z.infer<typeof assignmentSchema>;

export const assignmentsResponseSchema = z.object({ items: z.array(assignmentSchema) });

export type AssignmentsResponse = z.infer<typeof assignmentsResponseSchema>;

export const assignmentListQuerySchema = z.object({
  // 취소한 투입도 함께 (기본은 숨김)
  includeCancelled: z.enum(['true']).optional(),
});

export type AssignmentListQuery = z.infer<typeof assignmentListQuerySchema>;

export const assignmentParamsSchema = z.object({ id: z.uuid(), assignmentId: z.uuid() });

const plannedSchema = z
  .number()
  .int('계획 공수는 분 단위 정수여야 합니다')
  .min(1, '계획 공수는 0보다 커야 합니다')
  .max(ASSIGNMENT_MAX_PLANNED_MINUTES, '계획 공수가 너무 큽니다');

const confirmSchema = z.boolean().optional();

export const assignmentCreateSchema = z
  .object({
    employeeId: z.uuid('직원을 선택해 주세요'),
    startDate: dateSchema,
    endDate: dateSchema,
    plannedMinutes: plannedSchema.nullish(),
    // 중단 중인 프로젝트에 투입할 때 관리자가 확인했다는 표시
    confirmSuspended: confirmSchema,
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: '종료일은 시작일보다 빠를 수 없습니다',
    path: ['endDate'],
  });

export type AssignmentCreate = z.infer<typeof assignmentCreateSchema>;

// 수정: 직원은 바꿀 수 없다 (직원을 바꾸려면 취소하고 새로 투입)
export const assignmentUpdateSchema = z
  .object({
    startDate: dateSchema,
    endDate: dateSchema,
    plannedMinutes: plannedSchema.nullable(),
    confirmSuspended: confirmSchema,
  })
  .partial()
  .refine(
    (value) =>
      value.startDate !== undefined ||
      value.endDate !== undefined ||
      value.plannedMinutes !== undefined,
    { message: '변경할 값이 없습니다' },
  )
  .refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
    message: '종료일은 시작일보다 빠를 수 없습니다',
    path: ['endDate'],
  });

export type AssignmentUpdate = z.infer<typeof assignmentUpdateSchema>;

export const assignmentCancelSchema = z.object({ confirmSuspended: confirmSchema });

export type AssignmentCancel = z.infer<typeof assignmentCancelSchema>;

// 프로젝트 예정 기간 변경 이력 (서비스 기획서 §10.2)
export const projectPeriodChangeSchema = z.object({
  id: z.uuid(),
  fromStart: z.iso.date(),
  fromEnd: z.iso.date(),
  toStart: z.iso.date(),
  toEnd: z.iso.date(),
  reason: z.string().nullable(),
  changedAt: z.iso.datetime(),
});

export type ProjectPeriodChange = z.infer<typeof projectPeriodChangeSchema>;

// 최근 변경이 맨 앞
export const projectPeriodHistorySchema = z.object({ items: z.array(projectPeriodChangeSchema) });

export type ProjectPeriodHistory = z.infer<typeof projectPeriodHistorySchema>;

export type RuleCheck = { ok: true } | { ok: false; path: string; message: string };

/**
 * @description 이 프로젝트 상태에서 투입을 만들거나 바꿀 수 있는지 (§10.3 "투입 배정" 행)
 * 예정·진행은 가능, 중단은 관리자 확인이 있을 때만, 완료·보증 중·종료·취소는 불가
 * (보증 중의 "사후 작업만 투입"은 보증 기능과 함께 4단계에서 연다)
 * @param status 프로젝트 상태
 * @param confirmedSuspended 중단 중 투입을 관리자가 확인했는지
 * @returns 통과 여부와 거부 사유
 */
export const assignmentStatusCheck = (
  status: ProjectStatus,
  confirmedSuspended: boolean,
): RuleCheck => {
  if (status === 'PLANNED' || status === 'IN_PROGRESS') {
    return { ok: true };
  }

  if (status === 'SUSPENDED') {
    return confirmedSuspended
      ? { ok: true }
      : {
          ok: false,
          path: 'confirmSuspended',
          message: '중단 중인 프로젝트입니다. 투입하려면 확인이 필요합니다',
        };
  }

  return {
    ok: false,
    path: 'projectId',
    message: `'${statusLabel(status)}' 상태의 프로젝트에는 투입을 바꿀 수 없습니다`,
  };
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: '예정',
  IN_PROGRESS: '진행',
  SUSPENDED: '중단',
  COMPLETED: '완료',
  WARRANTY: '보증 중',
  CLOSED: '종료',
  CANCELLED: '취소',
};

const statusLabel = (status: ProjectStatus) => STATUS_LABELS[projectStatusSchema.parse(status)];

/**
 * @description 투입 기간이 프로젝트 예정 기간 안인지 검사 ("프로젝트 기간 밖은 입력할 수 없다", §9.4)
 * @param startDate 투입 시작일
 * @param endDate 투입 종료일
 * @param project 프로젝트 예정 기간
 * @returns 통과 여부와 어느 날짜가 왜 안 되는지
 */
export const checkAssignmentPeriod = (
  startDate: string,
  endDate: string,
  project: { plannedStart: string; plannedEnd: string },
): RuleCheck => {
  if (startDate > endDate) {
    return { ok: false, path: 'endDate', message: '종료일은 시작일보다 빠를 수 없습니다' };
  }

  if (startDate < project.plannedStart) {
    return {
      ok: false,
      path: 'startDate',
      message: `시작일은 프로젝트 시작 예정일(${project.plannedStart}) 이후여야 합니다`,
    };
  }

  if (endDate > project.plannedEnd) {
    return {
      ok: false,
      path: 'endDate',
      message: `종료일은 프로젝트 종료 예정일(${project.plannedEnd}) 이전이어야 합니다`,
    };
  }

  return { ok: true };
};

/**
 * @description 두 기간이 겹치는 구간 (양 끝날을 포함, 하루만 겹쳐도 겹침)
 * @param aStart 첫 기간 시작
 * @param aEnd 첫 기간 끝
 * @param bStart 둘째 기간 시작
 * @param bEnd 둘째 기간 끝
 * @returns 겹치는 구간, 겹치지 않으면 null
 */
export const overlapRange = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
  const from = aStart > bStart ? aStart : bStart;
  const to = aEnd < bEnd ? aEnd : bEnd;

  return from <= to ? { from, to } : null;
};

/**
 * @description 프로젝트 예정 기간을 바꿀 때 사유가 필수인지: 예정 상태에서는 선택, 시작한 뒤에는 필수
 * @param status 프로젝트 상태
 * @returns 사유 필수 여부
 */
export const periodChangeNeedsReason = (status: ProjectStatus) => status !== 'PLANNED';
