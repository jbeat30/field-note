import type { CompanySettings, Device, LegalDocumentSummary } from '@field-note/shared';

import { DEMO_ACCOUNTS as SHARED_DEMO_ACCOUNTS, LEGAL_DOCUMENTS_FOR_MOCK } from './demoSource';

export type MockAccount = {
  loginId: string;
  password: string;
  displayName: string;
  email: string;
  isEmailVerified: boolean;
  companyName: string;
  settings: CompanySettings;
};

// 더미 데이터는 DB 시드와 같은 원본(`@field-note/shared/demo`)을 사용
export const DEMO_ACCOUNTS: readonly MockAccount[] = SHARED_DEMO_ACCOUNTS.map((account) => ({
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
