import { z } from 'zod';

import { countDays } from './staffing';
import { projectStatusSchema, type ProjectStatus } from './projects';
import { projectWarningTypeSchema, type ProjectWarningType } from './projectWarnings';

import { VALIDATION_MESSAGES } from './errorMessages';
// 일정과 진행 (서비스 기획서 §10.4): 진행률 기록, 공수 소진율, 경고
// 경고 기준의 기본값은 기획서 결정값(공수 소진율 80% / 100%)이고 회사가 설정에서 바꿈 (`companyRulesSchema`)
export const BURN_WARN_PERCENT = 80;

export const BURN_LIMIT_PERCENT = 100;

// 공수 소진율이 진행률보다 이만큼(%p) 이상 앞서면 경고, 일정 경과율보다 진행률이 이만큼 이상 뒤처져도 경고
export const AHEAD_GAP_PERCENT = 20;

export const PROGRESS_NOTE_MAX_LENGTH = 200;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

export const progressRecordCreateSchema = z.object({
  percent: z
    .number()
    .int(VALIDATION_MESSAGES.PROGRESS_NOT_INTEGER)
    .min(0, VALIDATION_MESSAGES.PROGRESS_MIN)
    .max(100, VALIDATION_MESSAGES.PROGRESS_MAX),
  // 비우면 서울 기준 오늘
  recordedOn: dateSchema.optional(),
  note: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.OMIT_TO_CLEAR_NOTE)
    .max(PROGRESS_NOTE_MAX_LENGTH, VALIDATION_MESSAGES.tooLong('메모', PROGRESS_NOTE_MAX_LENGTH))
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

export {
  PROJECT_WARNING_LABELS,
  PROJECT_WARNING_TYPES,
  projectWarningTypeSchema,
  type ProjectWarningType,
} from './projectWarnings';

export const projectHealthSchema = z.object({
  // 계획 공수(분): 취소하지 않은 투입의 계획 공수 합, 계획이 하나도 없으면 null
  plannedMinutes: z.number().int().nullable(),
  // 투입 공수(분): 저장된 작업 내역의 공수 합
  usedMinutes: z.number().int(),
  // 공수 소진율(%): 계획이 없으면 null
  burnPercent: z.number().nullable(),
  // 현재 진행률: 기록이 없으면 null
  progressPercent: z.number().int().nullable(),
  progressRecordedOn: dateSchema.nullable(),
  // 현재 속도로 끝낼 때 필요한 공수(분) = 투입 공수 ÷ 진행률, 진행률이 없거나 0이면 null
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
  // 회사별 경고 기준 (없으면 기본값)
  rules?: Pick<CompanyRules, 'burnWarnPercent' | 'burnLimitPercent' | 'aheadGapPercent'>;
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
 * @description 공수 소진율·예상 필요 공수·경고 계산
 * 예시(§10.4): 계획 80MD, 투입 56MD(소진율 70%), 진행률 45% → 예상 필요 공수 124MD, 소진율이 진행률보다 25%p 앞서 경고
 * @param input 상태·공수·진행률·예정 기간·오늘(서울 기준)
 * @returns 프로젝트 진행 점검 결과
 */
export const evaluateProjectHealth = (input: HealthInput): ProjectHealth => {
  const { plannedMinutes, usedMinutes, progressPercent } = input;
  const rules = input.rules ?? DEFAULT_COMPANY_RULES;
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
    if (burnPercent !== null && burnPercent >= rules.burnLimitPercent) {
      warnings.push('BURN_LIMIT');
    } else if (burnPercent !== null && burnPercent >= rules.burnWarnPercent) {
      warnings.push('BURN_WARN');
    }

    if (
      burnPercent !== null &&
      progressPercent !== null &&
      burnPercent - progressPercent >= rules.aheadGapPercent
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

      if (elapsedPercent - progressPercent >= rules.aheadGapPercent) {
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

// 회사별 경고 기준 (서비스 기획서 §10.4 "회사가 정한다"), 기본값은 기획서 결정값
export const companyRulesSchema = z
  .object({
    // 공수 소진율이 이 값(%) 이상이면 경고
    burnWarnPercent: z.number().int().min(50).max(150),
    // 공수 소진율이 이 값(%) 이상이면 한도 도달
    burnLimitPercent: z.number().int().min(60).max(200),
    // 소진율이 진행률보다(또는 진행률이 일정 경과율보다) 이만큼(%p) 앞서·뒤처지면 경고
    aheadGapPercent: z.number().int().min(5).max(60),
    // 보증 기간을 따로 정하지 않았을 때 쓰는 기본 개월 수 (0은 보증 없음)
    warrantyDefaultMonths: z.number().int().min(0).max(120),
  })
  .refine((value) => value.burnLimitPercent > value.burnWarnPercent, {
    message: VALIDATION_MESSAGES.HEALTH_LIMIT_NOT_ABOVE_WARNING,
    path: ['burnLimitPercent'],
  });

export type CompanyRules = z.infer<typeof companyRulesSchema>;

export const DEFAULT_COMPANY_RULES: CompanyRules = {
  burnWarnPercent: BURN_WARN_PERCENT,
  burnLimitPercent: BURN_LIMIT_PERCENT,
  aheadGapPercent: AHEAD_GAP_PERCENT,
  warrantyDefaultMonths: 12,
};
