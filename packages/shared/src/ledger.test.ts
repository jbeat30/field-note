import {
  compareLedgerEntries,
  ledgerEntryCreateSchema,
  ledgerEntryListQuerySchema,
  ledgerEntryUpdateSchema,
  summarizeLedger,
} from './ledger';

const CATEGORY_A = '0198d000-0000-7000-8000-0000000000a1';
const CATEGORY_B = '0198d000-0000-7000-8000-0000000000a2';

describe('summarizeLedger', () => {
  it('지출과 수입을 따로 더하고 분류별로 묶는다', () => {
    const summary = summarizeLedger([
      { kind: 'EXPENSE', categoryId: CATEGORY_A, amount: 10000 },
      { kind: 'EXPENSE', categoryId: CATEGORY_A, amount: 5000 },
      { kind: 'EXPENSE', categoryId: CATEGORY_B, amount: 20000 },
      { kind: 'EXPENSE', categoryId: null, amount: 700 },
      { kind: 'INCOME', categoryId: CATEGORY_A, amount: 90000 },
    ]);

    expect(summary).toMatchObject({ expenseTotal: 35700, incomeTotal: 90000, entryCount: 5 });
    // 지출 먼저, 같은 구분 안에서는 큰 금액 먼저
    expect(summary.byCategory).toEqual([
      { kind: 'EXPENSE', categoryId: CATEGORY_B, amount: 20000, count: 1 },
      { kind: 'EXPENSE', categoryId: CATEGORY_A, amount: 15000, count: 2 },
      { kind: 'EXPENSE', categoryId: null, amount: 700, count: 1 },
      { kind: 'INCOME', categoryId: CATEGORY_A, amount: 90000, count: 1 },
    ]);
  });

  it('기록이 없으면 모두 0이다', () => {
    expect(summarizeLedger([])).toEqual({
      expenseTotal: 0,
      incomeTotal: 0,
      entryCount: 0,
      byCategory: [],
    });
  });
});

describe('지출·수입 입력 규칙', () => {
  const base = { entryDate: '2026-10-05', kind: 'EXPENSE' as const };

  it('금액은 0보다 큰 원 단위 정수여야 한다', () => {
    expect(ledgerEntryCreateSchema.safeParse({ ...base, amount: 1000 }).success).toBe(true);

    for (const amount of [0, -5, 1.5, 10_000_000_001]) {
      expect(ledgerEntryCreateSchema.safeParse({ ...base, amount }).success).toBe(false);
    }
  });

  it('수정은 바꿀 값이 하나는 있어야 한다', () => {
    expect(ledgerEntryUpdateSchema.safeParse({}).success).toBe(false);
    expect(ledgerEntryUpdateSchema.safeParse({ categoryId: null }).success).toBe(true);
  });

  it('조회 기간의 시작일은 끝일보다 늦을 수 없다', () => {
    expect(
      ledgerEntryListQuerySchema.safeParse({ from: '2026-10-10', to: '2026-10-01' }).success,
    ).toBe(false);
    expect(ledgerEntryListQuerySchema.parse({}).limit).toBe(50);
  });
});

describe('compareLedgerEntries', () => {
  it('날짜가 최근인 것이 먼저, 같은 날이면 id가 큰 것이 먼저다', () => {
    const sorted = [
      { entryDate: '2026-10-01', id: 'a' },
      { entryDate: '2026-10-03', id: 'a' },
      { entryDate: '2026-10-03', id: 'b' },
    ].sort(compareLedgerEntries);

    expect(sorted.map((item) => `${item.entryDate}${item.id}`)).toEqual([
      '2026-10-03b',
      '2026-10-03a',
      '2026-10-01a',
    ]);
  });
});
