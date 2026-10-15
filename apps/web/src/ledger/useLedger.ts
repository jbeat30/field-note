import type { LedgerEntryCreate, LedgerEntryUpdate, LedgerKind } from '@field-note/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 내역과 합계가 같은 조건으로 걸러지도록 필터는 한 모양을 쓴다
export type LedgerFilter = {
  kind?: LedgerKind;
  categoryId?: string;
  from?: string;
  to?: string;
};

// 프로젝트 지출·수입 내역 (날짜 최근순, 이어서 읽기)
export const useLedgerEntries = (projectId: string, filter: LedgerFilter = {}) =>
  useInfiniteQuery({
    queryKey: queryKeys.ledgerEntries(projectId, filter),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await apiClient.GET('/api/v1/projects/{projectId}/ledger-entries', {
        params: { path: { projectId }, query: { ...filter, limit: 30, cursor: pageParam } },
      });

      if (!data) {
        throw new Error('[web.useLedgerEntries] 지출·수입 내역 조회 실패');
      }

      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(projectId),
  });

// 그날 하루 기록 화면에서 보는 하루치 내역
export const useLedgerEntriesOnDate = (projectId: string, date: string) =>
  useQuery({
    queryKey: queryKeys.ledgerEntries(projectId, { date }),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{projectId}/ledger-entries', {
        params: { path: { projectId }, query: { date, limit: 100 } },
      });

      if (!data) {
        throw new Error('[web.useLedgerEntriesOnDate] 지출·수입 내역 조회 실패');
      }

      return data.items;
    },
    enabled: Boolean(projectId && date),
  });

// 지출 합계·수입 합계·분류별 합계 (내역과 같은 필터)
export const useLedgerSummary = (projectId: string, filter: LedgerFilter = {}) =>
  useQuery({
    queryKey: queryKeys.ledgerSummary(projectId, filter),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{projectId}/ledger-summary', {
        params: { path: { projectId }, query: filter },
      });

      if (!data) {
        throw new Error('[web.useLedgerSummary] 지출·수입 합계 조회 실패');
      }

      return data;
    },
    enabled: Boolean(projectId),
  });

// 기록이 바뀌면 내역과 합계가 모두 바뀌므로 지출·수입 조회를 한꺼번에 새로 읽음
const useInvalidateLedger = () => {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: ['ledger'] });
};

export const useCreateLedgerEntry = (projectId: string) => {
  const invalidate = useInvalidateLedger();

  return useMutation({
    mutationFn: async (body: LedgerEntryCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/projects/{projectId}/ledger-entries', {
        params: { path: { projectId } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useCreateLedgerEntry] 지출·수입 기록 저장 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateLedgerEntry = () => {
  const invalidate = useInvalidateLedger();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: LedgerEntryUpdate }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/ledger-entries/{id}', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useUpdateLedgerEntry] 지출·수입 기록 수정 실패');
      }

      return data;
    },
    onSuccess: invalidate,
  });
};

export const useDeleteLedgerEntry = () => {
  const invalidate = useInvalidateLedger();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.DELETE('/api/v1/ledger-entries/{id}', {
        params: { path: { id } },
      });

      if (!data) {
        throw error ?? new Error('[web.useDeleteLedgerEntry] 지출·수입 기록 삭제 실패');
      }
    },
    onSuccess: invalidate,
  });
};
