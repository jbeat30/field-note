import {
  payRateCreateSchema,
  ratePerMinute,
  rateOn,
  summarizeLaborCost,
  type PayType,
} from './laborCost';

const UNITS = { standardWorkMinutes: 480, monthlyWorkDays: 22 };
const E1 = '0198d000-0000-7000-8000-000000000001';
const E2 = '0198d000-0000-7000-8000-000000000002';

const rate = (
  payType: PayType,
  amount: number,
  effectiveFrom: string,
  createdAt = `${effectiveFrom}T00:00:00.000Z`,
) => ({
  payType,
  amount,
  effectiveFrom,
  createdAt,
});

describe('ratePerMinute', () => {
  it('일급제는 하루 기준시간으로 나눈다 (일급 24만원 → 8시간이면 시간당 3만원)', () => {
    expect(ratePerMinute({ payType: 'DAILY', amount: 240_000 }, UNITS) * 60).toBeCloseTo(30_000);
  });

  it('시급제는 60분으로 나눈다', () => {
    expect(ratePerMinute({ payType: 'HOURLY', amount: 12_000 }, UNITS) * 60).toBeCloseTo(12_000);
  });

  it('월급제는 월 기준일수 × 하루 기준시간으로 나눈다 (월급 440만원 → 22일이면 일 20만원)', () => {
    expect(ratePerMinute({ payType: 'MONTHLY', amount: 4_400_000 }, UNITS) * 480).toBeCloseTo(
      200_000,
    );
  });

  it('연봉제는 12로 나눠 월급제와 같게 본다 (연봉 5,280만원 → 월 440만원 → 일 20만원)', () => {
    expect(ratePerMinute({ payType: 'ANNUAL', amount: 52_800_000 }, UNITS) * 480).toBeCloseTo(
      200_000,
    );
  });

  it('회사 기준시간·월 기준일수 설정을 따른다', () => {
    expect(
      ratePerMinute(
        { payType: 'DAILY', amount: 200_000 },
        { standardWorkMinutes: 600, monthlyWorkDays: 26 },
      ) * 600,
    ).toBeCloseTo(200_000);
    expect(
      ratePerMinute(
        { payType: 'MONTHLY', amount: 2_600_000 },
        { standardWorkMinutes: 600, monthlyWorkDays: 26 },
      ) * 600,
    ).toBeCloseTo(100_000);
  });
});

describe('rateOn', () => {
  const rates = [
    rate('DAILY', 200_000, '2026-01-01'),
    rate('DAILY', 250_000, '2026-10-11'),
    rate('DAILY', 220_000, '2026-06-01'),
  ];

  it('단가가 바뀐 날부터 새 단가, 그 전 날짜는 이전 단가', () => {
    expect(rateOn(rates, '2026-10-10')!.amount).toBe(220_000);
    expect(rateOn(rates, '2026-10-11')!.amount).toBe(250_000);
    expect(rateOn(rates, '2026-12-31')!.amount).toBe(250_000);
    expect(rateOn(rates, '2026-03-01')!.amount).toBe(200_000);
  });

  it('첫 단가 이전 날짜에는 적용 단가가 없다', () => {
    expect(rateOn(rates, '2025-12-31')).toBeNull();
    expect(rateOn([], '2026-10-10')).toBeNull();
  });

  it('같은 시작일이면 나중에 입력한 단가가 이긴다 (잘못 입력한 단가를 새로 정정)', () => {
    const fixed = [
      rate('DAILY', 200_000, '2026-01-01', '2026-01-01T09:00:00.000Z'),
      rate('DAILY', 210_000, '2026-01-01', '2026-01-02T09:00:00.000Z'),
    ];

    expect(rateOn(fixed, '2026-05-05')!.amount).toBe(210_000);
  });

  it('입력 순서와 상관없다', () => {
    expect(rateOn([...rates].reverse(), '2026-10-11')!.amount).toBe(250_000);
  });
});

describe('summarizeLaborCost', () => {
  it('단가가 중간에 바뀌면 바뀐 날부터 새 단가로 계산한다 (이전 일급 20만원 하루 + 이후 25만원 하루 = 45만원)', () => {
    const rates = new Map([
      [E1, [rate('DAILY', 200_000, '2026-01-01'), rate('DAILY', 250_000, '2026-10-11')]],
    ]);
    const result = summarizeLaborCost(
      [
        { employeeId: E1, date: '2026-10-10', minutes: 480 },
        { employeeId: E1, date: '2026-10-11', minutes: 480 },
      ],
      rates,
      UNITS,
    );

    expect(result).toMatchObject({ totalAmount: 450_000, totalMinutes: 960, unpricedMinutes: 0 });
  });

  it('시급제 4시간 + 일급제 1일을 직원별로 합산하고 금액 큰 순으로 정렬한다', () => {
    const rates = new Map([
      [E1, [rate('HOURLY', 15_000, '2026-01-01')]],
      [E2, [rate('DAILY', 200_000, '2026-01-01')]],
    ]);
    const result = summarizeLaborCost(
      [
        { employeeId: E1, date: '2026-10-05', minutes: 240 },
        { employeeId: E2, date: '2026-10-05', minutes: 480 },
      ],
      rates,
      UNITS,
    );

    expect(result.employees).toEqual([
      { employeeId: E2, minutes: 480, unpricedMinutes: 0, amount: 200_000 },
      { employeeId: E1, minutes: 240, unpricedMinutes: 0, amount: 60_000 },
    ]);
    expect(result.totalAmount).toBe(260_000);
  });

  it('단가가 없는 직원·날짜의 공수는 금액 없이 따로 센다 (합계는 최소 추정)', () => {
    const rates = new Map([[E1, [rate('DAILY', 200_000, '2026-10-06')]]]);
    const result = summarizeLaborCost(
      [
        { employeeId: E1, date: '2026-10-05', minutes: 480 },
        { employeeId: E1, date: '2026-10-06', minutes: 480 },
        { employeeId: E2, date: '2026-10-06', minutes: 240 },
      ],
      rates,
      UNITS,
    );

    expect(result).toMatchObject({ totalAmount: 200_000, totalMinutes: 480, unpricedMinutes: 720 });
    expect(result.employees.find((row) => row.employeeId === E2)).toMatchObject({
      amount: 0,
      unpricedMinutes: 240,
    });
  });

  it('원 단위는 직원별 합계에서 한 번만 반올림한다', () => {
    const rates = new Map([[E1, [rate('MONTHLY', 3_000_000, '2026-01-01')]]]);
    const items = Array.from({ length: 3 }, () => ({
      employeeId: E1,
      date: '2026-10-05',
      minutes: 100,
    }));

    // 분당 3,000,000 / 10,560 ≈ 284.0909, 300분 → 85,227.27
    expect(summarizeLaborCost(items, rates, UNITS).totalAmount).toBe(85_227);
  });

  it('항목이 없으면 모두 0이다', () => {
    expect(summarizeLaborCost([], new Map(), UNITS)).toEqual({
      totalAmount: 0,
      totalMinutes: 0,
      unpricedMinutes: 0,
      employees: [],
    });
  });
});

describe('payRateCreateSchema', () => {
  it('종류·원 단위 정수 금액·적용일을 검사한다', () => {
    const ok = { payType: 'DAILY', amount: 200_000, effectiveFrom: '2026-10-11' };

    expect(payRateCreateSchema.safeParse(ok).success).toBe(true);
    expect(payRateCreateSchema.safeParse({ ...ok, payType: 'WEEKLY' }).success).toBe(false);
    expect(payRateCreateSchema.safeParse({ ...ok, amount: 0 }).success).toBe(false);
    expect(payRateCreateSchema.safeParse({ ...ok, amount: 1.5 }).success).toBe(false);
    expect(payRateCreateSchema.safeParse({ ...ok, amount: 1_000_000_001 }).success).toBe(false);
    expect(payRateCreateSchema.safeParse({ ...ok, effectiveFrom: '2026-13-01' }).success).toBe(
      false,
    );
  });
});
