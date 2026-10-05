import { QueryClient } from '@tanstack/react-query';

/**
 * @description 앱·스토리가 각자 만드는 QueryClient (스토리끼리 캐시가 섞이지 않게 팩토리로 제공)
 * @returns 기본 재시도·캐시 정책이 적용된 QueryClient
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
    },
  });

export const queryClient = createQueryClient();
