import type {
  RepairCreate,
  RepairLink,
  RepairStatus,
  RepairTransition,
  RepairUpdate,
} from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useRepairs = (projectId: string, status?: RepairStatus) =>
  useQuery({
    queryKey: queryKeys.repairs(projectId, status),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/repair-requests', {
        params: { path: { id: projectId }, query: status ? { status } : {} },
      });

      if (!data) {
        throw new Error('[web.useRepairs] 보수 요청 조회 실패');
      }

      return data.items;
    },
  });

export const useRepairDetail = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.repair(id),
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/repair-requests/{id}', {
        params: { path: { id } },
      });

      if (!data) {
        throw new Error('[web.useRepairDetail] 보수 요청 상세 조회 실패');
      }

      return data;
    },
  });

export const useAfterServiceUsage = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.afterServiceUsage(projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/after-service-usage', {
        params: { path: { id: projectId } },
      });

      if (!data) {
        throw new Error('[web.useAfterServiceUsage] 사후 작업 합계 조회 실패');
      }

      return data;
    },
  });

// 보수 요청의 목록·상세는 서로 영향을 주므로 하나가 바뀌면 모두 다시 읽는다 (상태 안내에 쓰는 종료 점검도 함께)
const useInvalidateRepairs = () => {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['repairs'] }),
      queryClient.invalidateQueries({ queryKey: ['completion'] }),
    ]);
};

export const useCreateRepair = (projectId: string) => {
  const invalidate = useInvalidateRepairs();

  return useMutation({
    mutationFn: async (body: RepairCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/projects/{id}/repair-requests', {
        params: { path: { id: projectId } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useCreateRepair] 보수 요청 접수 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateRepair = (id: string) => {
  const invalidate = useInvalidateRepairs();

  return useMutation({
    mutationFn: async (body: RepairUpdate) => {
      const { data, error } = await apiClient.PATCH('/api/v1/repair-requests/{id}', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useUpdateRepair] 보수 요청 수정 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useTransitionRepair = (id: string) => {
  const invalidate = useInvalidateRepairs();

  return useMutation({
    mutationFn: async (body: RepairTransition) => {
      const { data, error } = await apiClient.POST('/api/v1/repair-requests/{id}/status', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useTransitionRepair] 상태 변경 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useLinkRepair = (id: string) => {
  const invalidate = useInvalidateRepairs();

  return useMutation({
    mutationFn: async (body: RepairLink) => {
      const { data, error } = await apiClient.POST('/api/v1/repair-requests/{id}/links', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useLinkRepair] 사후 작업 연결 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useUnlinkRepair = (id: string) => {
  const invalidate = useInvalidateRepairs();

  return useMutation({
    mutationFn: async (linkId: string) => {
      const { data, error } = await apiClient.DELETE(
        '/api/v1/repair-requests/{id}/links/{linkId}',
        {
          params: { path: { id, linkId } },
        },
      );

      if (!data) {
        throw error ?? new Error('[web.useUnlinkRepair] 사후 작업 연결 해제 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};
