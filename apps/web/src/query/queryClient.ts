import { MutationCache, QueryClient } from '@tanstack/react-query';

import { toast } from '../stores/toastStore';

declare module '@tanstack/react-query' {
  interface Register {
    // 저장·삭제 같은 변경 동작이 성공했을 때 띄울 안내 문구
    mutationMeta: { success?: string };
  }
}

/**
 * @description 앱·스토리가 각자 만드는 QueryClient (스토리끼리 캐시가 섞이지 않게 팩토리로 제공)
 * @returns 기본 재시도·캐시 정책이 적용된 QueryClient
 */
export const createQueryClient = () =>
  new QueryClient({
    // 변경 동작마다 화면에서 안내를 따로 만들지 않도록 meta.success 가 있으면 성공 안내를 한곳에서 띄움
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        const message = mutation.meta?.success;

        if (message) {
          toast(message, 'success');
        }
      },
    }),
    defaultOptions: {
      // 조회의 재시도는 API 클라이언트(fetchWithRetry)가 연결 오류·게이트웨이 오류에만 하므로 여기서는 다시 하지 않음 (입력·권한 오류까지 되풀이하지 않게)
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
    },
  });

export const queryClient = createQueryClient();
