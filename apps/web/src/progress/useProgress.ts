import type { ProgressRecordCreate } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useProjectHealth = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.projectHealth(projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/health', {
        params: { path: { id: projectId } },
      });

      if (!data) {
        throw new Error('[web.useProjectHealth] 진행 점검 조회 실패');
      }

      return data;
    },
  });

export const useProgressRecords = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.projectProgress(projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/progress', {
        params: { path: { id: projectId } },
      });

      if (!data) {
        throw new Error('[web.useProgressRecords] 진행률 기록 조회 실패');
      }

      return data.items;
    },
  });

export const useRecordProgress = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: '진행률을 기록했습니다' },
    mutationFn: async (body: ProgressRecordCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/projects/{id}/progress', {
        params: { path: { id: projectId } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useRecordProgress] 진행률 기록 실패');
      }

      return data;
    },
    // 기록과 점검(현재 진행률·경고)이 함께 변경
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress'] }),
  });
};
