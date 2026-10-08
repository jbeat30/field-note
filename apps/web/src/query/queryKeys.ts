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
  projects: (filter: object = {}) => ['projects', 'list', filter] as const,
  project: (id: string) => ['projects', 'detail', { id }] as const,
  assignments: (projectId: string, includeCancelled = false) =>
    ['assignments', 'all', { projectId, includeCancelled }] as const,
  workLogs: (projectId: string, filter: object = {}) =>
    ['work-logs', 'list', { projectId, ...filter }] as const,
  workLogRevisions: (projectId: string, workDate: string) =>
    ['work-log-revisions', 'all', { projectId, workDate }] as const,
  workLog: (projectId: string, workDate: string) =>
    ['work-logs', 'detail', { projectId, workDate }] as const,
  workSummary: (projectId: string, filter: object = {}) =>
    ['work-summary', 'detail', { projectId, ...filter }] as const,
  employeeWorkHistory: (employeeId: string) =>
    ['work-summary', 'employee', { employeeId }] as const,
  projectPeriodHistory: (id: string) => ['project-period-history', 'all', { id }] as const,
  projectHistory: (id: string) => ['project-history', 'all', { id }] as const,
  photos: (projectId: string, filter: object = {}) =>
    ['photos', 'list', { projectId, ...filter }] as const,
  photo: (id: string) => ['photos', 'detail', { id }] as const,
  employee: (id: string) => ['employees', 'detail', { id }] as const,
};
