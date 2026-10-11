/**
 * @description 금액을 "1,234,000원"으로 표시
 * @param amount 원 단위 금액
 */
export const formatWon = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;
