/**
 * @description 해지 삭제 예정 시각을 날짜로 표시 (예: 2026년 10월 20일)
 * @param iso ISO 시각
 * @returns 화면 표시용 날짜
 */
export const formatClosureDate = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(iso),
  );
