import type { QueryClient } from '@tanstack/react-query';

import { resetClientState } from '../stores/resetClientState';

import { apiClient } from './client';

/**
 * @description 서버 세션 종료 후 브라우저에 남은 업무 상태 삭제
 * 서버 요청이 실패해도 화면에는 다른 회사 데이터가 남지 않도록 상태는 항상 비운다
 * @param queryClient 비울 React Query 클라이언트
 */
export const logout = async (queryClient: QueryClient) => {
  try {
    await apiClient.POST('/api/v1/auth/logout');
  } finally {
    await resetClientState(queryClient);
  }
};
