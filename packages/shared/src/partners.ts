import { z } from 'zod';

import { normalizeOptionName } from './options';

// 고객·협력업체·자재 공급처 명부 (서비스 기획서 §10.1). 금액·거래 내역은 다루지 않는다
export const PARTNER_KINDS = ['CLIENT', 'SUBCONTRACTOR', 'SUPPLIER'] as const;

export const partnerKindSchema = z.enum(PARTNER_KINDS);

export type PartnerKind = z.infer<typeof partnerKindSchema>;

export const PARTNER_KIND_LABELS: Record<PartnerKind, string> = {
  CLIENT: '고객',
  SUBCONTRACTOR: '협력업체',
  SUPPLIER: '자재 공급처',
};

export const PARTNER_KIND_HINTS: Record<PartnerKind, string> = {
  CLIENT: '발주처, 원청',
  SUBCONTRACTOR: '타 공종 팀, 외주',
  SUPPLIER: '자재를 사 오는 곳',
};

export const PARTNER_MAX_PER_COMPANY = 1000;
export const PARTNER_NAME_MAX_LENGTH = 50;
export const PARTNER_CONTACT_MAX_LENGTH = 30;
export const PARTNER_PHONE_MAX_LENGTH = 30;
export const PARTNER_MEMO_MAX_LENGTH = 1000;

// 상호 중복 판정용 키: 같은 구분 안에서 공백·대소문자·표기 차이만 다른 이름은 같은 업체로 본다
export const normalizePartnerName = normalizeOptionName;

export const partnerNameSchema = z
  .string()
  .trim()
  .min(1, '상호를 입력해 주세요')
  .max(PARTNER_NAME_MAX_LENGTH, `상호는 ${PARTNER_NAME_MAX_LENGTH}자까지 입력할 수 있습니다`);

const contactNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(
    PARTNER_CONTACT_MAX_LENGTH,
    `담당자는 ${PARTNER_CONTACT_MAX_LENGTH}자까지 입력할 수 있습니다`,
  );

// 숫자·하이픈·괄호·공백·+ 만 허용
const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(PARTNER_PHONE_MAX_LENGTH, `연락처는 ${PARTNER_PHONE_MAX_LENGTH}자까지 입력할 수 있습니다`)
  .regex(/^[0-9+\-() ]+$/, '연락처는 숫자와 - ( ) + 만 입력할 수 있습니다');

const memoSchema = z
  .string()
  .max(PARTNER_MEMO_MAX_LENGTH, `메모는 ${PARTNER_MEMO_MAX_LENGTH}자까지 입력할 수 있습니다`);

// 목록: 담당자 이름까지만 보여 주고 연락처·메모는 카드에서만 (제3자 정보를 목록에 늘어놓지 않음)
export const partnerSummarySchema = z.object({
  id: z.uuid(),
  kind: partnerKindSchema,
  name: z.string(),
  contactName: z.string().nullable(),
  // 쓰지 않는 업체는 삭제하지 않고 숨긴다 (프로젝트·자재 기록에 쓰인 상호가 사라지지 않게 함)
  isActive: z.boolean(),
});

export type PartnerSummary = z.infer<typeof partnerSummarySchema>;

export const partnerDetailSchema = partnerSummarySchema.extend({
  phone: z.string().nullable(),
  memo: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type PartnerDetail = z.infer<typeof partnerDetailSchema>;

export const partnersResponseSchema = z.object({ items: z.array(partnerSummarySchema) });

export type PartnersResponse = z.infer<typeof partnersResponseSchema>;

export const partnerListQuerySchema = z.object({
  kind: partnerKindSchema.optional(),
  // 상호·담당자 이름 검색 (부분 일치)
  q: z.string().trim().max(PARTNER_NAME_MAX_LENGTH).optional(),
});

export type PartnerListQuery = z.infer<typeof partnerListQuerySchema>;

export const partnerParamsSchema = z.object({ id: z.uuid() });

// 등록: 구분과 상호만 있으면 된다 (입력하다가 막히지 않게). 구분은 등록 뒤 바꿀 수 없다
export const partnerCreateSchema = z.object({
  kind: partnerKindSchema,
  name: partnerNameSchema,
  contactName: contactNameSchema.nullish(),
  phone: phoneSchema.nullish(),
  memo: memoSchema.nullish(),
});

export type PartnerCreate = z.infer<typeof partnerCreateSchema>;

export const partnerUpdateSchema = z
  .object({
    name: partnerNameSchema,
    contactName: contactNameSchema.nullable(),
    phone: phoneSchema.nullable(),
    memo: memoSchema.nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: '변경할 값이 없습니다',
  });

export type PartnerUpdate = z.infer<typeof partnerUpdateSchema>;
