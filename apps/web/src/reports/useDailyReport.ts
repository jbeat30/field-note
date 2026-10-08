import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useDailyReport = (projectId: string, date: string) =>
  useQuery({
    queryKey: queryKeys.dailyReport(projectId, date),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{projectId}/daily-reports/{date}', {
        params: { path: { projectId, date } },
      });

      if (!data) {
        throw new Error('[web.useDailyReport] 작업일보 조회 실패');
      }

      return data;
    },
    enabled: Boolean(projectId && date),
    // 사진 주소가 5분 만료라 오래 두지 않고 열 때마다 새로 읽음
    staleTime: 0,
    gcTime: 60_000,
    // 사진 검사가 끝나지 않았으면 몇 초마다 다시 읽음 (끝내 처리되지 않는 사진 때문에 끝없이 읽지 않도록 20번까지)
    refetchInterval: (query) =>
      query.state.data?.photos.some((photo) => photo.isProcessing) &&
      query.state.dataUpdateCount < 20
        ? 3000
        : false,
  });
