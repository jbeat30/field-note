import type { CompanySettings, LegalDocumentSummary } from './account';

// 로컬 개발 전용 더미 데이터: 목업 서버(웹)와 DB 시드(api)가 같은 값을 쓰도록 한 곳에 둔다
// 운영 번들에 섞이지 않도록 `@field-note/shared/demo`로만 가져온다 (index에서 내보내지 않음)
// 실제 개인정보를 쓰지 않고 이메일은 example.com만 사용한다

export type DemoAccount = {
  companyId: string;
  userId: string;
  companyName: string;
  loginId: string;
  // 로컬 데모 전용 비밀번호 (운영과 무관)
  password: string;
  displayName: string;
  email: string;
  isEmailVerified: boolean;
  settings: CompanySettings;
};

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    companyId: '0198d000-0000-7000-8000-0000000000a1',
    userId: '0198d000-0000-7000-8000-0000000000b1',
    companyName: '한빛판금',
    loginId: 'hanbit',
    password: 'Hanbit-demo-2026!',
    displayName: '김한빛',
    email: 'hanbit@example.com',
    isEmailVerified: true,
    settings: { standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
  },
  {
    companyId: '0198d000-0000-7000-8000-0000000000a2',
    userId: '0198d000-0000-7000-8000-0000000000b2',
    companyName: '새론전기',
    loginId: 'saeron',
    password: 'Saeron-demo-2026!',
    displayName: '박새론',
    email: 'saeron@example.com',
    isEmailVerified: true,
    settings: { standardWorkMinutes: 540, monthlyWorkDays: 26, workUnitMode: 'HOURS' },
  },
  {
    // 가입은 했지만 이메일 인증 전인 계정: 로그인하면 인증 화면으로 이동
    companyId: '0198d000-0000-7000-8000-0000000000a3',
    userId: '0198d000-0000-7000-8000-0000000000b3',
    companyName: '다온목공',
    loginId: 'newbie',
    password: 'Newbie-demo-2026!',
    displayName: '이다온',
    email: 'newbie@example.com',
    isEmailVerified: false,
    settings: { standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
  },
];

export type DemoLegalDocument = LegalDocumentSummary & {
  effectiveAt: string;
  // 정식 본문 등록 전까지의 초안 문구 (동의 시점의 내용을 해시로 증명하는 용도)
  draftText: string;
};

export const DEMO_LEGAL_DOCUMENTS: readonly DemoLegalDocument[] = [
  {
    id: '0198c000-0000-7000-8000-000000000001',
    type: 'TERMS_OF_SERVICE',
    version: '2026-10-01',
    title: '이용약관',
    isRequired: true,
    path: '/legal/terms',
    effectiveAt: '2026-10-01T00:00:00.000Z',
    draftText: '이용약관 초안 (2026-10-01) — 정식 본문은 전문가 검토 후 등록',
  },
  {
    id: '0198c000-0000-7000-8000-000000000002',
    type: 'PRIVACY_POLICY',
    version: '2026-10-01',
    title: '개인정보 수집·이용 동의',
    isRequired: true,
    path: '/legal/privacy',
    effectiveAt: '2026-10-01T00:00:00.000Z',
    draftText: '개인정보 수집·이용 동의 초안 (2026-10-01) — 정식 본문은 전문가 검토 후 등록',
  },
  {
    id: '0198c000-0000-7000-8000-000000000003',
    type: 'MARKETING',
    version: '2026-10-01',
    title: '마케팅 정보 수신 동의 (선택)',
    isRequired: false,
    path: '/legal/marketing',
    effectiveAt: '2026-10-01T00:00:00.000Z',
    draftText: '마케팅 정보 수신 동의 초안 (2026-10-01) — 정식 본문은 전문가 검토 후 등록',
  },
];

// 초대 링크 가입 시연용 (운영자가 만든 초대를 흉내, 실제 초대는 P0-2에서 DB로 이동)
export const DEMO_INVITATION = {
  token: 'demo-invite-0001',
  companyName: '다온목공',
  adminName: '이다온',
  expiresInDays: 7,
};
