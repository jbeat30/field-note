import type { ProjectCreate, ProjectListQuery, ProjectUpdate } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 빈 값은 필터에서 뺀다 (주소에 `status=`처럼 빈 값이 실리지 않게)
const cleanFilter = (filter: ProjectListQuery): ProjectListQuery => ({
  status: filter.status || undefined,
  clientId: filter.clientId || undefined,
  managerId: filter.managerId || undefined,
  tradeId: filter.tradeId || undefined,
  from: filter.from || undefined,
  to: filter.to || undefined,
  q: filter.q?.trim() || undefined,
  sort: filter.sort || undefined,
});

export const useProjects = (filter: ProjectListQuery) => {
  const query = cleanFilter(filter);

  return useQuery({
    queryKey: queryKeys.projects(query),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects', { params: { query } });

      if (!data) {
        throw new Error('[web.useProjects] 프로젝트 목록 조회 실패');
      }

      return data.items;
    },
    // 필터를 바꾸는 동안 이전 목록을 유지해 화면이 깜빡이지 않게 함
    placeholderData: (previous) => previous,
  });
};

export const useProject = (id: string) =>
  useQuery({
    queryKey: queryKeys.project(id),
    queryFn: async () => {
      const { data, response } = await apiClient.GET('/api/v1/projects/{id}', {
        params: { path: { id } },
      });

      // 없는 프로젝트(또는 다른 회사 프로젝트)는 같은 응답
      if (response.status === 404) {
        return null;
      }

      if (!data) {
        throw new Error('[web.useProject] 프로젝트 조회 실패');
      }

      return data;
    },
  });

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ProjectCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/projects', { body });

      if (!data) {
        throw error ?? new Error('[web.useCreateProject] 등록 실패');
      }

      return data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.project(created.id), created);

      return queryClient.invalidateQueries({ queryKey: ['projects', 'list'] });
    },
  });
};

export const useUpdateProject = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ProjectUpdate) => {
      const { data, error } = await apiClient.PATCH('/api/v1/projects/{id}', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useUpdateProject] 수정 실패');
      }

      return data;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.project(id), saved);

      return queryClient.invalidateQueries({ queryKey: ['projects', 'list'] });
    },
  });
};
