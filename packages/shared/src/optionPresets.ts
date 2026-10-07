import type { OptionKind } from './options';

// 처음 채워 주는 프리셋 (서비스 기획서 §8.2, §8.3, §9.2, §10.2의 예시). 회사가 자유롭게 바꾼다
export const OPTION_PRESETS: Record<OptionKind, readonly string[]> = {
  JOB_TYPE: ['판금공', '설치공', '용접공', '전기공', '목수', '보통인부', '현장소장', '사무'],
  WORK_CATEGORY: ['생산·가공', '운반', '설치', '철거', '배선', '마감', '기타'],
  TRADE: ['판금', '인테리어', '전기', '설비', '기타'],
  WORKER_TYPE: ['정직원', '계약직', '일용', '협력(외부) 인력'],
};
