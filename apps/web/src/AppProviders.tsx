import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useEffect, type PropsWithChildren } from 'react';

import { setUnauthorizedHandler } from './api/client';
import { queryClient as defaultQueryClient } from './query/queryClient';
import { queryKeys } from './query/queryKeys';

type AppProvidersProps = PropsWithChildren<{ queryClient?: QueryClient }>;

// 앱과 Storybook이 함께 쓰는 공통 Provider (스토리는 자체 QueryClient를 주입)
export const AppProviders = ({ queryClient = defaultQueryClient, children }: AppProvidersProps) => {
  useEffect(() => {
    // 로그인한 채로 쓰던 중 서버가 로그인이 필요하다고 하면 내 정보를 비워 로그인 화면으로 이동시킴 (세션 만료·다른 기기에서 로그아웃)
    setUnauthorizedHandler(() => {
      if (queryClient.getQueryData(queryKeys.me())) {
        queryClient.setQueryData(queryKeys.me(), null);
      }
    });

    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
