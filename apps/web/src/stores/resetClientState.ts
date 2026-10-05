import type { QueryClient } from '@tanstack/react-query';

import { resetDraftStore } from './draftStore';
import { resetUiStore } from './uiStore';

/**
 * @description 로그아웃·계정 전환 시 브라우저에 남은 모든 업무 상태 삭제 (다른 회사 데이터가 화면에 남지 않도록)
 * 상태 저장소를 추가하면 이 함수에 반드시 포함
 * @param queryClient 비울 React Query 클라이언트
 */
export const resetClientState = async (queryClient: QueryClient) => {
  queryClient.clear();
  resetUiStore();
  await resetDraftStore();
};
