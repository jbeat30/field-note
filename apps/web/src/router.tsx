import { createBrowserRouter } from 'react-router';

import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

const page = <T extends string>(load: () => Promise<Record<T, React.ComponentType>>, name: T) => ({
  lazy: async () => ({ Component: (await load())[name] }),
});

// 라우트 단위 코드 분할(lazy): 무거운 화면은 필요할 때 불러온다
export const routes = [
  {
    // 로그인 전 화면
    Component: AuthLayout,
    children: [
      { path: '/login', ...page(() => import('./routes/LoginPage'), 'LoginPage') },
      {
        path: '/invite/:token',
        ...page(() => import('./routes/InviteSignupPage'), 'InviteSignupPage'),
      },
      {
        path: '/verify-email',
        ...page(() => import('./routes/VerifyEmailPage'), 'VerifyEmailPage'),
      },
      { path: '/legal/:slug', ...page(() => import('./routes/LegalPage'), 'LegalPage') },
    ],
  },
  {
    // 로그인 후 화면
    Component: RequireAuth,
    children: [
      {
        Component: AppLayout,
        children: [
          { path: '/', ...page(() => import('./routes/HomePage'), 'HomePage') },
          { path: '/settings', ...page(() => import('./routes/SettingsPage'), 'SettingsPage') },
          { path: '*', ...page(() => import('./routes/NotFoundPage'), 'NotFoundPage') },
        ],
      },
    ],
  },
];

export const createAppRouter = () => createBrowserRouter(routes);
