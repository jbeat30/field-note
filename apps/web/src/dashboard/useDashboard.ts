import type { AlertSettingsUpdate } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useDashboard = () =>
  useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/dashboard');

      if (!data) {
        throw new Error('[web.useDashboard] 대시보드 조회 실패');
      }

      return data;
    },
  });

export const useAlertSettings = () =>
  useQuery({
    queryKey: queryKeys.alertSettings(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/company/alert-settings');

      if (!data) {
        throw new Error('[web.useAlertSettings] 알림 설정 조회 실패');
      }

      return data.items;
    },
  });

export const useSaveAlertSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: AlertSettingsUpdate) => {
      const { data, error } = await apiClient.PUT('/api/v1/company/alert-settings', { body });

      if (!data) {
        throw error ?? new Error('[web.useSaveAlertSettings] 알림 설정 저장 실패');
      }

      return data;
    },
    // 켜고 끈 즉시 홈의 알림에 반영
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.alertSettings(), saved.items);

      return queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
};

// 알림 숨기기 (모두 숨기기도 같은 요청): 완료 후 홈·알림 개수 재조회
export const useDismissAlerts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keys: string[]) => {
      const { data, error } = await apiClient.POST('/api/v1/alerts/dismiss', { body: { keys } });

      if (!data) {
        throw error ?? new Error('[web.useDismissAlerts] 알림 숨기기 실패');
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
  });
};
