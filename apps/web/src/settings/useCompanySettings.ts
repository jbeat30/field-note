import { type CompanySettings } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useCompanySettings = () =>
  useQuery({
    queryKey: queryKeys.companySettings(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/company/settings');

      if (!data) {
        throw new Error('[web.useCompanySettings] 회사 설정 조회 실패');
      }

      return data;
    },
  });

// 설정은 서버 확인 뒤 반영 (낙관적 업데이트 없음)
export const useSaveCompanySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: CompanySettings) => {
      const { data, error } = await apiClient.PUT('/api/v1/company/settings', { body: settings });

      if (!data) {
        throw error ?? new Error('[web.useSaveCompanySettings] 저장 실패');
      }

      return data;
    },
    onSuccess: (saved) => queryClient.setQueryData(queryKeys.companySettings(), saved),
  });
};
