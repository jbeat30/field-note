import {
  burnRate,
  minutesToHours,
  minutesToManDays,
  roundTo,
  toManMonths,
  type CompanySettings,
} from '@field-note/shared';

/**
 * @description 공수(분)를 회사 설정에 맞춰 보여 줌. 비율 방식은 "21.0 MD (168시간)", 시간 방식은 "168시간 (21.0 MD)"
 * @param minutes 공수(분)
 * @param settings 회사 설정 (기준시간·표시 방식)
 */
export const formatWork = (minutes: number, settings: CompanySettings) => {
  const manDays = `${roundTo(minutesToManDays(minutes, settings.standardWorkMinutes), 1).toFixed(1)} MD`;
  const hours = `${roundTo(minutesToHours(minutes), 1)}시간`;

  return settings.workUnitMode === 'HOURS' ? `${hours} (${manDays})` : `${manDays} (${hours})`;
};

/**
 * @description MM(맨먼스)을 소수 둘째 자리까지 표시
 */
export const formatManMonths = (minutes: number, settings: CompanySettings) =>
  `${roundTo(toManMonths(minutesToManDays(minutes, settings.standardWorkMinutes), settings.monthlyWorkDays), 2).toFixed(2)} MM`;

/**
 * @description 공수 소진율(%) 표시. 계획이 없으면 "계획 없음"
 * @param actualMinutes 투입 공수(분)
 * @param plannedMinutes 계획 공수(분)
 */
export const formatBurnRate = (
  actualMinutes: number,
  plannedMinutes: number | null,
  settings: CompanySettings,
) => {
  if (plannedMinutes === null) {
    return '계획 없음';
  }

  const rate = burnRate(
    minutesToManDays(actualMinutes, settings.standardWorkMinutes),
    minutesToManDays(plannedMinutes, settings.standardWorkMinutes),
  );

  return rate === null ? '계획 없음' : `${Math.round(rate * 100)}%`;
};
