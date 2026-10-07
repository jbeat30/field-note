// 해지 유예가 끝난 회사의 데이터를 어떻게 처리할지 테이블별로 정함 (서비스 기획서 §6.5, §13.3)
// - DELETE: 행을 삭제
// - ANONYMIZE: 행은 남기되 개인 식별 항목을 지움 (다른 기록이 이 행을 참조하므로)
// - KEEP: 개인정보 없이 보존 (동의 이력은 적법하게 동의받았다는 증빙, 운영자 작업 기록은 감사용, 해지 기록은 파기 증빙)
// 회사 범위 테이블을 새로 만들면 여기에 반드시 등록해야 한다 (스키마 검사 테스트가 누락을 잡음)
export const PURGE_POLICY = {
  companies: 'ANONYMIZE',
  users: 'ANONYMIZE',
  user_credentials: 'DELETE',
  sessions: 'DELETE',
  invitations: 'DELETE',
  email_verifications: 'DELETE',
  password_resets: 'DELETE',
  social_accounts: 'DELETE',
  company_settings: 'DELETE',
  projects: 'DELETE',
  project_trades: 'DELETE',
  project_code_sequences: 'DELETE',
  employees: 'DELETE',
  partners: 'DELETE',
  option_items: 'DELETE',
  consents: 'KEEP',
  operator_actions: 'KEEP',
  company_closures: 'KEEP',
} as const;

export type PurgePolicyTable = keyof typeof PURGE_POLICY;

// 익명화 후 남는 표시 이름 (원래 이름을 복원할 수 없음)
export const ANONYMIZED_USER_NAME = '(삭제된 계정)';
export const ANONYMIZED_COMPANY_NAME = '(삭제된 회사)';
