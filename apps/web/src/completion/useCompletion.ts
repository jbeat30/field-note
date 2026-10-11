import type { ProjectStatus } from '@field-note/shared';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 전환을 하려는 순간의 기록 현황이 중요하므로 캐시를 오래 쓰지 않는다
export const useTransitionNotices = (projectId: string, to: ProjectStatus) =>
  useQuery({
    queryKey: queryKeys.transitionNotices(projectId, to),
    gcTime: 0,
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/transition-notices', {
        params: { path: { id: projectId }, query: { to } },
      });

      if (!data) {
        throw new Error('[web.useTransitionNotices] 전환 안내 조회 실패');
      }

      return data.items;
    },
  });

export const useProjectSummary = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.projectSummary(projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/summary', {
        params: { path: { id: projectId } },
      });

      if (!data) {
        throw new Error('[web.useProjectSummary] 프로젝트 요약 조회 실패');
      }

      return data;
    },
  });
