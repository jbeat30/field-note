import { z } from 'zod';

// 회사가 직접 관리하는 선택 목록 (서비스 기획서 §8.2 직원 구분, §8.3 직종, §9.2 작업 구분, §10.2 공종)
// 입력하다가 막히지 않도록 처음에는 프리셋을 채워 주고, 이후 회사가 이름·순서·사용 여부를 바꾼다
export const OPTION_KINDS = ['JOB_TYPE', 'WORK_CATEGORY', 'TRADE', 'WORKER_TYPE'] as const;

export const optionKindSchema = z.enum(OPTION_KINDS);

export type OptionKind = z.infer<typeof optionKindSchema>;

export const OPTION_KIND_LABELS: Record<OptionKind, string> = {
  JOB_TYPE: '직종',
  WORK_CATEGORY: '작업 구분',
  TRADE: '공종',
  WORKER_TYPE: '직원 구분',
};

// 항목 이름 최대 길이와 종류별 최대 개수 (DB도 같은 값으로 검사)
export const OPTION_NAME_MAX_LENGTH = 30;
export const OPTION_MAX_PER_KIND = 100;

/**
 * @description 이름 중복 판정용 키: 공백·대소문자·유니코드 표기 차이를 없앤 값 ("판금 공"과 "판금  공"은 같은 이름)
 * @param name 항목 이름
 * @returns 비교용 키
 */
export const normalizeOptionName = (name: string) =>
  name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

export const optionNameSchema = z
  .string()
  .trim()
  .min(1, '이름을 입력해 주세요')
  .max(OPTION_NAME_MAX_LENGTH, `이름은 ${OPTION_NAME_MAX_LENGTH}자까지 입력할 수 있습니다`);

export const optionItemSchema = z.object({
  id: z.uuid(),
  kind: optionKindSchema,
  name: z.string(),
  // 쓰지 않는 항목은 삭제하지 않고 숨긴다 (이미 기록에 쓰인 이름이 사라지지 않게 함)
  isActive: z.boolean(),
});

export type OptionItem = z.infer<typeof optionItemSchema>;

// 종류 순서, 같은 종류 안에서는 회사가 정한 순서대로
export const optionsResponseSchema = z.object({ items: z.array(optionItemSchema) });

export type OptionsResponse = z.infer<typeof optionsResponseSchema>;

export const optionCreateSchema = z.object({ kind: optionKindSchema, name: optionNameSchema });

export type OptionCreate = z.infer<typeof optionCreateSchema>;

export const optionParamsSchema = z.object({ id: z.uuid() });

export const optionUpdateSchema = z
  .object({ name: optionNameSchema.optional(), isActive: z.boolean().optional() })
  .refine((value) => value.name !== undefined || value.isActive !== undefined, {
    message: '변경할 값이 없습니다',
  });

export type OptionUpdate = z.infer<typeof optionUpdateSchema>;

// 순서 변경: 해당 종류의 모든 항목(숨긴 것 포함)을 원하는 순서로 보냄
export const optionReorderSchema = z.object({
  kind: optionKindSchema,
  ids: z.array(z.uuid()).min(1).max(OPTION_MAX_PER_KIND),
});

export type OptionReorder = z.infer<typeof optionReorderSchema>;
