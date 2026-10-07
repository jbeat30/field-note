// 공수 계산 (서비스 기획서 §9.5, §10.4, §11). 프론트와 백엔드가 같은 함수를 쓴다
// 저장은 항상 분 단위 정수이고, 공수(MD)·MM·소진율은 표시와 집계 때 계산한다
// 그래서 기준시간이나 입력 방식을 나중에 바꿔도 과거 기록은 변하지 않는다

const MINUTES_PER_HOUR = 60;

const assertPositive = (value: number, name: string) => {
  if (!(value > 0)) {
    throw new RangeError(`[workUnits] ${name}은 0보다 커야 함 value=${value}`);
  }
};

/**
 * @description 시간을 정수 분으로 변환 (0.5시간 단위 입력의 소수 오차를 없앰)
 * @param hours 시간
 * @returns 정수 분
 */
export const hoursToMinutes = (hours: number) => Math.round(hours * MINUTES_PER_HOUR);

/**
 * @description 분을 시간으로 변환 (표시용)
 * @param minutes 분
 * @returns 시간
 */
export const minutesToHours = (minutes: number) => minutes / MINUTES_PER_HOUR;

/**
 * @description 공수(비율)를 저장용 분으로 환산 (1.5는 기준시간 8시간이면 720분)
 * @param manDays 공수 (1.0 = 하루)
 * @param standardMinutes 하루 기준시간(분)
 * @returns 정수 분
 * @throws 기준시간이 0 이하일 때
 */
export const manDaysToMinutes = (manDays: number, standardMinutes: number) => {
  assertPositive(standardMinutes, '기준시간');

  return Math.round(manDays * standardMinutes);
};

/**
 * @description 분을 공수(MD)로 환산: 투입 시간 ÷ 하루 기준시간
 * @param minutes 투입 시간(분)
 * @param standardMinutes 하루 기준시간(분)
 * @returns 공수 (1.0 = 하루)
 * @throws 기준시간이 0 이하일 때
 */
export const minutesToManDays = (minutes: number, standardMinutes: number) => {
  assertPositive(standardMinutes, '기준시간');

  return minutes / standardMinutes;
};

/**
 * @description 여러 기록의 분을 먼저 합산한 뒤 공수로 환산 (공수를 더하면 0.1 같은 값에서 오차가 쌓임)
 * @param minutesList 기록별 투입 시간(분)
 * @param standardMinutes 하루 기준시간(분)
 * @returns 합계 공수(MD)
 */
export const sumManDays = (minutesList: readonly number[], standardMinutes: number) =>
  minutesToManDays(
    minutesList.reduce((sum, minutes) => sum + minutes, 0),
    standardMinutes,
  );

/**
 * @description MD를 MM(맨먼스)으로 환산: MD ÷ 월 기준일수
 * @param manDays 공수(MD)
 * @param monthlyWorkDays 월 기준일수 (회사 설정, 예: 22)
 * @returns MM
 * @throws 월 기준일수가 0 이하일 때
 */
export const toManMonths = (manDays: number, monthlyWorkDays: number) => {
  assertPositive(monthlyWorkDays, '월 기준일수');

  return manDays / monthlyWorkDays;
};

/**
 * @description 공수 소진율: 투입 공수 ÷ 계획 공수 (계획이 없으면 계산하지 않음)
 * @param actualManDays 지금까지 투입한 공수
 * @param plannedManDays 계획 공수
 * @returns 소진율 (0.7 = 70%), 계획이 0 이하이면 null
 */
export const burnRate = (actualManDays: number, plannedManDays: number) =>
  plannedManDays > 0 ? actualManDays / plannedManDays : null;

/**
 * @description 현재 속도로 끝내려면 필요한 총 공수 추정: 투입 공수 ÷ 진행률
 * @param actualManDays 지금까지 투입한 공수
 * @param progress 진행률 (0.45 = 45%)
 * @returns 필요한 총 공수, 진행률이 0이면 추정할 수 없어 null
 * @throws 진행률이 0~1 범위를 벗어날 때
 */
export const estimateRequiredManDays = (actualManDays: number, progress: number) => {
  if (!(progress >= 0 && progress <= 1)) {
    throw new RangeError(`[workUnits] 진행률은 0~1 범위여야 함 value=${progress}`);
  }

  return progress > 0 ? actualManDays / progress : null;
};

/**
 * @description 지정한 소수 자리까지 반올림 (표시용, 계산 중간에는 쓰지 않음)
 * @param value 값
 * @param digits 소수 자리
 * @returns 반올림한 값
 */
export const roundTo = (value: number, digits: number) => {
  const factor = 10 ** digits;

  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/**
 * @description 자재 잔량: 반입 - 사용 - 반출 - 폐기. 음수가 되면 입력 오류를 알 수 있게 그대로 반환
 * @param quantities 자재 수량
 * @returns 잔량 (소수 오차는 6자리에서 정리)
 */
export const materialRemaining = (quantities: {
  received: number;
  used: number;
  returned: number;
  discarded: number;
}) =>
  roundTo(quantities.received - quantities.used - quantities.returned - quantities.discarded, 6);
