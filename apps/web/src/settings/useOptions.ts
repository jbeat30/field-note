import type { OptionItem, OptionKind } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useOptions = () =>
  useQuery({
    queryKey: queryKeys.options(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/company/options');

      if (!data) {
        throw new Error('[web.useOptions] 선택 목록 조회 실패');
      }

      return data.items;
    },
  });

// 서버가 확인한 뒤에만 반영 (낙관적 업데이트 없음). 이름 중복 같은 검증 오류는 호출한 쪽이 화면에 보여 줌
const useOptionMutation = <Variables, Result>(
  run: (variables: Variables) => Promise<{ data?: Result; error?: unknown }>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: Variables) => {
      const { data, error } = await run(variables);

      if (!data) {
        throw error ?? new Error('[web.useOptionMutation] 요청 실패');
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.options() }),
  });
};

export const useCreateOption = () =>
  useOptionMutation((body: { kind: OptionKind; name: string }) =>
    apiClient.POST('/api/v1/company/options', { body }),
  );

export const useUpdateOption = () =>
  useOptionMutation((variables: { id: string; name?: string; isActive?: boolean }) =>
    apiClient.PATCH('/api/v1/company/options/{id}', {
      params: { path: { id: variables.id } },
      body: { name: variables.name, isActive: variables.isActive },
    }),
  );

export const useReorderOptions = () =>
  useOptionMutation((body: { kind: OptionKind; ids: string[] }) =>
    apiClient.PUT('/api/v1/company/options/order', { body }),
  );

export type { OptionItem };
