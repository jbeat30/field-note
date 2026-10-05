import { createBrowserRouter } from 'react-router';

import { AppLayout } from './layouts/AppLayout';

// 라우트 단위 코드 분할(lazy): 무거운 화면은 필요할 때 불러온다
export const routes = [
  {
    path: '/',
    Component: AppLayout,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('./routes/HomePage')).HomePage }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('./routes/NotFoundPage')).NotFoundPage }),
      },
    ],
  },
];

export const createAppRouter = () => createBrowserRouter(routes);
