import { DEMO_LEGAL_DOCUMENTS } from '@field-note/shared/demo';

// 목업이 쓰는 더미 데이터의 단일 진입점 (DB 시드와 같은 원본)
export {
  DEMO_ACCOUNTS,
  DEMO_EMPLOYEES,
  DEMO_INVITATION,
  DEMO_PARTNERS,
} from '@field-note/shared/demo';

// 목업 응답에는 시드 전용 필드(본문 초안, 시행일)를 싣지 않고 화면에 필요한 요약만 사용
export const LEGAL_DOCUMENTS_FOR_MOCK = DEMO_LEGAL_DOCUMENTS.map((document) => ({
  id: document.id,
  type: document.type,
  version: document.version,
  title: document.title,
  isRequired: document.isRequired,
  path: document.path,
}));
