import { createBrowserRouter } from 'react-router';

import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './layouts/AppLayout';
import { ProjectLayout } from './layouts/ProjectLayout';
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
            path: '/projects',
            ...page(() => import('./routes/ProjectListPage'), 'ProjectListPage'),
          },
          {
            path: '/projects/new',
            ...page(() => import('./routes/ProjectNewPage'), 'ProjectNewPage'),
          },
          {
            path: '/projects/:id',
            Component: ProjectLayout,
            children: [
              {
                index: true,
                ...page(() => import('./routes/ProjectCardPage'), 'ProjectOverviewPage'),
              },
              {
                path: 'assignments',
                ...page(() => import('./routes/ProjectCardPage'), 'ProjectAssignmentsPage'),
              },
              {
                path: 'labor',
                ...page(() => import('./routes/ProjectCardPage'), 'ProjectLaborPage'),
              },
              {
                path: 'info',
                ...page(() => import('./routes/ProjectCardPage'), 'ProjectInfoPage'),
              },
              {
                path: 'memos',
                ...page(() => import('./routes/ProjectMemosPage'), 'ProjectMemosPage'),
              },
              {
                path: 'daily-report',
                ...page(() => import('./routes/DailyReportPage'), 'DailyReportPage'),
              },
              {
                path: 'documents',
                ...page(() => import('./routes/ProjectDocumentsPage'), 'ProjectDocumentsPage'),
              },
              {
                path: 'materials',
                ...page(() => import('./routes/ProjectMaterialsPage'), 'ProjectMaterialsPage'),
              },
              {
                path: 'change-works',
                ...page(() => import('./routes/ProjectChangeWorksPage'), 'ProjectChangeWorksPage'),
              },
              {
                path: 'repairs',
                ...page(() => import('./routes/ProjectRepairsPage'), 'ProjectRepairsPage'),
              },
              {
                path: 'warranty',
                ...page(() => import('./routes/ProjectWarrantyPage'), 'ProjectWarrantyPage'),
              },
              {
                path: 'summary',
                ...page(() => import('./routes/ProjectSummaryPage'), 'ProjectSummaryPage'),
              },
              {
                path: 'photos',
                ...page(() => import('./routes/ProjectPhotosPage'), 'ProjectPhotosPage'),
              },
            ],
          },
          {
            path: '/monthly-hours',
            ...page(() => import('./routes/MonthlyHoursPage'), 'MonthlyHoursPage'),
          },
          { path: '/search', ...page(() => import('./routes/SearchPage'), 'SearchPage') },
          { path: '/inbox', ...page(() => import('./routes/InboxPage'), 'InboxPage') },
          {
            path: '/work-logs',
            ...page(() => import('./routes/WorkLogPage'), 'WorkLogPage'),
          },
          {
            path: '/employees',
            ...page(() => import('./routes/EmployeeListPage'), 'EmployeeListPage'),
          },
          {
            path: '/staffing',
            ...page(() => import('./routes/StaffingCalendarPage'), 'StaffingCalendarPage'),
          },
          {
            path: '/employees/:id',
            ...page(() => import('./routes/EmployeeCardPage'), 'EmployeeCardPage'),
          },
          {
            path: '/partners',
            ...page(() => import('./routes/PartnerListPage'), 'PartnerListPage'),
          },
          {
            path: '/partners/:id',
            ...page(() => import('./routes/PartnerCardPage'), 'PartnerCardPage'),
          },
          { path: '/settings', ...page(() => import('./routes/SettingsPage'), 'SettingsPage') },
          {
            path: '/settings/alerts',
            ...page(() => import('./routes/AlertSettingsPage'), 'AlertSettingsPage'),
          },
          {
            path: '/settings/records',
            ...page(() => import('./routes/AuditLogsPage'), 'AuditLogsPage'),
          },
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
