import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

/**
 * @description 값이 바뀌고 잠시(기본 0.3초) 멈춘 뒤에야 따라가는 값 (글자를 칠 때마다 서버에 묻지 않게)
 * @param value 입력 중인 값
 * @param delayMs 기다릴 시간
 * @returns 지연된 값
 */
export const useDebouncedValue = <T>(value: T, delayMs = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};

export const useSearch = (q: string, projectId?: string) => {
  const query = q.trim();

  return useQuery({
    queryKey: queryKeys.search(query, projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/search', {
        params: { query: { q: query, projectId, limit: 5 } },
      });

      if (!data) {
        throw new Error('[web.useSearch] 검색 실패');
      }

      return data;
    },
    enabled: query.length > 0,
    // 검색어를 바꾸는 동안 이전 결과를 유지해 화면이 깜빡이지 않게 함
    placeholderData: (previous) => previous,
  });
};
