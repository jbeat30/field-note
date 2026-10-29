import type { PayRateCreate } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const usePayRates = (employeeId: string) =>
  useQuery({
    queryKey: queryKeys.payRates(employeeId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/employees/{id}/pay-rates', {
        params: { path: { id: employeeId } },
      });

      if (!data) {
        throw new Error('[web.usePayRates] 단가 조회 실패');
      }

      return data.items;
    },
    // 단가는 민감 정보이므로 화면을 열 때마다가 아니라 필요할 때만 재조회
    staleTime: 60_000,
  });

// 단가표: 단가가 있는 직원마다 현재·이전·적용 예정 단가 (직원 목록·단가표 탭)
export const usePayRateSummaries = () =>
  useQuery({
    queryKey: queryKeys.payRateSummaries(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/pay-rates');

      if (!data) {
        throw new Error('[web.usePayRateSummaries] 단가표 조회 실패');
      }

      return data.items;
    },
    staleTime: 60_000,
  });

export const useAddPayRate = (employeeId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: '단가를 추가했습니다' },
    mutationFn: async (body: PayRateCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/employees/{id}/pay-rates', {
        params: { path: { id: employeeId } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useAddPayRate] 단가 추가 실패');
      }

      return data;
    },
    // 단가가 바뀌면 단가 목록과 모든 프로젝트의 인건비 변경
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['labor'] }),
  });
};

export const useLaborCost = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.laborCost(projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/labor-cost', {
        params: { path: { id: projectId } },
      });

      if (!data) {
        throw new Error('[web.useLaborCost] 인건비 조회 실패');
      }

      return data;
    },
    staleTime: 60_000,
  });
