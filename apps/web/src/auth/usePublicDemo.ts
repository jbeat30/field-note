import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 로그인 화면의 시연 계정 안내 (서버가 켠 경우에만 아이디·비밀번호가 내려옴, 조회에 실패하면 안내를 보이지 않음)
export const usePublicDemo = () =>
  useQuery({
    queryKey: queryKeys.publicDemo(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/public/demo');

      return data ?? { enabled: false };
    },
    staleTime: 5 * 60_000,
  });
