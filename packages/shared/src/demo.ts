import { type CompanySettings, type LegalDocumentSummary, type LegalDocumentType } from './account';
import type { EmployeeStatus } from './employees';
import type { PartnerKind } from './partners';
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

export type DemoEmployee = {
  // 다시 실행해도 같은 직원이 되도록 고정한 식별자
  id: string;
  companyId: string;
  name: string;
  title?: string;
  // 선택 목록 항목의 이름 (식별자는 환경마다 달라 이름으로 연결)
  jobType?: string;
  workerType?: string;
  status: EmployeeStatus;
  hiredOn?: string;
  leftOn?: string;
  birthDate?: string;
  phone?: string;
  memo?: string;
};

const HANBIT = '0198d000-0000-7000-8000-0000000000a1';
const SAERON = '0198d000-0000-7000-8000-0000000000a2';
const employeeId = (n: number) => `0198d000-0000-7000-8000-0000000001${String(n).padStart(2, '0')}`;

// 가상의 인물과 번호만 사용한다 (연락처는 실제로 쓰이지 않는 0000 대역)
export const DEMO_EMPLOYEES: readonly DemoEmployee[] = [
  {
    id: employeeId(1),
    companyId: HANBIT,
    name: '정판금',
    title: '반장',
    jobType: '판금공',
    workerType: '정직원',
    status: 'ACTIVE',
    hiredOn: '2019-03-04',
    birthDate: '1978-04-12',
    phone: '010-0000-0001',
    memo: '절곡 가공 담당. 현장 설치 경험 많음',
  },
  {
    id: employeeId(2),
    companyId: HANBIT,
    name: '최설치',
    title: '기공',
    jobType: '설치공',
    workerType: '정직원',
    status: 'ACTIVE',
    hiredOn: '2021-06-14',
    birthDate: '1989-11-02',
    phone: '010-0000-0002',
  },
  {
    id: employeeId(3),
    companyId: HANBIT,
    name: '한용접',
    title: '기공',
    jobType: '용접공',
    workerType: '계약직',
    status: 'ACTIVE',
    hiredOn: '2023-02-20',
    birthDate: '1985-08-30',
    phone: '010-0000-0003',
    memo: '아르곤 용접 가능',
  },
  {
    id: employeeId(4),
    companyId: HANBIT,
    name: '오전기',
    jobType: '전기공',
    workerType: '협력(외부) 인력',
    status: 'ACTIVE',
  },
  {
    id: employeeId(5),
    companyId: HANBIT,
    name: '김일용',
    jobType: '보통인부',
    workerType: '일용',
    status: 'ACTIVE',
  },
  {
    id: employeeId(6),
    companyId: HANBIT,
    name: '이조공',
    title: '조공',
    jobType: '보통인부',
    workerType: '정직원',
    status: 'ON_LEAVE',
    hiredOn: '2022-09-01',
    birthDate: '1995-01-18',
    phone: '010-0000-0006',
    memo: '2026년 11월 복귀 예정',
  },
  {
    id: employeeId(7),
    companyId: HANBIT,
    name: '박퇴사',
    title: '기공',
    jobType: '목수',
    workerType: '정직원',
    status: 'LEFT',
    hiredOn: '2020-01-06',
    leftOn: '2026-08-31',
    birthDate: '1981-07-07',
    phone: '010-0000-0007',
  },
  {
    id: employeeId(8),
    companyId: HANBIT,
    name: '송소장',
    title: '소장',
    jobType: '현장소장',
    workerType: '정직원',
    status: 'ACTIVE',
    hiredOn: '2018-05-02',
    birthDate: '1972-12-25',
    phone: '010-0000-0008',
  },
  {
    id: employeeId(9),
    companyId: SAERON,
    name: '배전기',
    title: '반장',
    jobType: '전기공',
    workerType: '정직원',
    status: 'ACTIVE',
    hiredOn: '2020-10-12',
    birthDate: '1980-02-14',
    phone: '010-0000-0009',
  },
  {
    id: employeeId(10),
    companyId: SAERON,
    name: '노배선',
    jobType: '전기공',
    workerType: '계약직',
    status: 'ACTIVE',
    hiredOn: '2024-04-01',
  },
  {
    id: employeeId(11),
    companyId: SAERON,
    name: '유사무',
    jobType: '사무',
    workerType: '정직원',
    status: 'ACTIVE',
  },
];

export type DemoPartner = {
  id: string;
  companyId: string;
  kind: PartnerKind;
  name: string;
  contactName?: string;
  phone?: string;
  memo?: string;
  isActive?: boolean;
};

const partnerId = (n: number) => `0198d000-0000-7000-8000-0000000002${String(n).padStart(2, '0')}`;

// 가상의 업체와 담당자만 사용한다 (연락처는 실제로 쓰이지 않는 0000 대역)
export const DEMO_PARTNERS: readonly DemoPartner[] = [
  {
    id: partnerId(1),
    companyId: HANBIT,
    kind: 'CLIENT',
    name: '가나다건설',
    contactName: '윤소장',
    phone: '02-0000-0101',
    memo: '원청. 현장 출입증 사전 신청 필요',
  },
  {
    id: partnerId(2),
    companyId: HANBIT,
    kind: 'CLIENT',
    name: '미래오피스',
    contactName: '강과장',
    phone: '02-0000-0102',
  },
  {
    id: partnerId(3),
    companyId: HANBIT,
    kind: 'CLIENT',
    name: '옛날상가',
    contactName: '정사장',
    phone: '031-000-0103',
    memo: '2024년 공사 완료, 이후 거래 없음',
    isActive: false,
  },
  {
    id: partnerId(4),
    companyId: HANBIT,
    kind: 'SUBCONTRACTOR',
    name: '대성전기',
    contactName: '문반장',
    phone: '010-0000-0201',
    memo: '전기 배선 외주',
  },
  {
    id: partnerId(5),
    companyId: HANBIT,
    kind: 'SUBCONTRACTOR',
    name: '든든도장',
    contactName: '하사장',
    phone: '010-0000-0202',
  },
  {
    id: partnerId(6),
    companyId: HANBIT,
    kind: 'SUPPLIER',
    name: '대한철강',
    contactName: '김영업',
    phone: '02-0000-0301',
    memo: '아연도강판 납품, 주문 후 2일',
  },
  {
    id: partnerId(7),
    companyId: HANBIT,
    kind: 'SUPPLIER',
    name: '새한볼트',
    phone: '032-000-0302',
  },
  {
    id: partnerId(8),
    companyId: SAERON,
    kind: 'CLIENT',
    name: '푸른학교',
    contactName: '이행정',
    phone: '02-0000-0401',
  },
  {
    id: partnerId(9),
    companyId: SAERON,
    kind: 'SUPPLIER',
    name: '한빛전선',
    contactName: '조영업',
    phone: '02-0000-0402',
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
