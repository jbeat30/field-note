import type { EmployeeStatus } from './employees';

import { VALIDATION_MESSAGES } from './errorMessages';
// 직원 상태와 퇴사일 규칙 (서비스 기획서 §8.6), 서버와 목업 서버가 같은 규칙 사용
// - 퇴사 상태에는 퇴사일이 있고, 재직·휴직 상태에는 퇴사일이 없음 (DB도 같은 규칙을 검사)
// - 퇴사로 바꾸면서 날짜를 주지 않으면 오늘(서울 기준)로 채움
// - 재입사는 같은 카드를 재직·휴직으로 전환하는 것이며 퇴사일은 삭제

export type StatusResolution =
  { ok: true; status: EmployeeStatus; leftOn: string | null } | { ok: false; message: string };

/**
 * @description 서울 기준 오늘 날짜 (회사는 국내 현장이라 날짜 경계를 서울 시간으로 판단)
 * @param now 현재 시각
 * @returns YYYY-MM-DD
 */
export const todayInSeoul = (now: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

/**
 * @description 상태·퇴사일 변경 요청을 현재 값과 합쳐 최종 상태와 퇴사일을 정함
 * @param current 현재 상태와 퇴사일
 * @param input 요청의 상태·퇴사일 (보내지 않은 값은 undefined, 퇴사일을 지우려면 null)
 * @param today 서울 기준 오늘 날짜
 * @returns 최종 값 또는 거부 사유
 */
export const resolveEmployeeStatus = (
  current: { status: EmployeeStatus; leftOn: string | null },
  input: { status?: EmployeeStatus; leftOn?: string | null },
  today: string,
): StatusResolution => {
  const status = input.status ?? current.status;

  if (status === 'LEFT') {
    // 퇴사일을 지우는 요청은 퇴사 상태와 모순
    if (input.leftOn === null) {
      return { ok: false, message: VALIDATION_MESSAGES.RESIGN_DATE_REQUIRED };
    }

    return { ok: true, status, leftOn: input.leftOn ?? current.leftOn ?? today };
  }

  if (input.leftOn !== undefined && input.leftOn !== null) {
    return { ok: false, message: VALIDATION_MESSAGES.RESIGN_DATE_ONLY_RESIGNED };
  }

  return { ok: true, status, leftOn: null };
};
