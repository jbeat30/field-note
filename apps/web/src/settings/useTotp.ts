import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 2단계 인증 상태 (설정 화면)
export const useTotpStatus = () =>
  useQuery({
    queryKey: queryKeys.totp(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/me/totp');

      if (!data) {
        throw new Error('[web.useTotpStatus] 2단계 인증 상태 조회 실패');
      }

      return data;
    },
  });
