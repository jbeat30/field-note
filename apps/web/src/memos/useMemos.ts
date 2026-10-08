import type { MemoCreate, MemoTag, MemoUpdate } from '@field-note/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 메모함(INBOX) 또는 프로젝트 메모 노트(PROJECT). 프로젝트 노트는 projectId가 필요
export type MemoScope = { scope: 'INBOX' } | { scope: 'PROJECT'; projectId: string };

export type MemoFilter = { tag?: MemoTag; isDone?: boolean };

const PAGE_SIZE = 30;

const toQuery = (target: MemoScope, filter: MemoFilter) => ({
  scope: target.scope,
  projectId: target.scope === 'PROJECT' ? target.projectId : undefined,
  tag: filter.tag,
  // 서버가 'true'/'false' 문자열을 받음
  isDone: filter.isDone === undefined ? undefined : (String(filter.isDone) as 'true' | 'false'),
});

export const useMemoList = (target: MemoScope, filter: MemoFilter = {}) =>
  useInfiniteQuery({
    queryKey: queryKeys.memos({ ...toQuery(target, filter), limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await apiClient.GET('/api/v1/memos', {
        params: { query: { ...toQuery(target, filter), limit: PAGE_SIZE, cursor: pageParam } },
      });

      if (!data) {
        throw new Error('[web.useMemoList] 메모 목록 조회 실패');
      }

      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: target.scope === 'INBOX' || Boolean(target.projectId),
  });

// 정리 안 된 메모함 건수와 끝내지 않은 할 일 건수
export const useMemoSummary = () =>
  useQuery({
    queryKey: queryKeys.memoSummary(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/memos/summary');

      if (!data) {
        throw new Error('[web.useMemoSummary] 메모 건수 조회 실패');
      }

      return data;
    },
  });

// 메모는 목록·건수 모두 바뀌므로 메모 관련 조회를 한꺼번에 새로 읽음
const useInvalidateMemos = () => {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: ['memos'] });
};

export const useCreateMemo = () => {
  const invalidate = useInvalidateMemos();

  return useMutation({
    mutationFn: async (body: MemoCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/memos', { body });

      if (!data) {
        throw error ?? new Error('[web.useCreateMemo] 메모 저장 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateMemo = () => {
  const invalidate = useInvalidateMemos();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: MemoUpdate }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/memos/{id}', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useUpdateMemo] 메모 수정 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useDeleteMemo = () => {
  const invalidate = useInvalidateMemos();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.DELETE('/api/v1/memos/{id}', {
        params: { path: { id } },
      });

      if (!data) {
        throw error ?? new Error('[web.useDeleteMemo] 메모 삭제 실패');
      }
    },
    onSuccess: invalidate,
  });
};
