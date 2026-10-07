// 쿼리 키는 [리소스, 범위, 조건] 형식으로 이 파일에서만 만든다
export const queryKeys = {
  health: () => ['health', 'all', {}] as const,
  session: () => ['session', 'current', {}] as const,
  me: () => ['me', 'current', {}] as const,
  invitation: (token: string) => ['invitation', 'detail', { token }] as const,
  companySettings: () => ['company-settings', 'current', {}] as const,
  socialProviders: () => ['social-providers', 'all', {}] as const,
  socialMethods: () => ['social-methods', 'current', {}] as const,
  devices: () => ['devices', 'all', {}] as const,
  options: () => ['options', 'all', {}] as const,
  employees: (filter: object = {}) => ['employees', 'list', filter] as const,
  partners: (filter: object = {}) => ['partners', 'list', filter] as const,
  partner: (id: string) => ['partners', 'detail', { id }] as const,
  employee: (id: string) => ['employees', 'detail', { id }] as const,
};
