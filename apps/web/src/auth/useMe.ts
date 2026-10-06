import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

/**
 * @description 로그인한 관리자 정보 조회 (로그인 전이면 data가 null)
 * 401은 오류가 아니라 "로그인 안 됨"이므로 null로 돌려 화면이 분기하게 함
 * @returns React Query 결과
 */
export const useMe = () =>
  useQuery({
    queryKey: queryKeys.me(),
    queryFn: async () => {
      const { data, response } = await apiClient.GET('/api/v1/me');

      if (response.status === 401) {
        return null;
      }

      if (!data) {
        throw new Error('[web.useMe] 내 정보 조회 실패');
      }

      return data;
    },
    // 로그인 상태는 자주 확인하되 화면 전환마다 깜빡이지 않게 함
    staleTime: 60_000,
    retry: false,
  });
