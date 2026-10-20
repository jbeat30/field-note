import { QueryClient } from '@tanstack/react-query';

/**
 * @description 앱·스토리가 각자 만드는 QueryClient (스토리끼리 캐시가 섞이지 않게 팩토리로 제공)
 * @returns 기본 재시도·캐시 정책이 적용된 QueryClient
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      // 조회의 재시도는 API 클라이언트(fetchWithRetry)가 연결 오류·게이트웨이 오류에만 하므로 여기서는 다시 하지 않음 (입력·권한 오류까지 되풀이하지 않게)
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
    },
  });

export const queryClient = createQueryClient();
