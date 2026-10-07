import { z } from 'zod';

import type { RuleCheck } from './assignments';
import type { ProjectStatus } from './projects';

// 작업일지 (서비스 기획서 §9.2~§9.4). 프로젝트 × 날짜마다 일지 한 건에 공통 내용을 쓰고,
// 직원별·작업 구분별 공수(분)를 항목으로 붙인다. 공수는 항상 분 단위로 저장한다
export const WORK_LOG_STATUSES = ['DRAFT', 'SAVED'] as const;

export const workLogStatusSchema = z.enum(WORK_LOG_STATUSES);

export type WorkLogStatus = z.infer<typeof workLogStatusSchema>;

export const WORK_LOG_STATUS_LABELS: Record<WorkLogStatus, string> = {
  DRAFT: '임시 저장',
  SAVED: '저장됨',
};

export const WORK_LOG_CONTENT_MAX_LENGTH = 5000;
export const WORK_LOG_AREA_MAX_LENGTH = 100;
export const WORK_LOG_NOTES_MAX_LENGTH = 1000;
export const WORK_LOG_MAX_ENTRIES = 100;
// 한 항목의 공수 상한: 하루 24시간
export const WORK_LOG_MAX_ENTRY_MINUTES = 1440;

// 작업일과 처음 저장한 날의 차이가 이 일수를 넘으면 "지연 입력"으로 표시만 한다 (서비스 기획서 §9.4, 기준일은 제안값)
export const LATE_INPUT_DAYS = 3;

// 같은 직원의 하루 합계 공수가 하루 기준시간의 이 배수를 넘으면 경고한다
// (예: 프로젝트 A 1.0 + B 1.0 = 2.0은 경고, 연장 1.5 한 번은 경고하지 않음. 회사별 기준은 3단계에서 설정으로 뺀다)
export const DAILY_OVER_MAN_DAYS = 1.5;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

export const workLogEntrySchema = z.object({
  employeeId: z.uuid(),
  // 선택 목록의 작업 구분 항목 id
  categoryId: z.uuid(),
  // 공수(분)
  minutes: z
    .number()
    .int('공수는 분 단위 정수여야 합니다')
    .min(1, '공수는 0보다 커야 합니다')
    .max(WORK_LOG_MAX_ENTRY_MINUTES, '공수는 하루 24시간을 넘을 수 없습니다'),
});

export type WorkLogEntry = z.infer<typeof workLogEntrySchema>;

const entriesSchema = z
  .array(workLogEntrySchema)
  .max(WORK_LOG_MAX_ENTRIES, `공수 항목은 ${WORK_LOG_MAX_ENTRIES}개까지 입력할 수 있습니다`)
  .refine(
    (entries) =>
      new Set(entries.map((entry) => `${entry.employeeId}:${entry.categoryId}`)).size ===
      entries.length,
    '같은 직원·작업 구분 조합은 한 번만 입력할 수 있습니다',
  );

// 저장 요청: 임시 저장은 비어 있어도 되고, 저장은 작업 내용과 공수 한 건 이상이 필요하다 (validateWorkLogForSave)
export const workLogSaveSchema = z.object({
  status: workLogStatusSchema,
  content: z
    .string()
    .max(
      WORK_LOG_CONTENT_MAX_LENGTH,
      `작업 내용은 ${WORK_LOG_CONTENT_MAX_LENGTH}자까지 입력할 수 있습니다`,
    ),
  area: z
    .string()
    .trim()
    .max(
      WORK_LOG_AREA_MAX_LENGTH,
      `작업 구역은 ${WORK_LOG_AREA_MAX_LENGTH}자까지 입력할 수 있습니다`,
    )
    .nullish(),
  // 날씨·특이사항
  notes: z
    .string()
    .max(
      WORK_LOG_NOTES_MAX_LENGTH,
      `특이사항은 ${WORK_LOG_NOTES_MAX_LENGTH}자까지 입력할 수 있습니다`,
    )
    .nullish(),
  // 변경·추가 작업, 사후 작업 표시 (서비스 기획서 §9.2)
  isChange: z.boolean().default(false),
  isAfterService: z.boolean().default(false),
  entries: entriesSchema,
  // 이미 있는 일지를 고칠 때 화면이 마지막으로 본 버전 (다르면 다른 곳에서 먼저 수정된 것이라 거부, 낙관적 잠금)
  expectedVersion: z.number().int().min(1).nullish(),
  // 중단·완료 프로젝트에 입력하는 것을 관리자가 확인했다는 표시
  confirmStatus: z.boolean().optional(),
  // 투입 등록이 안 된 직원을 일지에 넣을 때 투입을 자동으로 추가할지 (서비스 기획서 §9.3)
  addMissingAssignments: z.boolean().optional(),
});

export type WorkLogSave = z.infer<typeof workLogSaveSchema>;
export type WorkLogSaveInput = z.input<typeof workLogSaveSchema>;

export const workLogWarningSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('DAILY_OVER'),
    employeeId: z.uuid(),
    // 그날 이 직원의 저장된 일지 공수 합 (이 일지 포함)
    totalMinutes: z.number().int(),
    otherProjects: z.array(
      z.object({
        projectId: z.uuid(),
        projectCode: z.string(),
        projectName: z.string(),
        minutes: z.number().int(),
      }),
    ),
  }),
  z.object({ type: z.literal('ON_LEAVE'), employeeId: z.uuid() }),
  z.object({ type: z.literal('LEFT'), employeeId: z.uuid() }),
]);

export type WorkLogWarning = z.infer<typeof workLogWarningSchema>;

export const workLogSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  workDate: dateSchema,
  status: workLogStatusSchema,
  content: z.string(),
  area: z.string().nullable(),
  notes: z.string().nullable(),
  isChange: z.boolean(),
  isAfterService: z.boolean(),
  // 저장(수정)할 때마다 1씩 올라가는 버전 (낙관적 잠금)
  version: z.number().int(),
  // 처음 저장한 시각 (임시 저장 중에는 null)
  savedAt: z.iso.datetime().nullable(),
  // 작업일에서 한참 지나 입력한 일지 (표시만)
  isLate: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  entries: z.array(workLogEntrySchema),
  warnings: z.array(workLogWarningSchema),
  // 투입 등록이 없어 자동으로 투입을 추가한 직원 (저장 응답에만 값이 있음)
  autoAssignedEmployeeIds: z.array(z.uuid()),
});

export type WorkLog = z.infer<typeof workLogSchema>;

export const workLogSummarySchema = z.object({
  id: z.uuid(),
  workDate: dateSchema,
  status: workLogStatusSchema,
  isChange: z.boolean(),
  isAfterService: z.boolean(),
  isLate: z.boolean(),
  entryCount: z.number().int(),
  // 공수 합(분). 집계에는 저장된 일지만 쓰고 임시 저장은 별도 표시한다 (§9.4)
  totalMinutes: z.number().int(),
  hasContent: z.boolean(),
});

export type WorkLogSummary = z.infer<typeof workLogSummarySchema>;

export const workLogsResponseSchema = z.object({ items: z.array(workLogSummarySchema) });

export const workLogListQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  status: workLogStatusSchema.optional(),
});

export type WorkLogListQuery = z.infer<typeof workLogListQuerySchema>;

export const workLogParamsSchema = z.object({ id: z.uuid(), workDate: dateSchema });

// 수정 이력: 저장된 일지를 고칠 때마다 고치기 전 값을 남긴다 (서비스 기획서 §9.1, §9.4)
export const workLogSnapshotSchema = z.object({
  status: workLogStatusSchema,
  content: z.string(),
  area: z.string().nullable(),
  notes: z.string().nullable(),
  isChange: z.boolean(),
  isAfterService: z.boolean(),
  entries: z.array(workLogEntrySchema),
});

export type WorkLogSnapshot = z.infer<typeof workLogSnapshotSchema>;

export const workLogRevisionSchema = z.object({
  id: z.uuid(),
  // 이 기록이 대체된 버전 (고치기 전 버전)
  version: z.number().int(),
  // 고치기 전 값
  snapshot: workLogSnapshotSchema,
  changedAt: z.iso.datetime(),
});

export type WorkLogRevision = z.infer<typeof workLogRevisionSchema>;

// 최근 수정이 맨 앞
export const workLogRevisionsSchema = z.object({ items: z.array(workLogRevisionSchema) });

/**
 * @description 프로젝트 상태에서 일지를 입력할 수 있는지 (서비스 기획서 §10.3 "작업일지 입력" 행)
 * 진행은 가능, 중단·완료(소급)는 관리자 확인, 보증 중은 사후 작업 표시가 있을 때만, 예정·종료·취소는 불가
 * @param status 프로젝트 상태
 * @param flags 관리자 확인 여부와 사후 작업 표시 여부
 * @returns 통과 여부와 거부 사유
 */
export const workLogStatusCheck = (
  status: ProjectStatus,
  flags: { confirmStatus: boolean; isAfterService: boolean },
): RuleCheck => {
  switch (status) {
    case 'IN_PROGRESS':
      return { ok: true };
    case 'SUSPENDED':
      return flags.confirmStatus
        ? { ok: true }
        : {
            ok: false,
            path: 'confirmStatus',
            message: '중단 중인 프로젝트입니다. 일지를 쓰려면 확인이 필요합니다',
          };
    case 'COMPLETED':
      return flags.confirmStatus
        ? { ok: true }
        : {
            ok: false,
            path: 'confirmStatus',
            message: '완료된 프로젝트입니다. 소급해서 일지를 쓰려면 확인이 필요합니다',
          };
    case 'WARRANTY':
      return flags.isAfterService
        ? { ok: true }
        : {
            ok: false,
            path: 'isAfterService',
            message: '보증 중에는 사후 작업으로 표시한 일지만 쓸 수 있습니다',
          };
    case 'PLANNED':
      return {
        ok: false,
        path: 'workDate',
        message: '아직 시작하지 않은 프로젝트입니다. 먼저 작업을 시작해 주세요',
      };
    default:
      return {
        ok: false,
        path: 'workDate',
        message: '종료·취소된 프로젝트에는 일지를 쓸 수 없습니다',
      };
  }
};

/**
 * @description 작업 일자 검사: 프로젝트 예정 기간 안이어야 하고 오늘 이후는 입력할 수 없다 (서비스 기획서 §9.4)
 * @param workDate 작업 일자
 * @param project 프로젝트 예정 기간
 * @param today 서울 기준 오늘
 * @returns 통과 여부와 거부 사유
 */
export const checkWorkDate = (
  workDate: string,
  project: { plannedStart: string; plannedEnd: string },
  today: string,
): RuleCheck => {
  if (workDate > today) {
    return { ok: false, path: 'workDate', message: '오늘 이후 날짜의 일지는 쓸 수 없습니다' };
  }

  if (workDate < project.plannedStart || workDate > project.plannedEnd) {
    return {
      ok: false,
      path: 'workDate',
      message: `프로젝트 기간(${project.plannedStart} ~ ${project.plannedEnd}) 밖의 날짜입니다. 기간을 먼저 연장해 주세요`,
    };
  }

  return { ok: true };
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @description 지연 입력 여부: 작업일과 처음 저장한 날의 차이가 기준일을 넘는지
 * @param workDate 작업 일자
 * @param savedDate 처음 저장한 날(서울 기준), 임시 저장 중이면 null
 * @returns 지연 입력 여부
 */
export const isLateInput = (workDate: string, savedDate: string | null) => {
  if (!savedDate) {
    return false;
  }

  const days =
    (Date.parse(`${savedDate}T00:00:00Z`) - Date.parse(`${workDate}T00:00:00Z`)) / DAY_MS;

  return days > LATE_INPUT_DAYS;
};

/**
 * @description 하루 합계 공수 경고 기준(분): 하루 기준시간 × 1.5
 * @param standardMinutes 하루 기준시간(분)
 * @returns 이 값을 넘으면 경고
 */
export const dailyOverMinutes = (standardMinutes: number) =>
  Math.round(standardMinutes * DAILY_OVER_MAN_DAYS);

/**
 * @description 저장할 때의 필수 항목: 임시 저장은 비어 있어도 되고, 저장은 작업 내용과 공수 한 건 이상이 필요하다
 * @param input 상태·작업 내용·공수 항목
 * @returns 통과 여부와 거부 사유
 */
export const validateWorkLogForSave = (input: {
  status: WorkLogStatus;
  content: string;
  entries: readonly unknown[];
}): RuleCheck => {
  if (input.status === 'DRAFT') {
    return { ok: true };
  }

  if (input.content.trim().length === 0) {
    return {
      ok: false,
      path: 'content',
      message: '저장하려면 작업 내용을 입력해 주세요 (나중에 마무리하려면 임시 저장을 쓰세요)',
    };
  }

  if (input.entries.length === 0) {
    return {
      ok: false,
      path: 'entries',
      message:
        '저장하려면 공수를 한 건 이상 입력해 주세요 (나중에 마무리하려면 임시 저장을 쓰세요)',
    };
  }

  return { ok: true };
};
