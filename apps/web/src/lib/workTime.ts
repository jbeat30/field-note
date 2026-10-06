const MINUTES_PER_HOUR = 60;

/**
 * @description 분 → 시간 (설정 화면 표시용, 저장은 항상 분 단위)
 * @param minutes 분
 * @returns 시간
 */
export const minutesToHours = (minutes: number) => minutes / MINUTES_PER_HOUR;

/**
 * @description 시간 → 분 (소수 오차 없이 정수 분으로 저장)
 * @param hours 시간 (0.5 단위 입력 포함)
 * @returns 정수 분
 */
export const hoursToMinutes = (hours: number) => Math.round(hours * MINUTES_PER_HOUR);
