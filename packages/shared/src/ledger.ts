import { z } from 'zod';

// 지출·수입 기록 (08 문서 §6): 프로젝트에서 나간 돈(부자재·장비·식대 등)과 가끔 생기는 수입(고철 판매, 현장 지원 등)만 적는다.
// 계약 금액·청구·입금 관리, 회계·세금·급여는 범위 밖이다
export const LEDGER_KINDS = ['EXPENSE', 'INCOME'] as const;

export const ledgerKindSchema = z.enum(LEDGER_KINDS);

export type LedgerKind = z.infer<typeof ledgerKindSchema>;

export const LEDGER_KIND_LABELS: Record<LedgerKind, string> = {
  EXPENSE: '지출',
  INCOME: '수입',
};

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

// 한 건 금액의 상한 (원): 잘못 눌러 0이 더 붙는 입력을 막는 안전 범위
export const LEDGER_AMOUNT_MAX = 10_000_000_000;
export const LEDGER_CONTENT_MAX_LENGTH = 200;
export const LEDGER_PAGE_DEFAULT_LIMIT = 50;
export const LEDGER_PAGE_MAX_LIMIT = 100;

export const ledgerAmountSchema = z
  .number('금액을 입력해 주세요')
  .int('금액은 원 단위 정수로 입력해 주세요')
  .min(1, '금액은 0보다 커야 합니다')
  .max(LEDGER_AMOUNT_MAX, '금액이 너무 큽니다');

const entryFields = {
  entryDate: dateSchema,
  kind: ledgerKindSchema,
  // 지출은 '지출 분류', 수입은 '수입 분류' 목록의 항목 (구분이 다르면 저장하지 않음)
  categoryId: z.uuid().optional(),
  amount: ledgerAmountSchema,
  // 거래처: 명부의 업체 (선택)
  partnerId: z.uuid().optional(),
  content: z.string().trim().min(1).max(LEDGER_CONTENT_MAX_LENGTH).optional(),
  // 증빙: 문서함의 문서 (영수증 사진·PDF)
  documentId: z.uuid().optional(),
  // 추가 공사 연결
  changeWorkId: z.uuid().optional(),
};

export const ledgerEntryCreateSchema = z.object(entryFields);

export type LedgerEntryCreate = z.infer<typeof ledgerEntryCreateSchema>;

export const ledgerEntryUpdateSchema = z
  .object({
    entryDate: entryFields.entryDate,
    kind: entryFields.kind,
    categoryId: z.uuid().nullable(),
    amount: entryFields.amount,
    partnerId: z.uuid().nullable(),
    content: entryFields.content.nullable(),
    documentId: z.uuid().nullable(),
    changeWorkId: z.uuid().nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, '바꿀 값을 하나 이상 보내 주세요');

export type LedgerEntryUpdate = z.infer<typeof ledgerEntryUpdateSchema>;

export const ledgerEntrySchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  entryDate: dateSchema,
  kind: ledgerKindSchema,
  categoryId: z.uuid().nullable(),
  amount: z.number().int(),
  partnerId: z.uuid().nullable(),
  content: z.string().nullable(),
  documentId: z.uuid().nullable(),
  changeWorkId: z.uuid().nullable(),
  createdBy: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

// 내역과 합계가 같은 조건으로 걸러지도록 필터는 한 모양을 쓴다
const filterFields = {
  kind: ledgerKindSchema.optional(),
  categoryId: z.uuid().optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
};

export const ledgerSummaryQuerySchema = z
  .object(filterFields)
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: '시작일은 끝일보다 늦을 수 없습니다',
    path: ['to'],
  });

export type LedgerSummaryQuery = z.infer<typeof ledgerSummaryQuerySchema>;

export const ledgerEntryListQuerySchema = z
  .object({
    ...filterFields,
    // 하루 기록 화면에서 쓰는 날짜 필터
    date: dateSchema.optional(),
    cursor: z.string().min(1).max(200).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(LEDGER_PAGE_MAX_LIMIT)
      .default(LEDGER_PAGE_DEFAULT_LIMIT),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: '시작일은 끝일보다 늦을 수 없습니다',
    path: ['to'],
  });

export type LedgerEntryListQuery = z.infer<typeof ledgerEntryListQuerySchema>;

export const ledgerEntriesResponseSchema = z.object({
  items: z.array(ledgerEntrySchema),
  nextCursor: z.string().nullable(),
});

export type LedgerEntriesResponse = z.infer<typeof ledgerEntriesResponseSchema>;

export const ledgerCategoryTotalSchema = z.object({
  kind: ledgerKindSchema,
  // 분류를 정하지 않은 기록은 null
  categoryId: z.uuid().nullable(),
  amount: z.number().int(),
  count: z.number().int(),
});

export type LedgerCategoryTotal = z.infer<typeof ledgerCategoryTotalSchema>;

export const ledgerSummarySchema = z.object({
  expenseTotal: z.number().int(),
  incomeTotal: z.number().int(),
  entryCount: z.number().int(),
  // 큰 금액 순
  byCategory: z.array(ledgerCategoryTotalSchema),
});

export type LedgerSummary = z.infer<typeof ledgerSummarySchema>;

export const ledgerEntryParamsSchema = z.object({ id: z.uuid() });

/**
 * @description 지출·수입 합계와 분류별 합계 (서버와 목업이 같은 규칙을 쓴다). 순수익이 아니라 두 합계를 따로 보여 준다
 * @param entries 합계를 낼 기록 (지운 기록은 미리 빼고 넘긴다)
 * @returns 지출 합계·수입 합계·건수·분류별 합계 (구분 순서: 지출 먼저, 같은 구분 안에서는 큰 금액 먼저)
 */
export const summarizeLedger = (
  entries: readonly Pick<LedgerEntry, 'kind' | 'categoryId' | 'amount'>[],
): LedgerSummary => {
  const groups = new Map<string, LedgerCategoryTotal>();
  let expenseTotal = 0;
  let incomeTotal = 0;

  for (const entry of entries) {
    if (entry.kind === 'EXPENSE') expenseTotal += entry.amount;
    else incomeTotal += entry.amount;

    const key = `${entry.kind}|${entry.categoryId ?? ''}`;
    const group = groups.get(key);

    if (group) {
      group.amount += entry.amount;
      group.count += 1;
    } else {
      groups.set(key, {
        kind: entry.kind,
        categoryId: entry.categoryId,
        amount: entry.amount,
        count: 1,
      });
    }
  }

  const byCategory = [...groups.values()].sort(
    (a, b) =>
      LEDGER_KINDS.indexOf(a.kind) - LEDGER_KINDS.indexOf(b.kind) ||
      b.amount - a.amount ||
      (a.categoryId ?? '').localeCompare(b.categoryId ?? ''),
  );

  return { expenseTotal, incomeTotal, entryCount: entries.length, byCategory };
};

/**
 * @description 내역을 날짜 최근순(같은 날이면 나중에 입력한 것이 먼저)으로 정렬하는 비교 함수
 * @param a 기록
 * @param b 기록
 * @returns 정렬 비교값
 */
export const compareLedgerEntries = (
  a: Pick<LedgerEntry, 'entryDate' | 'id'>,
  b: Pick<LedgerEntry, 'entryDate' | 'id'>,
) => b.entryDate.localeCompare(a.entryDate) || b.id.localeCompare(a.id);
