import type {
  DocumentAccessQuery,
  DocumentCreate,
  DocumentUpdate,
  DocumentVersionCreate,
} from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 파일 검사가 끝나지 않은 버전이 있으면 몇 초마다 다시 읽어 검사가 끝나는 대로 열 수 있게 함
const POLL_MS = 3000;

const isChecking = (status: string) => status === 'PENDING' || status === 'PROCESSING';

export type DocumentFilter = { category?: string; q?: string; pinned?: boolean };

export const useDocuments = (projectId: string, filter: DocumentFilter = {}) =>
  useQuery({
    queryKey: queryKeys.documents(projectId, filter),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{projectId}/documents', {
        params: {
          path: { projectId },
          query: {
            category: (filter.category || undefined) as DocumentCreate['category'] | undefined,
            q: filter.q?.trim() || undefined,
            pinned:
              filter.pinned === undefined ? undefined : (String(filter.pinned) as 'true' | 'false'),
          },
        },
      });

      if (!data) {
        throw new Error('[web.useDocuments] 문서 목록 조회 실패');
      }

      return data.items;
    },
    enabled: Boolean(projectId),
    // 분류·검색을 바꾸는 동안 이전 목록을 유지해 화면이 깜빡이지 않게 함
    placeholderData: (previous) => previous,
    refetchInterval: (query) =>
      query.state.data?.some((document) => isChecking(document.latest.fileStatus))
        ? POLL_MS
        : false,
  });

export const useDocument = (id: string) =>
  useQuery({
    queryKey: queryKeys.document(id),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/documents/{id}', { params: { path: { id } } });

      if (!data) {
        throw new Error('[web.useDocument] 문서 조회 실패');
      }

      return data;
    },
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.versions.some((version) => isChecking(version.fileStatus))
        ? POLL_MS
        : false,
  });

// 민감 자료의 열람 기록 (열 때마다 새로 읽음)
export const useDocumentAccessLogs = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.documentAccessLogs(id),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/documents/{id}/access-logs', {
        params: { path: { id } },
      });

      if (!data) {
        throw new Error('[web.useDocumentAccessLogs] 열람 기록 조회 실패');
      }

      return data.items;
    },
    enabled,
    staleTime: 0,
  });

// 문서가 바뀌면 목록·상세·열람 기록이 모두 바뀌므로 문서 관련 조회를 한꺼번에 새로 읽음
const useInvalidateDocuments = () => {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: ['documents'] });
};

export const useCreateDocument = (projectId: string) => {
  const invalidate = useInvalidateDocuments();

  return useMutation({
    mutationFn: async (body: DocumentCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/projects/{projectId}/documents', {
        params: { path: { projectId } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useCreateDocument] 문서 등록 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useAddDocumentVersion = () => {
  const invalidate = useInvalidateDocuments();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: DocumentVersionCreate }) => {
      const { data, error } = await apiClient.POST('/api/v1/documents/{id}/versions', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useAddDocumentVersion] 새 버전 등록 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateDocument = () => {
  const invalidate = useInvalidateDocuments();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: DocumentUpdate }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/documents/{id}', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useUpdateDocument] 문서 수정 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useDeleteDocument = () => {
  const invalidate = useInvalidateDocuments();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.DELETE('/api/v1/documents/{id}', {
        params: { path: { id } },
      });

      if (!data) {
        throw error ?? new Error('[web.useDeleteDocument] 문서 삭제 실패');
      }
    },
    onSuccess: invalidate,
  });
};

/**
 * @description 열람·내려받기 주소를 받음 (민감 자료면 이 호출이 열람 기록으로 남는다)
 * @param id 문서 ID
 * @param versionNo 버전 번호
 * @param mode 열람 또는 내려받기
 * @returns 짧은 만료의 주소
 */
export const fetchDocumentAccess = async (
  id: string,
  versionNo: number,
  mode: DocumentAccessQuery['mode'],
) => {
  const { data, error } = await apiClient.GET('/api/v1/documents/{id}/versions/{versionNo}/url', {
    params: { path: { id, versionNo }, query: { mode } },
  });

  if (!data) {
    throw error ?? new Error('[web.fetchDocumentAccess] 열람 주소 발급 실패');
  }

  return data;
};
