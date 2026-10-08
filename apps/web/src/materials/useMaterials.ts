import type {
  MaterialCreate,
  MaterialRecordBatch,
  MaterialRecordKind,
  MaterialRecordUpdate,
} from '@field-note/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 자재 목록 (최근 기록한 자재가 먼저). 숨긴 자재는 새 기록에 쓸 수 없으므로 기본으로 뺀다
export const useMaterials = (q = '') =>
  useQuery({
    queryKey: queryKeys.materials({ q }),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/materials', {
        params: { query: { q: q.trim() || undefined } },
      });

      if (!data) {
        throw new Error('[web.useMaterials] 자재 목록 조회 실패');
      }

      return data.items;
    },
  });

// 그날 작업일지 화면에서 보는 하루치 기록
export const useMaterialRecordsOnDate = (projectId: string, date: string) =>
  useQuery({
    queryKey: queryKeys.materialRecords(projectId, { date }),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{projectId}/material-records', {
        params: { path: { projectId }, query: { date, limit: 100 } },
      });

      if (!data) {
        throw new Error('[web.useMaterialRecordsOnDate] 자재 기록 조회 실패');
      }

      return data.items;
    },
    enabled: Boolean(projectId && date),
  });

// 프로젝트 전체 기록 (날짜 최근순, 이어서 읽기)
export const useMaterialRecordHistory = (
  projectId: string,
  filter: { kind?: MaterialRecordKind; materialId?: string } = {},
) =>
  useInfiniteQuery({
    queryKey: queryKeys.materialRecords(projectId, { history: true, ...filter }),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await apiClient.GET('/api/v1/projects/{projectId}/material-records', {
        params: { path: { projectId }, query: { ...filter, limit: 30, cursor: pageParam } },
      });

      if (!data) {
        throw new Error('[web.useMaterialRecordHistory] 자재 기록 조회 실패');
      }

      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(projectId),
  });

export const useMaterialBalance = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.materialBalance(projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{projectId}/material-balance', {
        params: { path: { projectId } },
      });

      if (!data) {
        throw new Error('[web.useMaterialBalance] 자재 현황 조회 실패');
      }

      return data.items;
    },
    enabled: Boolean(projectId),
  });

// 기록이 바뀌면 목록·잔량·최근 사용 순서가 모두 바뀌므로 자재 관련 조회를 한꺼번에 새로 읽음
const useInvalidateMaterials = () => {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: ['materials'] });
};

export const useCreateMaterial = () => {
  const invalidate = useInvalidateMaterials();

  return useMutation({
    mutationFn: async (body: MaterialCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/materials', { body });

      if (!data) {
        throw error ?? new Error('[web.useCreateMaterial] 자재 추가 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useCreateMaterialRecords = (projectId: string) => {
  const invalidate = useInvalidateMaterials();

  return useMutation({
    mutationFn: async (body: MaterialRecordBatch) => {
      const { data, error } = await apiClient.POST(
        '/api/v1/projects/{projectId}/material-records/batch',
        { params: { path: { projectId } }, body },
      );

      if (!data) {
        throw error ?? new Error('[web.useCreateMaterialRecords] 자재 기록 저장 실패');
      }

      return data.items;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateMaterialRecord = () => {
  const invalidate = useInvalidateMaterials();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: MaterialRecordUpdate }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/material-records/{id}', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useUpdateMaterialRecord] 자재 기록 수정 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useDeleteMaterialRecord = () => {
  const invalidate = useInvalidateMaterials();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.DELETE('/api/v1/material-records/{id}', {
        params: { path: { id } },
      });

      if (!data) {
        throw error ?? new Error('[web.useDeleteMaterialRecord] 자재 기록 삭제 실패');
      }
    },
    onSuccess: invalidate,
  });
};
