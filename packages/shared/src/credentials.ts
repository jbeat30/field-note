import { z } from 'zod';

import { fileStatusSchema } from './files';

// 직원 서류·자격 (서비스 기획서 §8.4): 자격증, 안전교육 이수증, 건강검진 서류 등을 직원 카드에 올리고 만료일 관리
// 종류는 회사가 관리하는 선택 목록(자격 종류)

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

// 만료 임박으로 보는 기간 (서비스 기획서 §15.3: 자격·서류 만료 30일 전)
export const CREDENTIAL_EXPIRING_DAYS = 30;

export const CREDENTIAL_MEMO_MAX_LENGTH = 500;

// 프로젝트 한 곳에 지정할 수 있는 필요 자격 수
export const REQUIRED_CREDENTIAL_MAX = 20;

export const CREDENTIAL_STATUSES = ['VALID', 'EXPIRING', 'EXPIRED'] as const;

export const credentialStatusSchema = z.enum(CREDENTIAL_STATUSES);

export type CredentialStatus = z.infer<typeof credentialStatusSchema>;

export const CREDENTIAL_STATUS_LABELS: Record<CredentialStatus, string> = {
  VALID: '유효',
  EXPIRING: '만료 임박',
  EXPIRED: '만료',
};

const DAY_MS = 24 * 60 * 60 * 1000;

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00.000Z`) / DAY_MS);

/**
 * @description 만료일까지 남은 일수 (오늘 만료면 0, 지났으면 음수)
 * @param expiresOn 만료일 (없으면 만료 없는 서류)
 * @param today 오늘 (서울 기준 날짜)
 * @returns 남은 일수 (만료일이 없으면 null)
 */
export const credentialDaysLeft = (expiresOn: string | null, today: string): number | null =>
  expiresOn === null ? null : dayNumber(expiresOn) - dayNumber(today);

/**
 * @description 서류 상태: 만료일이 오늘보다 앞이면 만료, 30일 안이면 만료 임박, 만료일이 없으면 유효
 * @param expiresOn 만료일 (없으면 만료 없는 서류)
 * @param today 오늘 (서울 기준 날짜)
 * @returns 서류 상태
 */
export const credentialStatus = (expiresOn: string | null, today: string): CredentialStatus => {
  const left = credentialDaysLeft(expiresOn, today);

  if (left === null) return 'VALID';
  if (left < 0) return 'EXPIRED';

  return left <= CREDENTIAL_EXPIRING_DAYS ? 'EXPIRING' : 'VALID';
};

export const credentialFileSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  contentType: z.string(),
  size: z.number().int(),
  status: fileStatusSchema,
});

export type CredentialFile = z.infer<typeof credentialFileSchema>;

export const employeeCredentialSchema = z.object({
  id: z.uuid(),
  employeeId: z.uuid(),
  typeId: z.uuid(),
  typeName: z.string(),
  issuedOn: dateSchema.nullable(),
  expiresOn: dateSchema.nullable(),
  // 서버가 오늘 기준으로 계산한 상태와 남은 일수
  status: credentialStatusSchema,
  daysLeft: z.number().int().nullable(),
  memo: z.string().nullable(),
  file: credentialFileSchema.nullable(),
  createdAt: z.iso.datetime(),
});

export type EmployeeCredential = z.infer<typeof employeeCredentialSchema>;

// 만료가 빠른 순 (만료일이 없는 서류는 맨 뒤)
export const employeeCredentialsResponseSchema = z.object({
  items: z.array(employeeCredentialSchema),
});

export type EmployeeCredentialsResponse = z.infer<typeof employeeCredentialsResponseSchema>;

export const credentialParamsSchema = z.object({ id: z.uuid(), credentialId: z.uuid() });

const memoSchema = z
  .string()
  .trim()
  .max(CREDENTIAL_MEMO_MAX_LENGTH, `메모는 ${CREDENTIAL_MEMO_MAX_LENGTH}자까지 입력할 수 있습니다`);

const refineDates = <T extends { issuedOn?: string | null; expiresOn?: string | null }>(value: T) =>
  !value.issuedOn || !value.expiresOn || value.issuedOn <= value.expiresOn;

const DATES_ORDER_MESSAGE = {
  message: '만료일은 취득일보다 빠를 수 없습니다',
  path: ['expiresOn'],
};

export const credentialCreateSchema = z
  .object({
    typeId: z.uuid('서류 종류를 선택해 주세요'),
    issuedOn: dateSchema.nullish(),
    expiresOn: dateSchema.nullish(),
    // 직원 서류로 올린 파일 (선택)
    fileId: z.uuid().nullish(),
    memo: memoSchema.nullish(),
  })
  .refine(refineDates, DATES_ORDER_MESSAGE);

export type CredentialCreate = z.infer<typeof credentialCreateSchema>;

// 수정: 종류·날짜·파일·메모, null로 보내면 값 삭제
export const credentialUpdateSchema = z
  .object({
    typeId: z.uuid(),
    issuedOn: dateSchema.nullable(),
    expiresOn: dateSchema.nullable(),
    fileId: z.uuid().nullable(),
    memo: memoSchema.nullable(),
  })
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: '변경할 값이 없습니다',
  })
  .refine(refineDates, DATES_ORDER_MESSAGE);

export type CredentialUpdate = z.infer<typeof credentialUpdateSchema>;

// 프로젝트의 필요 자격 (서비스 기획서 §10.1): 투입 배정 때 자격이 없거나 만료된 직원을 경고하는 기준
export const requiredCredentialsSchema = z.object({
  typeIds: z.array(z.uuid()).max(REQUIRED_CREDENTIAL_MAX),
});

export type RequiredCredentials = z.infer<typeof requiredCredentialsSchema>;

export const requiredCredentialsResponseSchema = z.object({
  items: z.array(z.object({ typeId: z.uuid(), typeName: z.string() })),
});

export type RequiredCredentialsResponse = z.infer<typeof requiredCredentialsResponseSchema>;

export const CREDENTIAL_GAP_REASONS = ['MISSING', 'EXPIRED', 'EXPIRES_DURING'] as const;

export const credentialGapReasonSchema = z.enum(CREDENTIAL_GAP_REASONS);

export type CredentialGapReason = z.infer<typeof credentialGapReasonSchema>;

export const CREDENTIAL_GAP_LABELS: Record<CredentialGapReason, string> = {
  MISSING: '자격 없음',
  EXPIRED: '자격 만료',
  EXPIRES_DURING: '투입 중 만료',
};

export type CredentialGap = {
  typeId: string;
  reason: CredentialGapReason;
  // 가장 늦은 만료일 (자격 없음이면 null)
  expiresOn: string | null;
};

type HeldCredential = { typeId: string; expiresOn: string | null };

/**
 * @description 필요 자격 대비 직원의 부족한 점을 찾는다. 투입 기간 끝까지 유효한 서류가 있으면 통과이고,
 * 서류가 없으면 자격 없음, 기간이 시작되기 전에 모두 만료면 자격 만료, 기간 중에 만료되면 투입 중 만료이다 (§8.4)
 * @param requiredTypeIds 프로젝트의 필요 자격 종류
 * @param held 직원의 (지우지 않은) 서류
 * @param period 투입 기간 (시작일·종료일)
 * @returns 부족한 자격 (없으면 빈 목록)
 */
export const findCredentialGaps = (
  requiredTypeIds: readonly string[],
  held: readonly HeldCredential[],
  period: { from: string; to: string },
): CredentialGap[] => {
  const gaps: CredentialGap[] = [];

  for (const typeId of requiredTypeIds) {
    const own = held.filter((item) => item.typeId === typeId);

    if (own.length === 0) {
      gaps.push({ typeId, reason: 'MISSING', expiresOn: null });
      continue;
    }

    if (own.some((item) => item.expiresOn === null || item.expiresOn >= period.to)) {
      continue;
    }

    const latest = own.map((item) => item.expiresOn!).reduce((a, b) => (a > b ? a : b));

    gaps.push({
      typeId,
      reason: latest >= period.from ? 'EXPIRES_DURING' : 'EXPIRED',
      expiresOn: latest,
    });
  }

  return gaps;
};

/**
 * @description 서류 목록을 만료가 빠른 순으로 정렬한다 (만료일이 없는 서류는 맨 뒤, 같으면 등록이 늦은 것이 뒤)
 * @param items 서류 목록
 * @returns 정렬한 새 목록
 */
export const sortCredentials = <T extends { expiresOn: string | null; createdAt: string }>(
  items: readonly T[],
): T[] =>
  [...items].sort((a, b) => {
    if (a.expiresOn !== b.expiresOn) {
      if (a.expiresOn === null) return 1;
      if (b.expiresOn === null) return -1;

      return a.expiresOn < b.expiresOn ? -1 : 1;
    }

    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  });
