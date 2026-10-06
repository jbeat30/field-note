import type { CompanySettings, Device, LegalDocumentSummary } from '@field-note/shared';

// 화면 확인용 더미 데이터. 실제 개인정보를 쓰지 않고 example.com 이메일만 사용

export type MockAccount = {
  loginId: string;
  password: string;
  displayName: string;
  email: string;
  isEmailVerified: boolean;
  companyName: string;
  settings: CompanySettings;
};

export const DEMO_ACCOUNTS: readonly MockAccount[] = [
  {
    loginId: 'hanbit',
    password: 'Hanbit-demo-2026!',
    displayName: '김한빛',
    email: 'hanbit@example.com',
    isEmailVerified: true,
    companyName: '한빛판금',
    settings: { standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
  },
  {
    loginId: 'saeron',
    password: 'Saeron-demo-2026!',
    displayName: '박새론',
    email: 'saeron@example.com',
    isEmailVerified: true,
    companyName: '새론전기',
    settings: { standardWorkMinutes: 540, monthlyWorkDays: 26, workUnitMode: 'HOURS' },
  },
];

// 초대 링크 가입 시연용 (운영자가 만든 초대를 흉내)
export const DEMO_INVITATION = {
  token: 'demo-invite-0001',
  companyName: '다온목공',
  adminName: '이다온',
  expiresInDays: 7,
};

export const LEGAL_DOCUMENTS: readonly LegalDocumentSummary[] = [
  {
    id: '0198c000-0000-7000-8000-000000000001',
    type: 'TERMS_OF_SERVICE',
    version: '2026-10-01',
    title: '이용약관',
    isRequired: true,
    path: '/legal/terms',
  },
  {
    id: '0198c000-0000-7000-8000-000000000002',
    type: 'PRIVACY_POLICY',
    version: '2026-10-01',
    title: '개인정보 수집·이용 동의',
    isRequired: true,
    path: '/legal/privacy',
  },
  {
    id: '0198c000-0000-7000-8000-000000000003',
    type: 'MARKETING',
    version: '2026-10-01',
    title: '마케팅 정보 수신 동의 (선택)',
    isRequired: false,
    path: '/legal/marketing',
  },
];

export const DEMO_DEVICES: readonly Omit<Device, 'isCurrent'>[] = [
  {
    id: 'device-current',
    label: '이 기기 (Chrome, macOS)',
    lastActiveAt: '2026-10-06T09:00:00.000Z',
  },
  { id: 'device-phone', label: 'iPhone (Safari)', lastActiveAt: '2026-10-05T18:20:00.000Z' },
  { id: 'device-old', label: 'Android (Chrome)', lastActiveAt: '2026-09-28T07:45:00.000Z' },
];

// 인증 코드와 시연용 특수 값 (README 목업 모드 표와 같아야 함)
export const MOCK_EMAIL_CODE = '123456';
export const MOCK_LOCKED_LOGIN_ID = 'locked';
export const MOCK_TAKEN_LOGIN_ID = 'taken-id';
export const MOCK_SESSION_STORAGE_KEY = 'field-note-mock-session';
