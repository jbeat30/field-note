import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 키가 'assignments'로 시작하므로 투입을 바꾸면 캘린더도 다시 읽는다
export const useStaffingCalendar = (from: string, to: string) =>
  useQuery({
    queryKey: queryKeys.staffingCalendar(from, to),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/staffing-calendar', {
        params: { query: { from, to } },
      });

      if (!data) {
        throw new Error('[web.useStaffingCalendar] 인력 배치 캘린더 조회 실패');
      }

      return data;
    },
    // 주를 넘기는 동안 이전 표를 유지해 화면이 깜빡이지 않게 함
    placeholderData: (previous) => previous,
  });
