import type { AssignmentCancel, AssignmentCreate, AssignmentUpdate } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useAssignments = (projectId: string, includeCancelled = false) =>
  useQuery({
    queryKey: queryKeys.assignments(projectId, includeCancelled),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/assignments', {
        params: {
          path: { id: projectId },
          query: includeCancelled ? { includeCancelled: 'true' } : {},
        },
      });

      if (!data) {
        throw new Error('[web.useAssignments] 투입 목록 조회 실패');
      }

      return data.items;
    },
  });

// 투입은 서로 경고(겹침)에 영향을 주므로 어느 프로젝트의 투입이 바뀌어도 모든 투입 목록을 다시 읽는다
const useInvalidateAssignments = () => {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: ['assignments'] });
};

export const useCreateAssignment = (projectId: string) => {
  const invalidate = useInvalidateAssignments();

  return useMutation({
    mutationFn: async (body: AssignmentCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/projects/{id}/assignments', {
        params: { path: { id: projectId } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useCreateAssignment] 투입 등록 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateAssignment = (projectId: string, assignmentId: string) => {
  const invalidate = useInvalidateAssignments();

  return useMutation({
    mutationFn: async (body: AssignmentUpdate) => {
      const { data, error } = await apiClient.PATCH(
        '/api/v1/projects/{id}/assignments/{assignmentId}',
        {
          params: { path: { id: projectId, assignmentId } },
          body,
        },
      );

      if (!data) {
        throw error ?? new Error('[web.useUpdateAssignment] 투입 수정 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useCancelAssignment = (projectId: string, assignmentId: string) => {
  const invalidate = useInvalidateAssignments();

  return useMutation({
    mutationFn: async (body: AssignmentCancel) => {
      const { data, error } = await apiClient.POST(
        '/api/v1/projects/{id}/assignments/{assignmentId}/cancel',
        { params: { path: { id: projectId, assignmentId } }, body },
      );

      if (!data) {
        throw error ?? new Error('[web.useCancelAssignment] 투입 취소 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const usePeriodHistory = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.projectPeriodHistory(projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/period-history', {
        params: { path: { id: projectId } },
      });

      if (!data) {
        throw new Error('[web.usePeriodHistory] 기간 변경 이력 조회 실패');
      }

      return data.items;
    },
  });
