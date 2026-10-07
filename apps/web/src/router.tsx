import { createBrowserRouter } from 'react-router';

import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './layouts/AppLayout';
import { env } from './env';
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
      {
        path: '/forgot-password',
        ...page(() => import('./routes/ForgotPasswordPage'), 'ForgotPasswordPage'),
      },
      {
        path: '/reset-password/:token',
        ...page(() => import('./routes/ResetPasswordPage'), 'ResetPasswordPage'),
      },
      {
        path: '/closure/cancel/:token',
        ...page(() => import('./routes/ClosureCancelPage'), 'ClosureCancelPage'),
      },
      {
        path: '/closure/requested',
        ...page(() => import('./routes/ClosureRequestedPage'), 'ClosureRequestedPage'),
      },
      // 목업 모드에서만 존재하는 가짜 카카오 로그인 화면
      ...(env.isMockApi
        ? [
            {
              path: '/mock-kakao',
              ...page(() => import('./routes/MockKakaoPage'), 'MockKakaoPage'),
            },
          ]
        : []),
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
          {
            path: '/employees',
            ...page(() => import('./routes/EmployeeListPage'), 'EmployeeListPage'),
          },
          {
            path: '/employees/:id',
            ...page(() => import('./routes/EmployeeCardPage'), 'EmployeeCardPage'),
          },
          { path: '/settings', ...page(() => import('./routes/SettingsPage'), 'SettingsPage') },
          {
            path: '/settings/lists',
            ...page(() => import('./routes/OptionListsPage'), 'OptionListsPage'),
          },
          { path: '*', ...page(() => import('./routes/NotFoundPage'), 'NotFoundPage') },
        ],
      },
    ],
  },
];

export const createAppRouter = () => createBrowserRouter(routes);
