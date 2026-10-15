import type { CompanyRules } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 회사별 경고 기준·보증 기본 기간
export const useCompanyRules = () =>
  useQuery({
    queryKey: queryKeys.companyRules(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/company/rules');

      if (!data) {
        throw new Error('[web.useCompanyRules] 경고 기준 조회 실패');
      }

      return data;
    },
  });

// 저장하면 경고(프로젝트 현황·홈 알림)와 보증 기본 기간이 달라지므로 관련 조회를 새로 읽는다
export const useSaveCompanyRules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rules: CompanyRules) => {
      const { data, error } = await apiClient.PUT('/api/v1/company/rules', { body: rules });

      if (!data) {
        throw error ?? new Error('[web.useSaveCompanyRules] 저장 실패');
      }

      return data;
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKeys.companyRules(), saved);
      await queryClient.invalidateQueries();
    },
  });
};
