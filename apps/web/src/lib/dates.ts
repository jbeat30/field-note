const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @description 날짜(YYYY-MM-DD)에 일수를 더하거나 뺌 (시간대와 무관하게 날짜만 계산)
 * @param date 기준 날짜
 * @param days 더할 일수 (음수면 뺌)
 * @returns YYYY-MM-DD
 */
export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * @description 날짜를 "10월 7일 (수)"처럼 표시
 * @param date YYYY-MM-DD
 * @returns 화면 표시용 날짜
 */
export const formatDay = (date: string) => {
  const parsed = new Date(`${date}T00:00:00Z`);

  return `${parsed.getUTCMonth() + 1}월 ${parsed.getUTCDate()}일 (${WEEKDAYS[parsed.getUTCDay()]})`;
};
