import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 저장 용량 현황 (한도·사용량·용도별·프로젝트별)
export const useStorageUsage = () =>
  useQuery({
    queryKey: queryKeys.storageUsage(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/company/storage');

      if (!data) {
        throw new Error('[web.useStorageUsage] 저장 용량 조회 실패');
      }

      return data;
    },
  });
