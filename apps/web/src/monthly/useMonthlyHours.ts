import type { MonthlyClose, MonthlyHours, MonthlyReopen } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useMonthlyHours = (month: string) =>
  useQuery({
    queryKey: queryKeys.monthlyHours(month),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/monthly-hours', {
        params: { query: { month } },
      });

      if (!data) {
        throw new Error('[web.useMonthlyHours] 월 공수표 조회 실패');
      }

      return data;
    },
  });

// 확정·재오픈은 변경된 월 공수표를 반환하므로 그 값을 바로 캐시에 반영하고, 작업 내역 목록·집계는 잠금 상태가 달라졌으므로 재조회
const useApplyMonthly = (month: string) => {
  const queryClient = useQueryClient();

  return async (data: MonthlyHours) => {
    queryClient.setQueryData(queryKeys.monthlyHours(month), data);
    await queryClient.invalidateQueries({ queryKey: ['work-logs'] });
  };
};

export const useCloseMonth = (month: string) => {
  const apply = useApplyMonthly(month);

  return useMutation({
    mutationFn: async (body: MonthlyClose) => {
      const { data, error } = await apiClient.POST('/api/v1/monthly-hours/close', { body });

      if (!data) {
        throw error ?? new Error('[web.useCloseMonth] 월 공수 확정 실패');
      }

      return data;
    },
    onSuccess: apply,
  });
};

export const useReopenMonth = (month: string) => {
  const apply = useApplyMonthly(month);

  return useMutation({
    mutationFn: async (body: MonthlyReopen) => {
      const { data, error } = await apiClient.POST('/api/v1/monthly-hours/reopen', { body });

      if (!data) {
        throw error ?? new Error('[web.useReopenMonth] 월 공수 재오픈 실패');
      }

      return data;
    },
    onSuccess: apply,
  });
};
