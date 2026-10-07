import type { WorkLog, WorkLogSaveInput } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useWorkLogList = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.workLogs(projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/work-logs', {
        params: { path: { id: projectId }, query: {} },
      });

      if (!data) {
        throw new Error('[web.useWorkLogList] 일지 목록 조회 실패');
      }

      return data.items;
    },
    enabled: Boolean(projectId),
  });

const fetchWorkLog = async (projectId: string, workDate: string): Promise<WorkLog | null> => {
  const { data, response } = await apiClient.GET('/api/v1/projects/{id}/work-logs/{workDate}', {
    params: { path: { id: projectId, workDate } },
  });

  // 아직 쓰지 않은 날은 일지가 없는 것이 정상
  if (response.status === 404) {
    return null;
  }

  if (!data) {
    throw new Error('[web.fetchWorkLog] 일지 조회 실패');
  }

  return data;
};

export const useWorkLog = (projectId: string, workDate: string) =>
  useQuery({
    queryKey: queryKeys.workLog(projectId, workDate),
    queryFn: () => fetchWorkLog(projectId, workDate),
    enabled: Boolean(projectId && workDate),
  });

// 다른 날 일지를 복사할 때 한 번만 읽어 오는 용도 (화면 상태를 바꾸지 않음)
export const readWorkLog = (queryClient: QueryClient, projectId: string, workDate: string) =>
  queryClient.fetchQuery({
    queryKey: queryKeys.workLog(projectId, workDate),
    queryFn: () => fetchWorkLog(projectId, workDate),
    staleTime: 0,
  });

// 저장은 서버가 확인한 뒤에만 반영 (낙관적 업데이트 없음). 충돌·검증 오류는 호출한 쪽이 화면에 보여 줌
export const useSaveWorkLog = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workDate, body }: { workDate: string; body: WorkLogSaveInput }) => {
      const { data, error } = await apiClient.PUT('/api/v1/projects/{id}/work-logs/{workDate}', {
        params: { path: { id: projectId, workDate } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useSaveWorkLog] 일지 저장 실패');
      }

      return data;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.workLog(projectId, saved.workDate), saved);

      // 목록·수정 이력과 (자동으로 추가된) 투입·다른 일지의 하루 합계 경고를 다시 읽는다
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['work-logs', 'list'] }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.workLogRevisions(projectId, saved.workDate),
        }),
        queryClient.invalidateQueries({ queryKey: ['assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['work-summary'] }),
      ]);
    },
  });
};

export const useWorkLogRevisions = (projectId: string, workDate: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.workLogRevisions(projectId, workDate),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/work-logs/{workDate}/revisions', {
        params: { path: { id: projectId, workDate } },
      });

      if (!data) {
        throw new Error('[web.useWorkLogRevisions] 수정 이력 조회 실패');
      }

      return data.items;
    },
    enabled,
  });
