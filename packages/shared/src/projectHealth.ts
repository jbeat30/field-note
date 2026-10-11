import { z } from 'zod';

import { countDays } from './staffing';
import { projectStatusSchema, type ProjectStatus } from './projects';

// 일정과 진행 (서비스 기획서 §10.4): 진행률 기록, 공수 소진율, 경고
// 경고 기준은 기획서 결정값(공수 소진율 80% / 100%)을 쓰며 회사별 설정은 이후에 붙인다
export const BURN_WARN_PERCENT = 80;

export const BURN_LIMIT_PERCENT = 100;

// 공수 소진율이 진행률보다 이만큼(%p) 이상 앞서면 경고, 일정 경과율보다 진행률이 이만큼 이상 뒤처져도 경고
export const AHEAD_GAP_PERCENT = 20;

export const PROGRESS_NOTE_MAX_LENGTH = 200;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

export const progressRecordCreateSchema = z.object({
  percent: z
    .number()
    .int('진행률은 정수여야 합니다')
    .min(0, '진행률은 0 이상이어야 합니다')
    .max(100, '진행률은 100 이하여야 합니다'),
  // 비우면 서울 기준 오늘
  recordedOn: dateSchema.optional(),
  note: z
    .string()
    .trim()
    .min(1, '메모를 비우려면 보내지 마세요')
    .max(PROGRESS_NOTE_MAX_LENGTH, `메모는 ${PROGRESS_NOTE_MAX_LENGTH}자까지 쓸 수 있습니다`)
    .optional(),
});

export type ProgressRecordCreate = z.infer<typeof progressRecordCreateSchema>;

export const progressRecordSchema = z.object({
  id: z.uuid(),
  percent: z.number().int(),
  recordedOn: dateSchema,
  note: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type ProgressRecord = z.infer<typeof progressRecordSchema>;

// 기준일이 최근인 기록이 맨 앞
export const progressRecordsResponseSchema = z.object({ items: z.array(progressRecordSchema) });

export type ProgressRecordsResponse = z.infer<typeof progressRecordsResponseSchema>;

export const PROJECT_WARNING_TYPES = [
  'BURN_WARN',
  'BURN_LIMIT',
  'BURN_AHEAD',
  'OVERDUE',
  'BEHIND_SCHEDULE',
] as const;

export const projectWarningTypeSchema = z.enum(PROJECT_WARNING_TYPES);

export type ProjectWarningType = z.infer<typeof projectWarningTypeSchema>;

export const PROJECT_WARNING_LABELS: Record<ProjectWarningType, string> = {
  BURN_WARN: '공수 소진율 80% 도달',
  BURN_LIMIT: '공수 소진율 100% 도달',
  BURN_AHEAD: '진행률보다 공수가 빨리 소진되는 중',
  OVERDUE: '종료 예정일이 지났는데 끝나지 않음',
  BEHIND_SCHEDULE: '진행률이 일정보다 뒤처짐',
};

export const projectHealthSchema = z.object({
  // 계획 공수(분): 취소하지 않은 투입의 계획 공수 합. 계획이 하나도 없으면 null
  plannedMinutes: z.number().int().nullable(),
  // 투입 공수(분): 저장된 일지의 공수 합
  usedMinutes: z.number().int(),
  // 공수 소진율(%): 계획이 없으면 null
  burnPercent: z.number().nullable(),
  // 현재 진행률: 기록이 없으면 null
  progressPercent: z.number().int().nullable(),
  progressRecordedOn: dateSchema.nullable(),
  // 현재 속도로 끝낼 때 필요한 공수(분) = 투입 공수 ÷ 진행률. 진행률이 없거나 0이면 null
  forecastMinutes: z.number().int().nullable(),
  warnings: z.array(projectWarningTypeSchema),
});

export type ProjectHealth = z.infer<typeof projectHealthSchema>;

type HealthInput = {
  status: ProjectStatus;
  plannedMinutes: number | null;
  usedMinutes: number;
  progressPercent: number | null;
  progressRecordedOn: string | null;
  plannedStart: string;
  plannedEnd: string;
  today: string;
};

// 진행률 입력은 예정·진행·중단에서만 (§10.3)
const PROGRESS_STATUSES: ProjectStatus[] = ['PLANNED', 'IN_PROGRESS', 'SUSPENDED'];

// 경고는 아직 끝나지 않은 진행 중 프로젝트에만
const ACTIVE_STATUSES: ProjectStatus[] = ['IN_PROGRESS', 'SUSPENDED'];

/**
 * @description 이 프로젝트 상태에서 진행률을 입력할 수 있는지 (§10.3 "진행률 입력" 행)
 * @param status 프로젝트 상태
 * @returns 입력 가능 여부
 */
export const canRecordProgress = (status: ProjectStatus) =>
  PROGRESS_STATUSES.includes(projectStatusSchema.parse(status));

const roundOne = (value: number) => Math.round(value * 10) / 10;

/**
 * @description 공수 소진율·예상 필요 공수·경고를 계산한다
 * 예시(§10.4): 계획 80MD, 투입 56MD(소진율 70%), 진행률 45% → 예상 필요 공수 124MD, 소진율이 진행률보다 25%p 앞서 경고
 * @param input 상태·공수·진행률·예정 기간·오늘(서울 기준)
 * @returns 프로젝트 진행 점검 결과
 */
export const evaluateProjectHealth = (input: HealthInput): ProjectHealth => {
  const { plannedMinutes, usedMinutes, progressPercent } = input;
  const burnPercent =
    plannedMinutes !== null && plannedMinutes > 0
      ? roundOne((usedMinutes / plannedMinutes) * 100)
      : null;
  const forecastMinutes =
    progressPercent !== null && progressPercent > 0
      ? Math.round((usedMinutes * 100) / progressPercent)
      : null;
  const warnings: ProjectWarningType[] = [];

  if (ACTIVE_STATUSES.includes(input.status)) {
    if (burnPercent !== null && burnPercent >= BURN_LIMIT_PERCENT) {
      warnings.push('BURN_LIMIT');
    } else if (burnPercent !== null && burnPercent >= BURN_WARN_PERCENT) {
      warnings.push('BURN_WARN');
    }

    if (
      burnPercent !== null &&
      progressPercent !== null &&
      burnPercent - progressPercent >= AHEAD_GAP_PERCENT
    ) {
      warnings.push('BURN_AHEAD');
    }

    if (input.today > input.plannedEnd) {
      warnings.push('OVERDUE');
    } else if (input.status === 'IN_PROGRESS' && progressPercent !== null) {
      // 일정 경과율: 예정 기간 중 오늘까지 지난 날의 비율 (시작 전이면 0)
      const total = countDays(input.plannedStart, input.plannedEnd);
      const elapsed =
        input.today < input.plannedStart ? 0 : countDays(input.plannedStart, input.today);
      const elapsedPercent = (Math.min(elapsed, total) / total) * 100;

      if (elapsedPercent - progressPercent >= AHEAD_GAP_PERCENT) {
        warnings.push('BEHIND_SCHEDULE');
      }
    }
  }

  return {
    plannedMinutes,
    usedMinutes,
    burnPercent,
    progressPercent,
    progressRecordedOn: input.progressRecordedOn,
    forecastMinutes,
    warnings,
  };
};
