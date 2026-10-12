import type {
  ChangeWorkCreate,
  ChangeWorkLink,
  ChangeWorkStatus,
  ChangeWorkTransition,
  ChangeWorkUpdate,
} from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useChangeWorks = (projectId: string, status?: ChangeWorkStatus) =>
  useQuery({
    queryKey: queryKeys.changeWorks(projectId, status),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/change-works', {
        params: { path: { id: projectId }, query: status ? { status } : {} },
      });

      if (!data) {
        throw new Error('[web.useChangeWorks] 변경·추가 작업 조회 실패');
      }

      return data.items;
    },
  });

export const useChangeWorkDetail = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.changeWork(id),
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/change-works/{id}', {
        params: { path: { id } },
      });

      if (!data) {
        throw new Error('[web.useChangeWorkDetail] 변경·추가 작업 상세 조회 실패');
      }

      return data;
    },
  });

export const useChangeUsage = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.changeUsage(projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/change-usage', {
        params: { path: { id: projectId } },
      });

      if (!data) {
        throw new Error('[web.useChangeUsage] 변경·추가 작업 공수 조회 실패');
      }

      return data;
    },
  });

// 변경·추가 작업의 목록·상세는 서로 영향을 주므로 하나가 바뀌면 모두 다시 읽는다
const useInvalidateChangeWorks = () => {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: ['change-works'] });
};

export const useCreateChangeWork = (projectId: string) => {
  const invalidate = useInvalidateChangeWorks();

  return useMutation({
    mutationFn: async (body: ChangeWorkCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/projects/{id}/change-works', {
        params: { path: { id: projectId } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useCreateChangeWork] 변경·추가 작업 기록 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateChangeWork = (id: string) => {
  const invalidate = useInvalidateChangeWorks();

  return useMutation({
    mutationFn: async (body: ChangeWorkUpdate) => {
      const { data, error } = await apiClient.PATCH('/api/v1/change-works/{id}', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useUpdateChangeWork] 변경·추가 작업 수정 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useTransitionChangeWork = (id: string) => {
  const invalidate = useInvalidateChangeWorks();

  return useMutation({
    mutationFn: async (body: ChangeWorkTransition) => {
      const { data, error } = await apiClient.POST('/api/v1/change-works/{id}/status', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useTransitionChangeWork] 상태 변경 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useLinkChangeWorkDocument = (id: string) => {
  const invalidate = useInvalidateChangeWorks();

  return useMutation({
    mutationFn: async (body: ChangeWorkLink) => {
      const { data, error } = await apiClient.POST('/api/v1/change-works/{id}/documents', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useLinkChangeWorkDocument] 증빙 연결 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useUnlinkChangeWorkDocument = (id: string) => {
  const invalidate = useInvalidateChangeWorks();

  return useMutation({
    mutationFn: async ({
      documentId,
      confirmCompleted,
    }: {
      documentId: string;
      confirmCompleted?: boolean;
    }) => {
      const { data, error } = await apiClient.DELETE(
        '/api/v1/change-works/{id}/documents/{documentId}',
        {
          params: {
            path: { id, documentId },
            query: confirmCompleted ? { confirmCompleted: 'true' } : {},
          },
        },
      );

      if (!data) {
        throw error ?? new Error('[web.useUnlinkChangeWorkDocument] 증빙 연결 해제 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};
