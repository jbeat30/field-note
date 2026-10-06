import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useDevices = () =>
  useQuery({
    queryKey: queryKeys.devices(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/me/devices');

      if (!data) {
        throw new Error('[web.useDevices] 기기 목록 조회 실패');
      }

      return data.devices;
    },
  });

// 원격 로그아웃: 서버 확인 후 목록을 다시 읽음
export const useRevokeDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/api/v1/me/devices/{id}', {
        params: { path: { id } },
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.devices() }),
  });
};
