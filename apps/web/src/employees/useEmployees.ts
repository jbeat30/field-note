import type { EmployeeCreate, EmployeeListQuery, EmployeeUpdate } from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

// 빈 값은 필터에서 뺀다 (주소에 `status=`처럼 빈 값이 실리지 않게)
const cleanFilter = (filter: EmployeeListQuery): EmployeeListQuery => ({
  status: filter.status || undefined,
  jobTypeId: filter.jobTypeId || undefined,
  workerTypeId: filter.workerTypeId || undefined,
  q: filter.q?.trim() || undefined,
});

export const useEmployees = (filter: EmployeeListQuery) => {
  const query = cleanFilter(filter);

  return useQuery({
    queryKey: queryKeys.employees(query),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/employees', { params: { query } });

      if (!data) {
        throw new Error('[web.useEmployees] 직원 목록 조회 실패');
      }

      return data.items;
    },
    // 필터를 바꾸는 동안 이전 목록을 유지해 화면이 깜빡이지 않게 함
    placeholderData: (previous) => previous,
  });
};

export const useEmployee = (id: string) =>
  useQuery({
    queryKey: queryKeys.employee(id),
    queryFn: async () => {
      const { data, response } = await apiClient.GET('/api/v1/employees/{id}', {
        params: { path: { id } },
      });

      // 없는 직원(또는 다른 회사 직원)은 같은 응답
      if (response.status === 404) {
        return null;
      }

      if (!data) {
        throw new Error('[web.useEmployee] 직원 조회 실패');
      }

      return data;
    },
  });

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: EmployeeCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/employees', { body });

      if (!data) {
        throw error ?? new Error('[web.useCreateEmployee] 등록 실패');
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
};

export const useUpdateEmployee = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: EmployeeUpdate) => {
      const { data, error } = await apiClient.PATCH('/api/v1/employees/{id}', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useUpdateEmployee] 수정 실패');
      }

      return data;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.employee(id), saved);

      return queryClient.invalidateQueries({ queryKey: ['employees', 'list'] });
    },
  });
};
