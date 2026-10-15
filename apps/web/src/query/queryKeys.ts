// 쿼리 키는 [리소스, 범위, 조건] 형식으로 이 파일에서만 생성
export const queryKeys = {
  health: () => ['health', 'all', {}] as const,
  session: () => ['session', 'current', {}] as const,
  me: () => ['me', 'current', {}] as const,
  invitation: (token: string) => ['invitation', 'detail', { token }] as const,
  companySettings: () => ['company-settings', 'current', {}] as const,
  companyRules: () => ['company-settings', 'rules', {}] as const,
  storageUsage: () => ['company-settings', 'storage', {}] as const,
  socialProviders: () => ['social-providers', 'all', {}] as const,
  socialMethods: () => ['social-methods', 'current', {}] as const,
  devices: () => ['devices', 'all', {}] as const,
  options: () => ['options', 'all', {}] as const,
  employees: (filter: object = {}) => ['employees', 'list', filter] as const,
  partners: (filter: object = {}) => ['partners', 'list', filter] as const,
  partner: (id: string) => ['partners', 'detail', { id }] as const,
  projects: (filter: object = {}) => ['projects', 'list', filter] as const,
  project: (id: string) => ['projects', 'detail', { id }] as const,
  staffingCalendar: (from: string, to: string) =>
    ['assignments', 'staffing', { from, to }] as const,
  projectProgress: (projectId: string) => ['progress', 'list', { projectId }] as const,
  projectHealth: (projectId: string) => ['progress', 'health', { projectId }] as const,
  payRateSummaries: () => ['labor', 'pay-rate-summaries', {}] as const,
  payRates: (employeeId: string) => ['labor', 'pay-rates', { employeeId }] as const,
  laborCost: (projectId: string) => ['labor', 'cost', { projectId }] as const,
  changeWorks: (projectId: string, status?: string) =>
    ['change-works', 'list', { projectId, status }] as const,
  changeWork: (id: string) => ['change-works', 'detail', { id }] as const,
  changeUsage: (projectId: string) => ['change-works', 'usage', { projectId }] as const,
  auditLogs: (filter: object = {}) => ['audit', 'list', filter] as const,
  credentials: (employeeId: string) => ['credentials', 'list', { employeeId }] as const,
  requiredCredentials: (projectId: string) => ['credentials', 'required', { projectId }] as const,
  warranty: (projectId: string) => ['warranty', 'detail', { projectId }] as const,
  repairs: (projectId: string, status?: string) =>
    ['repairs', 'list', { projectId, status }] as const,
  repair: (id: string) => ['repairs', 'detail', { id }] as const,
  afterServiceUsage: (projectId: string) => ['repairs', 'usage', { projectId }] as const,
  monthlyHours: (month: string) => ['monthly', 'hours', { month }] as const,
  transitionNotices: (projectId: string, to: string) =>
    ['completion', 'notices', { projectId, to }] as const,
  projectSummary: (projectId: string) => ['completion', 'summary', { projectId }] as const,
  dashboard: () => ['dashboard', 'all', {}] as const,
  alertSettings: () => ['dashboard', 'alert-settings', {}] as const,
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
  employeeProjectDays: (projectId: string, employeeId: string, filter: object = {}) =>
    ['work-summary', 'employee-days', { projectId, employeeId, ...filter }] as const,
  employeeWorkHistory: (employeeId: string) =>
    ['work-summary', 'employee', { employeeId }] as const,
  projectPeriodHistory: (id: string) => ['project-period-history', 'all', { id }] as const,
  projectHistory: (id: string) => ['project-history', 'all', { id }] as const,
  photos: (projectId: string, filter: object = {}) =>
    ['photos', 'list', { projectId, ...filter }] as const,
  photo: (id: string) => ['photos', 'detail', { id }] as const,
  memos: (filter: object = {}) => ['memos', 'list', filter] as const,
  memoSummary: () => ['memos', 'summary', {}] as const,
  materials: (filter: object = {}) => ['materials', 'list', filter] as const,
  materialRecords: (projectId: string, filter: object = {}) =>
    ['materials', 'records', { projectId, ...filter }] as const,
  materialBalance: (projectId: string) => ['materials', 'balance', { projectId }] as const,
  ledgerEntries: (projectId: string, filter: object = {}) =>
    ['ledger', 'entries', { projectId, ...filter }] as const,
  ledgerSummary: (projectId: string, filter: object = {}) =>
    ['ledger', 'summary', { projectId, ...filter }] as const,
  documents: (projectId: string, filter: object = {}) =>
    ['documents', 'list', { projectId, ...filter }] as const,
  document: (id: string) => ['documents', 'detail', { id }] as const,
  documentAccessLogs: (id: string) => ['documents', 'access-logs', { id }] as const,
  search: (q: string, projectId?: string) => ['search', 'results', { q, projectId }] as const,
  dailyReport: (projectId: string, date: string) =>
    ['reports', 'daily', { projectId, date }] as const,
  employee: (id: string) => ['employees', 'detail', { id }] as const,
};
