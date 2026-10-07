import type { WorkSummaryQuery } from '@field-note/shared';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useWorkSummary = (projectId: string, query: WorkSummaryQuery) =>
  useQuery({
    queryKey: queryKeys.workSummary(projectId, query),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/work-summary', {
        params: { path: { id: projectId }, query },
      });

      if (!data) {
        throw new Error('[web.useWorkSummary] 공수 집계 조회 실패');
      }

      return data;
    },
    // 기간·단위를 바꾸는 동안 이전 집계를 유지해 화면이 깜빡이지 않게 함
    placeholderData: (previous) => previous,
  });

export const useEmployeeWorkHistory = (employeeId: string) =>
  useQuery({
    queryKey: queryKeys.employeeWorkHistory(employeeId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/employees/{id}/work-history', {
        params: { path: { id: employeeId } },
      });

      if (!data) {
        throw new Error('[web.useEmployeeWorkHistory] 투입 이력 조회 실패');
      }

      return data;
    },
  });
