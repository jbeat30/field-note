import type { PartnerCreate, PartnerListQuery, PartnerUpdate } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 빈 값은 필터에서 뺀다 (주소에 `kind=`처럼 빈 값이 실리지 않게)
const cleanFilter = (filter: PartnerListQuery): PartnerListQuery => ({
  kind: filter.kind || undefined,
  q: filter.q?.trim() || undefined,
});

export const usePartners = (filter: PartnerListQuery) => {
  const query = cleanFilter(filter);

  return useQuery({
    queryKey: queryKeys.partners(query),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/partners', { params: { query } });

      if (!data) {
        throw new Error('[web.usePartners] 명부 조회 실패');
      }

      return data.items;
    },
    // 필터를 바꾸는 동안 이전 목록을 유지해 화면이 깜빡이지 않게 함
    placeholderData: (previous) => previous,
  });
};

export const usePartner = (id: string) =>
  useQuery({
    queryKey: queryKeys.partner(id),
    queryFn: async () => {
      const { data, response } = await apiClient.GET('/api/v1/partners/{id}', {
        params: { path: { id } },
      });

      // 없는 업체(또는 다른 회사 업체)는 같은 응답
      if (response.status === 404) {
        return null;
      }

      if (!data) {
        throw new Error('[web.usePartner] 업체 조회 실패');
      }

      return data;
    },
  });

export const useCreatePartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: PartnerCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/partners', { body });

      if (!data) {
        throw error ?? new Error('[web.useCreatePartner] 등록 실패');
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners'] }),
  });
};

export const useUpdatePartner = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: PartnerUpdate) => {
      const { data, error } = await apiClient.PATCH('/api/v1/partners/{id}', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useUpdatePartner] 수정 실패');
      }

      return data;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.partner(id), saved);

      return queryClient.invalidateQueries({ queryKey: ['partners', 'list'] });
    },
  });
};
