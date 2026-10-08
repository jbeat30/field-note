import { z } from 'zod';

import { materialRemaining, roundTo } from './workUnits';

// 사용 자재 관리 (서비스 기획서 §11). 가격·구매·발주·재고는 다루지 않고, 어떤 자재가 언제 얼마나 들어오고 쓰이고 나갔는지만 기록한다
export const MATERIAL_CATEGORIES = ['RAW', 'SUB', 'FINISH', 'CONSUMABLE'] as const;

export const materialCategorySchema = z.enum(MATERIAL_CATEGORIES);

export type MaterialCategory = z.infer<typeof materialCategorySchema>;

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  RAW: '원자재',
  SUB: '부자재',
  FINISH: '마감재',
  CONSUMABLE: '소모품',
};

// 기록 구분: 반입(현장에 들어옴) / 사용 / 반출(가져감·반납) / 폐기
export const MATERIAL_RECORD_KINDS = ['RECEIVED', 'USED', 'RETURNED', 'DISCARDED'] as const;

export const materialRecordKindSchema = z.enum(MATERIAL_RECORD_KINDS);

export type MaterialRecordKind = z.infer<typeof materialRecordKindSchema>;

export const MATERIAL_RECORD_KIND_LABELS: Record<MaterialRecordKind, string> = {
  RECEIVED: '반입',
  USED: '사용',
  RETURNED: '반출',
  DISCARDED: '폐기',
};

// 자주 쓰는 단위 (입력 도움용 제안값이며 직접 입력도 가능)
export const MATERIAL_UNIT_PRESETS = ['장', '개', 'm', '㎡', 'kg', '박스', '롤', '통'] as const;

export const MATERIAL_NAME_MAX_LENGTH = 50;
export const MATERIAL_SPEC_MAX_LENGTH = 50;
export const MATERIAL_UNIT_MAX_LENGTH = 10;
export const MATERIAL_MAX_PER_COMPANY = 2000;
export const MATERIAL_RECORD_AREA_MAX_LENGTH = 100;
export const MATERIAL_RECORD_SOURCE_MAX_LENGTH = 100;
export const MATERIAL_RECORD_MEMO_MAX_LENGTH = 500;
export const MATERIAL_RECORD_BATCH_MAX = 50;
export const MATERIAL_QUANTITY_MAX = 9_999_999.999;
export const MATERIAL_PAGE_DEFAULT_LIMIT = 50;
export const MATERIAL_PAGE_MAX_LIMIT = 100;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

// 같은 이름도 규격이 다르면 별도 자재이므로 이름·규격의 공백·대소문자 차이만 없앤 비교용 값을 쓴다
export const normalizeMaterialText = (value: string | null | undefined) =>
  (value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');

const nameSchema = z
  .string()
  .trim()
  .min(1, '자재명을 입력해 주세요')
  .max(MATERIAL_NAME_MAX_LENGTH, `자재명은 ${MATERIAL_NAME_MAX_LENGTH}자까지 입력할 수 있습니다`);

const specSchema = z
  .string()
  .trim()
  .min(1)
  .max(MATERIAL_SPEC_MAX_LENGTH, `규격은 ${MATERIAL_SPEC_MAX_LENGTH}자까지 입력할 수 있습니다`);

const unitSchema = z
  .string()
  .trim()
  .min(1, '단위를 입력해 주세요')
  .max(MATERIAL_UNIT_MAX_LENGTH, `단위는 ${MATERIAL_UNIT_MAX_LENGTH}자까지 입력할 수 있습니다`);

// 수량: 0보다 크고 소수 셋째 자리까지
export const quantitySchema = z
  .number()
  .positive('수량은 0보다 커야 합니다')
  .max(MATERIAL_QUANTITY_MAX, '수량이 너무 큽니다')
  .refine(
    (value) => Math.round(value * 1000) / 1000 === value,
    '수량은 소수 셋째 자리까지 입력할 수 있습니다',
  );

export const materialParamsSchema = z.object({ id: z.uuid() });

export const materialRecordParamsSchema = z.object({ id: z.uuid() });

// 즉석 추가: 이름과 단위만으로 만들 수 있다 (분류는 소모품으로 시작)
export const materialCreateSchema = z.object({
  name: nameSchema,
  spec: specSchema.optional(),
  unit: unitSchema,
  category: materialCategorySchema.default('CONSUMABLE'),
});

export type MaterialCreate = z.infer<typeof materialCreateSchema>;

// 단위는 기록이 있으면 바꿀 수 없다 (수량의 뜻이 달라지므로). 쓰지 않는 자재는 숨긴다
export const materialUpdateSchema = z
  .object({
    name: nameSchema,
    spec: specSchema.nullable(),
    unit: unitSchema,
    category: materialCategorySchema,
    isActive: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, '바꿀 값을 하나 이상 보내 주세요');

export type MaterialUpdate = z.infer<typeof materialUpdateSchema>;

export const materialListQuerySchema = z.object({
  q: z.string().trim().max(50).optional(),
  category: materialCategorySchema.optional(),
  // 숨긴 자재까지 볼 때
  includeInactive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type MaterialListQuery = z.infer<typeof materialListQuerySchema>;

export const materialSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  spec: z.string().nullable(),
  unit: z.string(),
  category: materialCategorySchema,
  isActive: z.boolean(),
  // 가장 최근에 기록한 날짜 (회사 전체 기준, 없으면 null). 최근 쓴 자재를 위에 보여 주는 기준
  lastUsedOn: dateSchema.nullable(),
});

export type Material = z.infer<typeof materialSchema>;

// 최근 쓴 자재가 먼저, 그다음 이름순 (서버와 목업이 같은 순서를 쓴다)
export const compareMaterials = (a: Material, b: Material) => {
  if (a.lastUsedOn !== b.lastUsedOn) {
    if (a.lastUsedOn === null) return 1;
    if (b.lastUsedOn === null) return -1;

    return b.lastUsedOn.localeCompare(a.lastUsedOn);
  }

  return (
    a.name.localeCompare(b.name, 'ko') ||
    (a.spec ?? '').localeCompare(b.spec ?? '', 'ko') ||
    a.id.localeCompare(b.id)
  );
};

export const materialsResponseSchema = z.object({ items: z.array(materialSchema) });

export type MaterialsResponse = z.infer<typeof materialsResponseSchema>;

const recordFields = {
  materialId: z.uuid(),
  recordDate: dateSchema,
  kind: materialRecordKindSchema,
  quantity: quantitySchema,
  // 사용한 작업 구분 (선택 목록의 작업 구분 항목)
  categoryId: z.uuid().optional(),
  area: z.string().trim().min(1).max(MATERIAL_RECORD_AREA_MAX_LENGTH).optional(),
  // 반입처·반출처: 명부의 업체 또는 직접 입력
  partnerId: z.uuid().optional(),
  sourceText: z.string().trim().min(1).max(MATERIAL_RECORD_SOURCE_MAX_LENGTH).optional(),
  // 변경·추가 작업, 사후 작업에 쓴 자재 표시
  isChange: z.boolean().default(false),
  isAfterService: z.boolean().default(false),
  memo: z.string().trim().min(1).max(MATERIAL_RECORD_MEMO_MAX_LENGTH).optional(),
};

export const materialRecordCreateSchema = z.object(recordFields);

export type MaterialRecordCreate = z.infer<typeof materialRecordCreateSchema>;

// 한 번에 여러 자재를 입력하는 목록형 입력: 한 건이라도 잘못되면 전부 저장하지 않는다
export const materialRecordBatchSchema = z.object({
  records: z.array(materialRecordCreateSchema).min(1).max(MATERIAL_RECORD_BATCH_MAX),
});

export type MaterialRecordBatch = z.infer<typeof materialRecordBatchSchema>;

export const materialRecordUpdateSchema = z
  .object({
    recordDate: recordFields.recordDate,
    kind: recordFields.kind,
    quantity: recordFields.quantity,
    categoryId: z.uuid().nullable(),
    area: recordFields.area.nullable(),
    partnerId: z.uuid().nullable(),
    sourceText: recordFields.sourceText.nullable(),
    isChange: z.boolean(),
    isAfterService: z.boolean(),
    memo: recordFields.memo.nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, '바꿀 값을 하나 이상 보내 주세요');

export type MaterialRecordUpdate = z.infer<typeof materialRecordUpdateSchema>;

export const materialRecordListQuerySchema = z.object({
  // 그날 작업일지 화면에서 쓰는 날짜 필터
  date: dateSchema.optional(),
  materialId: z.uuid().optional(),
  kind: materialRecordKindSchema.optional(),
  cursor: z.string().min(1).max(200).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MATERIAL_PAGE_MAX_LIMIT)
    .default(MATERIAL_PAGE_DEFAULT_LIMIT),
});

export type MaterialRecordListQuery = z.infer<typeof materialRecordListQuerySchema>;

export const materialRecordSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  materialId: z.uuid(),
  recordDate: dateSchema,
  kind: materialRecordKindSchema,
  quantity: z.number(),
  categoryId: z.uuid().nullable(),
  area: z.string().nullable(),
  partnerId: z.uuid().nullable(),
  sourceText: z.string().nullable(),
  isChange: z.boolean(),
  isAfterService: z.boolean(),
  memo: z.string().nullable(),
  createdBy: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type MaterialRecord = z.infer<typeof materialRecordSchema>;

export const materialRecordsResponseSchema = z.object({
  items: z.array(materialRecordSchema),
  nextCursor: z.string().nullable(),
});

export type MaterialRecordsResponse = z.infer<typeof materialRecordsResponseSchema>;

export const materialRecordBatchResponseSchema = z.object({
  items: z.array(materialRecordSchema),
});

// 프로젝트별 자재 현황: 자재마다 반입·사용·반출·폐기 합계와 잔량 (잔량 = 반입 − 사용 − 반출 − 폐기)
export const materialBalanceItemSchema = z.object({
  materialId: z.uuid(),
  name: z.string(),
  spec: z.string().nullable(),
  unit: z.string(),
  received: z.number(),
  used: z.number(),
  returned: z.number(),
  discarded: z.number(),
  remaining: z.number(),
  // 잔량이 마이너스면 반입 기록 누락일 수 있어 경고 (막지 않음)
  isNegative: z.boolean(),
  // 변경·추가 작업, 사후 작업에 쓴 양
  usedForChange: z.number(),
  usedForAfterService: z.number(),
});

export type MaterialBalanceItem = z.infer<typeof materialBalanceItemSchema>;

export const materialBalanceResponseSchema = z.object({
  items: z.array(materialBalanceItemSchema),
});

export type MaterialBalanceResponse = z.infer<typeof materialBalanceResponseSchema>;

type Totals = { received: number; used: number; returned: number; discarded: number };

/**
 * @description 기록 구분별 합계에서 잔량과 마이너스 경고를 계산 (서버와 목업이 함께 쓴다)
 * @param totals 구분별 수량 합계
 * @returns 잔량과 마이너스 여부
 */
export const balanceOf = (totals: Totals) => {
  const remaining = materialRemaining(totals);

  return { remaining, isNegative: remaining < 0 };
};

/**
 * @description 기록 목록을 자재별 현황으로 집계 (구분별 합계·잔량·변경/사후 사용량)
 * @param records 집계할 기록 (지운 기록은 미리 뺀 것)
 * @param materials 자재 정보를 찾을 목록
 * @returns 자재별 현황 (이름순)
 */
export const summarizeMaterialBalance = (
  records: readonly Pick<
    MaterialRecord,
    'materialId' | 'kind' | 'quantity' | 'isChange' | 'isAfterService'
  >[],
  materials: readonly Pick<Material, 'id' | 'name' | 'spec' | 'unit'>[],
): MaterialBalanceItem[] => {
  const byId = new Map<string, MaterialBalanceItem>();

  for (const record of records) {
    const material = materials.find((item) => item.id === record.materialId);

    if (!material) continue;

    const current =
      byId.get(record.materialId) ??
      ({
        materialId: material.id,
        name: material.name,
        spec: material.spec,
        unit: material.unit,
        received: 0,
        used: 0,
        returned: 0,
        discarded: 0,
        remaining: 0,
        isNegative: false,
        usedForChange: 0,
        usedForAfterService: 0,
      } satisfies MaterialBalanceItem);
    const field = {
      RECEIVED: 'received',
      USED: 'used',
      RETURNED: 'returned',
      DISCARDED: 'discarded',
    }[record.kind] as keyof Totals;

    current[field] = roundTo(current[field] + record.quantity, 6);

    if (record.kind === 'USED') {
      if (record.isChange)
        current.usedForChange = roundTo(current.usedForChange + record.quantity, 6);
      if (record.isAfterService)
        current.usedForAfterService = roundTo(current.usedForAfterService + record.quantity, 6);
    }

    byId.set(record.materialId, current);
  }

  return [...byId.values()]
    .map((item) => ({ ...item, ...balanceOf(item) }))
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'ko') || (a.spec ?? '').localeCompare(b.spec ?? '', 'ko'),
    );
};
