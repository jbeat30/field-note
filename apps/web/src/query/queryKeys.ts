// 쿼리 키는 [리소스, 범위, 조건] 형식으로 이 파일에서만 만든다
export const queryKeys = {
  health: () => ['health', 'all', {}] as const,
  session: () => ['session', 'current', {}] as const,
};
