import { type CompanySettings, type LegalDocumentSummary, type LegalDocumentType } from './account';
import { LEGAL_DOCUMENT_CONTENTS, legalDocumentText } from './legal';

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
  // 동의 시점의 내용을 해시로 증명하기 위한 본문 평문 (화면에 보이는 문서와 같은 원본)
  draftText: string;
};

// 시드가 DB에 넣는 약관 문서: 식별자만 고정하고 버전·본문은 실제 문서 원본(`legal.ts`)을 그대로 사용
const demoLegalDocument = (id: string, type: LegalDocumentType): DemoLegalDocument => {
  const content = LEGAL_DOCUMENT_CONTENTS[type];

  return {
    id,
    type,
    version: content.version,
    title: content.title,
    isRequired: content.isRequired,
    path: content.path,
    effectiveAt: content.effectiveAt,
    draftText: legalDocumentText(content),
  };
};

export const DEMO_LEGAL_DOCUMENTS: readonly DemoLegalDocument[] = [
  demoLegalDocument('0198c000-0000-7000-8000-000000000001', 'TERMS_OF_SERVICE'),
  demoLegalDocument('0198c000-0000-7000-8000-000000000002', 'PRIVACY_POLICY'),
  demoLegalDocument('0198c000-0000-7000-8000-000000000003', 'MARKETING'),
];

// 초대 링크 가입 시연용 (운영자가 만든 초대를 흉내)
export const DEMO_INVITATION = {
  // 시드가 같은 토큰의 해시를 DB에 넣어 실제 API에서도 같은 링크가 동작
  token: 'demo-invite-0001',
  companyId: '0198d000-0000-7000-8000-0000000000a4',
  userId: '0198d000-0000-7000-8000-0000000000b4',
  companyName: '미래설비',
  adminName: '최미래',
  expiresInDays: 7,
};
