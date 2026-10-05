import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { queryClient as defaultQueryClient } from './query/queryClient';

type AppProvidersProps = PropsWithChildren<{ queryClient?: QueryClient }>;

// 앱과 Storybook이 함께 쓰는 공통 Provider (스토리는 자체 QueryClient를 주입)
export const AppProviders = ({ queryClient = defaultQueryClient, children }: AppProvidersProps) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
