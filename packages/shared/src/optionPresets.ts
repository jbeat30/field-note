import type { OptionKind } from './options';

// 처음 채워 주는 프리셋 (의 예시), 회사가 자유롭게 변경
export const OPTION_PRESETS: Record<OptionKind, readonly string[]> = {
  JOB_TYPE: ['판금공', '설치공', '용접공', '전기공', '목수', '보통인부', '현장소장', '사무'],
  WORK_CATEGORY: ['생산·가공', '운반', '설치', '철거', '배선', '마감', '기타'],
  TRADE: ['판금', '인테리어', '전기', '설비', '기타'],
  WORKER_TYPE: ['정직원', '계약직', '일용', '협력(외부) 인력'],
  CREDENTIAL_TYPE: ['용접 기능사', '판금 기능사', '전기기능사', '안전교육 이수증', '건강검진'],
  EXPENSE_CATEGORY: ['부자재', '장비', '운반', '식대', '기타'],
  INCOME_CATEGORY: ['고철 판매', '현장 지원', '기타'],
};
