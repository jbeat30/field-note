import type { AuditAction, AuditKind } from '@field-note/shared';
import { useInfiniteQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export type AuditFilter = {
  action?: AuditAction;
  kind?: AuditKind;
  projectId?: string;
  from?: string;
  to?: string;
};

const PAGE_SIZE = 30;

// 기록 조회: 최근순 더 보기 방식, 감사 기록은 조회 전용
export const useAuditLogs = (filter: AuditFilter) =>
  useInfiniteQuery({
    queryKey: queryKeys.auditLogs({ ...filter, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await apiClient.GET('/api/v1/audit-logs', {
        params: { query: { ...filter, limit: PAGE_SIZE, cursor: pageParam } },
      });

      if (!data) {
        throw new Error('[web.useAuditLogs] 기록 조회 실패');
      }

      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
