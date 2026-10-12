import { z } from 'zod';

import type { RuleCheck } from './assignments';
import type { ProjectStatus } from './projects';

// 보증 기간과 보증서 (서비스 기획서 §10.6): 완료 후 일정 기간 무상으로 보수하는 약속을 프로젝트별로 관리한다.
// 종료 예정일은 시작일 + 보증 기간으로 계산하고, 고칠 때는 사유와 이력을 남긴다
export const DEFAULT_WARRANTY_MONTHS = 12;

export const WARRANTY_MONTHS_MAX = 120;

export const WARRANTY_REASON_MAX_LENGTH = 500;

export const WARRANTY_ISSUER_MAX_LENGTH = 100;

export const WARRANTY_START_BASES = ['ACTUAL_END', 'INSPECTION', 'MANUAL'] as const;

export const warrantyStartBasisSchema = z.enum(WARRANTY_START_BASES);

export type WarrantyStartBasis = z.infer<typeof warrantyStartBasisSchema>;

export const WARRANTY_START_BASIS_LABELS: Record<WarrantyStartBasis, string> = {
  ACTUAL_END: '실제 완료일',
  INSPECTION: '고객 검수일',
  MANUAL: '직접 지정',
};

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

const reasonSchema = z
  .string()
  .trim()
  .max(WARRANTY_REASON_MAX_LENGTH, `사유는 ${WARRANTY_REASON_MAX_LENGTH}자까지 입력할 수 있습니다`);

/**
 * @description 날짜에 개월 수를 더한다. 해당 달에 그 날이 없으면 말일로 맞춘다 (1월 31일 + 1개월 = 2월 28일)
 * @param date YYYY-MM-DD
 * @param months 더할 개월 수
 * @returns YYYY-MM-DD
 */
export const addMonths = (date: string, months: number) => {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();

  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-${String(
    Math.min(day, lastDay),
  ).padStart(2, '0')}`;
};

/**
 * @description 보증 종료 예정일: 시작일 + 보증 기간. 기간이 0이면 보증이 없으므로 시작일과 같다
 * @param startOn 보증 시작일
 * @param months 보증 기간(개월)
 * @returns 종료 예정일
 */
export const computeWarrantyEnd = (startOn: string, months: number) =>
  months === 0 ? startOn : addMonths(startOn, months);

/**
 * @description 종료 예정일까지 남은 일수 (이미 지났으면 음수, 오늘이 종료 예정일이면 0)
 * @param endOn 종료 예정일
 * @param today 오늘(서울 기준)
 * @returns 남은 일수
 */
export const warrantyDaysLeft = (endOn: string, today: string) =>
  Math.round((Date.parse(`${endOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

// 보증 설정·보증서 등록은 완료·보증 중에만 가능 (종료는 재오픈 뒤, 그 전 상태는 완료 뒤에)
export const warrantyProjectCheck = (status: ProjectStatus): RuleCheck => {
  if (status === 'COMPLETED' || status === 'WARRANTY') {
    return { ok: true };
  }

  return {
    ok: false,
    path: 'projectId',
    message:
      status === 'CLOSED'
        ? '종료된 프로젝트입니다. 재오픈한 뒤 보증을 바꿀 수 있습니다'
        : '프로젝트를 완료한 뒤에 보증을 설정할 수 있습니다',
  };
};

export const warrantyUpdateSchema = z.object({
  months: z
    .number()
    .int('보증 기간은 정수로 입력해 주세요')
    .min(0, '보증 기간은 0 이상이어야 합니다')
    .max(WARRANTY_MONTHS_MAX, `보증 기간은 ${WARRANTY_MONTHS_MAX}개월까지 입력할 수 있습니다`),
  startBasis: warrantyStartBasisSchema,
  // 실제 완료일 기준이면 쓰지 않는다 (프로젝트의 실제 완료일이 시작일)
  startOn: dateSchema.nullish(),
  // 계산된 종료 예정일을 직접 바꿀 때 (보증 연장 등, 사유 필수)
  endOn: dateSchema.nullish(),
  reason: reasonSchema.nullish(),
});

export type WarrantyUpdate = z.infer<typeof warrantyUpdateSchema>;

type UpdateCheckInput = {
  input: WarrantyUpdate;
  // 프로젝트의 실제 완료일 (완료 전이면 null)
  actualEnd: string | null;
  // 이미 저장된 보증 설정이 있는지 (있으면 바꿀 때 사유 필수)
  hasRecord: boolean;
};

export type WarrantyUpdateResult =
  | { ok: true; startOn: string; endOn: string; reason: string | null }
  | { ok: false; path: 'months' | 'startOn' | 'endOn' | 'reason'; message: string };

/**
 * @description 보증 설정 입력을 검사하고 시작일·종료 예정일을 확정한다.
 * 시작일은 실제 완료일 기준이면 프로젝트의 완료일, 아니면 입력값이다. 종료 예정일은 시작일 + 기간이고, 직접 바꾸면 사유가 필수다.
 * 이미 설정이 있으면 바꿀 때도 사유가 필수이다 (이력의 신뢰성)
 * @param params 입력, 프로젝트 실제 완료일, 기존 설정 여부
 * @returns 확정된 시작일·종료 예정일·사유 또는 어느 입력이 왜 안 되는지
 */
export const resolveWarrantyUpdate = ({
  input,
  actualEnd,
  hasRecord,
}: UpdateCheckInput): WarrantyUpdateResult => {
  const reason = input.reason?.trim() || null;
  const startOn = input.startBasis === 'ACTUAL_END' ? actualEnd : (input.startOn ?? null);

  if (!startOn) {
    return {
      ok: false,
      path: 'startOn',
      message:
        input.startBasis === 'ACTUAL_END'
          ? '실제 완료일이 없어 시작일을 정할 수 없습니다'
          : `${WARRANTY_START_BASIS_LABELS[input.startBasis]}을 입력해 주세요`,
    };
  }

  const overridden = input.months > 0 && input.endOn != null;
  const endOn =
    input.months === 0 ? startOn : (input.endOn ?? computeWarrantyEnd(startOn, input.months));

  if (endOn < startOn) {
    return { ok: false, path: 'endOn', message: '종료 예정일은 시작일보다 빠를 수 없습니다' };
  }

  if ((hasRecord || overridden) && !reason) {
    return {
      ok: false,
      path: 'reason',
      message: overridden
        ? '종료 예정일을 직접 바꾸는 사유를 입력해 주세요'
        : '변경 사유를 입력해 주세요',
    };
  }

  return { ok: true, startOn, endOn, reason };
};

export const warrantyCertificateCreateSchema = z.object({
  // 문서함에 올린 보증서 (같은 프로젝트의 문서)
  documentId: z.uuid(),
  expiresOn: dateSchema,
  issuer: z
    .string()
    .trim()
    .max(
      WARRANTY_ISSUER_MAX_LENGTH,
      `발급처는 ${WARRANTY_ISSUER_MAX_LENGTH}자까지 입력할 수 있습니다`,
    )
    .nullish(),
});

export type WarrantyCertificateCreate = z.infer<typeof warrantyCertificateCreateSchema>;

export const warrantyCertificateUpdateSchema = warrantyCertificateCreateSchema
  .omit({ documentId: true })
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: '변경할 값이 없습니다',
  });

export type WarrantyCertificateUpdate = z.infer<typeof warrantyCertificateUpdateSchema>;

export const warrantyCertificateParamsSchema = z.object({
  id: z.uuid(),
  certificateId: z.uuid(),
});

export const warrantyCertificateSchema = z.object({
  id: z.uuid(),
  documentId: z.uuid(),
  title: z.string(),
  isSensitive: z.boolean(),
  issuer: z.string().nullable(),
  expiresOn: dateSchema,
  // 만료까지 남은 일수 (지났으면 음수)
  daysLeft: z.number().int(),
  createdAt: z.iso.datetime(),
});

export type WarrantyCertificate = z.infer<typeof warrantyCertificateSchema>;

export const warrantyChangeSchema = z.object({
  id: z.uuid(),
  // 처음 설정이면 null
  fromMonths: z.number().int().nullable(),
  toMonths: z.number().int(),
  fromEndOn: dateSchema.nullable(),
  toEndOn: dateSchema,
  startBasis: warrantyStartBasisSchema,
  startOn: dateSchema,
  reason: z.string().nullable(),
  changedAt: z.iso.datetime(),
});

export type WarrantyChange = z.infer<typeof warrantyChangeSchema>;

export const projectWarrantySchema = z.object({
  // 저장된 설정이 있는지. 없으면 기본 기간(12개월)과 실제 완료일로 계산한 값을 미리 보여 준다
  configured: z.boolean(),
  months: z.number().int(),
  startBasis: warrantyStartBasisSchema,
  startOn: dateSchema.nullable(),
  endOn: dateSchema.nullable(),
  defaultMonths: z.number().int(),
  // 종료 예정일까지 남은 일수 (종료 예정일이 없으면 null)
  daysLeft: z.number().int().nullable(),
  // 등록한 보증서 (만료일이 빠른 것이 먼저)
  certificates: z.array(warrantyCertificateSchema),
  // 최근 변경이 맨 앞
  changes: z.array(warrantyChangeSchema),
});

export type ProjectWarranty = z.infer<typeof projectWarrantySchema>;
