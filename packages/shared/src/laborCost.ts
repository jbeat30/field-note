import { z } from 'zod';

import type { CompanySettings } from './account';

// 직원 단가표와 프로젝트 인건비 추정 (회사가 정한 범위 확장, 개발 계획 §8 결정 005)
// 이 서비스는 급여를 계산하지 않는다. 단가표 금액과 기록된 공수로 "최소 얼마가 드는지"만 추정하며
// 4대보험·수당·퇴직금·세금은 포함하지 않는다

export const PAY_TYPES = ['DAILY', 'HOURLY', 'MONTHLY', 'ANNUAL'] as const;

export const payTypeSchema = z.enum(PAY_TYPES);

export type PayType = z.infer<typeof payTypeSchema>;

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  DAILY: '일급제',
  HOURLY: '시급제',
  MONTHLY: '월급제',
  ANNUAL: '연봉제',
};

// 금액 입력 칸 이름
export const PAY_AMOUNT_LABELS: Record<PayType, string> = {
  DAILY: '일급 (원)',
  HOURLY: '시급 (원)',
  MONTHLY: '월급 (원)',
  ANNUAL: '연봉 (원)',
};

export const PAY_AMOUNT_MAX = 1_000_000_000;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

export const payRateCreateSchema = z.object({
  payType: payTypeSchema,
  amount: z
    .number()
    .int('금액은 원 단위 정수여야 합니다')
    .min(1, '금액은 0보다 커야 합니다')
    .max(PAY_AMOUNT_MAX, '금액이 너무 큽니다'),
  // 이 날짜 근무분부터 적용 (과거 날짜도 가능: 늦게 알게 된 인상 반영)
  effectiveFrom: dateSchema,
});

export type PayRateCreate = z.infer<typeof payRateCreateSchema>;

export const payRateSchema = z.object({
  id: z.uuid(),
  payType: payTypeSchema,
  amount: z.number().int(),
  effectiveFrom: dateSchema,
  createdAt: z.iso.datetime(),
});

export type PayRate = z.infer<typeof payRateSchema>;

// 적용 시작일이 최근인 단가가 맨 앞 (같은 시작일이면 나중에 입력한 것이 먼저)
export const payRatesResponseSchema = z.object({ items: z.array(payRateSchema) });

export type PayRatesResponse = z.infer<typeof payRatesResponseSchema>;

type RateFor = { payType: PayType; amount: number };

type WorkUnits = Pick<CompanySettings, 'standardWorkMinutes' | 'monthlyWorkDays'>;

/**
 * @description 단가를 분당 금액으로 환산 (공수는 분 단위로 저장하므로 그대로 곱할 수 있다)
 * 일급제: 일급 ÷ 하루 기준시간, 시급제: 시급 ÷ 60, 월급제: 월급 ÷ (월 기준일수 × 하루 기준시간), 연봉제: 연봉 ÷ 12를 월급제와 같게
 * @param rate 단가 종류와 금액
 * @param units 하루 기준시간(분)·월 기준일수 (회사 설정)
 * @returns 분당 금액 (원, 소수)
 */
export const ratePerMinute = (rate: RateFor, units: WorkUnits) => {
  const monthMinutes = units.monthlyWorkDays * units.standardWorkMinutes;

  switch (rate.payType) {
    case 'DAILY':
      return rate.amount / units.standardWorkMinutes;
    case 'HOURLY':
      return rate.amount / 60;
    case 'MONTHLY':
      return rate.amount / monthMinutes;
    case 'ANNUAL':
      return rate.amount / 12 / monthMinutes;
  }
};

type DatedRate = RateFor & { effectiveFrom: string; createdAt: string };

/**
 * @description 그 날짜(근무일)에 적용되는 단가: 그 날짜까지 시작한 단가 중 가장 최근 시작일, 같은 시작일이면 나중에 입력한 것
 * 단가가 바뀌면 바뀐 날부터 새 단가가, 그 전 날짜는 이전 단가가 적용된다
 * @param rates 직원의 단가 기록 (순서 무관)
 * @param date 근무일
 * @returns 적용 단가, 그 날짜 이전에 시작한 단가가 없으면 null
 */
export const rateOn = <T extends DatedRate>(rates: readonly T[], date: string): T | null =>
  rates
    .filter((rate) => rate.effectiveFrom <= date)
    .reduce<T | null>(
      (best, rate) =>
        best === null ||
        rate.effectiveFrom > best.effectiveFrom ||
        (rate.effectiveFrom === best.effectiveFrom && rate.createdAt > best.createdAt)
          ? rate
          : best,
      null,
    );

export const laborCostEmployeeSchema = z.object({
  employeeId: z.uuid(),
  // 단가가 적용된 공수와 금액(원). 단가가 하나도 적용되지 않은 공수는 unpricedMinutes
  minutes: z.number().int(),
  unpricedMinutes: z.number().int(),
  amount: z.number().int(),
});

export type LaborCostEmployee = z.infer<typeof laborCostEmployeeSchema>;

export const laborCostSectionSchema = z.object({
  // 단가가 적용된 공수의 금액 합 (최소 추정)
  totalAmount: z.number().int(),
  totalMinutes: z.number().int(),
  // 단가가 없어 합계에서 빠진 공수 (단가표를 채우면 합계가 늘어난다)
  unpricedMinutes: z.number().int(),
  employees: z.array(laborCostEmployeeSchema),
});

export type LaborCostSection = z.infer<typeof laborCostSectionSchema>;

// 실제: 저장된 일지의 공수 × 근무일 단가. 계획: 투입의 계획 공수 × 오늘(투입 기간 안으로 맞춤)의 단가
export const laborCostSchema = z.object({
  actual: laborCostSectionSchema,
  planned: laborCostSectionSchema,
});

export type LaborCost = z.infer<typeof laborCostSchema>;

type CostItem = { employeeId: string; date: string; minutes: number };

/**
 * @description 공수 항목마다 그날 적용되는 단가로 금액을 계산해 직원별·전체로 합산한다
 * 단가가 없는 날의 공수는 금액 없이 따로 센다 (그래서 합계는 "최소")
 * @param items 직원·날짜·공수(분) 항목
 * @param ratesByEmployee 직원 ID별 단가 기록
 * @param units 하루 기준시간·월 기준일수
 * @returns 직원별·전체 인건비 (원 단위는 직원별로 반올림)
 */
export const summarizeLaborCost = (
  items: readonly CostItem[],
  ratesByEmployee: ReadonlyMap<string, readonly DatedRate[]>,
  units: WorkUnits,
): LaborCostSection => {
  const perEmployee = new Map<string, { minutes: number; unpriced: number; raw: number }>();

  for (const item of items) {
    const row = perEmployee.get(item.employeeId) ?? { minutes: 0, unpriced: 0, raw: 0 };
    const rate = rateOn(ratesByEmployee.get(item.employeeId) ?? [], item.date);

    if (rate) {
      row.minutes += item.minutes;
      row.raw += item.minutes * ratePerMinute(rate, units);
    } else {
      row.unpriced += item.minutes;
    }

    perEmployee.set(item.employeeId, row);
  }

  const employees = [...perEmployee.entries()]
    .map(([employeeId, row]) => ({
      employeeId,
      minutes: row.minutes,
      unpricedMinutes: row.unpriced,
      amount: Math.round(row.raw),
    }))
    .sort((a, b) => b.amount - a.amount || a.employeeId.localeCompare(b.employeeId));

  return {
    totalAmount: employees.reduce((sum, row) => sum + row.amount, 0),
    totalMinutes: employees.reduce((sum, row) => sum + row.minutes, 0),
    unpricedMinutes: employees.reduce((sum, row) => sum + row.unpricedMinutes, 0),
    employees,
  };
};
