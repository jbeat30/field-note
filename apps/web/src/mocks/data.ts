import type {
  CompanySettings,
  Device,
  EmployeeDetail,
  LegalDocumentSummary,
  OptionItem,
  PartnerDetail,
  ProjectDetail,
} from '@field-note/shared';

import { DEMO_ACCOUNTS as SHARED_DEMO_ACCOUNTS, LEGAL_DOCUMENTS_FOR_MOCK } from './demoSource';

export type MockAccount = {
  // 더미 직원을 찾는 키 (데모 계정만 있고, 목업에서 새로 가입한 계정은 없음)
  companyId?: string;
  loginId: string;
  password: string;
  displayName: string;
  email: string;
  isEmailVerified: boolean;
  companyName: string;
  settings: CompanySettings;
  // 이메일 변경을 요청하고 코드 인증을 기다리는 새 주소
  pendingEmail?: string;
  // 연동한 가짜 카카오 계정 (MOCK_KAKAO_PROFILES의 key)
  kakaoProfileKey?: string;
  // false면 소셜 로그인만 쓰는 계정 (비밀번호 로그인 없음)
  hasPassword?: boolean;
  // 해지 요청 중이면 삭제 예정 시각 (ISO)
  closingPurgeAfter?: string;
  // 선택 목록(직종·작업 구분·공종·직원 구분). 처음 조회할 때 프리셋으로 채움 (서버와 같은 동작)
  options?: OptionItem[];
  // 직원 카드. 처음 조회할 때 더미 직원(DB 시드와 같은 원본)으로 채움
  employees?: EmployeeDetail[];
  // 고객·협력업체·자재 공급처 명부. 처음 조회할 때 더미 업체로 채움
  partners?: PartnerDetail[];
  // 프로젝트. 처음 조회할 때 더미 프로젝트로 채움
  projects?: ProjectDetail[];
};

// 더미 데이터는 DB 시드와 같은 원본(`@field-note/shared/demo`)을 사용
export const DEMO_ACCOUNTS: readonly MockAccount[] = SHARED_DEMO_ACCOUNTS.map((account) => ({
  companyId: account.companyId,
  loginId: account.loginId,
  password: account.password,
  displayName: account.displayName,
  email: account.email,
  isEmailVerified: account.isEmailVerified,
  companyName: account.companyName,
  settings: account.settings,
}));

export { DEMO_INVITATION } from './demoSource';

export const LEGAL_DOCUMENTS: readonly LegalDocumentSummary[] = LEGAL_DOCUMENTS_FOR_MOCK;

export const DEMO_DEVICES: readonly Omit<Device, 'isCurrent'>[] = [
  {
    id: 'device-current',
    label: 'Chrome · macOS',
    lastActiveAt: '2026-10-06T09:00:00.000Z',
  },
  { id: 'device-phone', label: 'Safari · iPhone', lastActiveAt: '2026-10-05T18:20:00.000Z' },
  { id: 'device-old', label: 'Chrome · Android', lastActiveAt: '2026-09-28T07:45:00.000Z' },
];

// 인증 코드와 시연용 특수 값 (README 목업 모드 표와 같아야 함)
export const MOCK_EMAIL_CODE = '123456';
// 비밀번호 재설정 링크 시연용 (`/reset-password/demo-reset-token-0001`), 한 번 쓰면 폐기
export const MOCK_RESET_TOKEN = 'demo-reset-token-0001';
// 해지 취소 링크 시연용 (`/closure/cancel/demo-closure-token-0001`), 해지를 요청한 뒤부터 유효하고 한 번 쓰면 폐기
export const MOCK_CLOSURE_TOKEN = 'demo-closure-token-0001';
export const MOCK_LOCKED_LOGIN_ID = 'locked';
export const MOCK_TAKEN_LOGIN_ID = 'taken-id';
export const MOCK_SESSION_STORAGE_KEY = 'field-note-mock-session';

// 목업 모드의 카카오 로그인 화면(`/mock-kakao`)에서 고르는 시연용 카카오 계정 (서버의 가짜 제공자와 같은 구성)
export const MOCK_KAKAO_PROFILES = [
  { key: 'hanbit', label: '한빛판금 관리자와 연동하는 계정', verifiedEmail: 'hanbit@example.com' },
  {
    key: 'new-verified',
    label: '이메일이 인증된 새 카카오 계정',
    verifiedEmail: 'kakao-new@example.com',
  },
  { key: 'new-unverified', label: '이메일이 인증되지 않은 새 카카오 계정', verifiedEmail: null },
  { key: 'other', label: '다른 새 카카오 계정', verifiedEmail: 'kakao-other@example.com' },
] as const;
