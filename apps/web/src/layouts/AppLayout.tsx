import { APP_NAME } from '@field-note/shared';
import { BookUser, ClipboardList, FolderKanban, House, Plus, Settings, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

import { useMe } from '../auth/useMe';
import { Button } from '../components/ui/button';
import { Toaster } from '../components/ui/toaster';
import { cn } from '../lib/cn';
import { useUiStore } from '../stores/uiStore';

import { QuickAddSheet } from './QuickAddSheet';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { to: '/', label: '홈', end: true, icon: House },
  { to: '/projects', label: '프로젝트', end: false, icon: FolderKanban },
  { to: '/work-logs', label: '일지', end: false, icon: ClipboardList },
  { to: '/employees', label: '직원', end: false, icon: Users },
  { to: '/partners', label: '명부', end: false, icon: BookUser },
  { to: '/settings', label: '설정', end: false, icon: Settings },
];

// 모든 화면 공통 틀: 넓은 화면은 왼쪽 고정 메뉴(관리 화면 방식), 좁은 화면은 상단 헤더 + 하단 탭 메뉴. 빠른 추가 버튼(터치 영역 44px 이상)
export const AppLayout = () => {
  const setQuickAddOpen = useUiStore((state) => state.setQuickAddOpen);
  const me = useMe();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 border-r border-line bg-surface p-4 md:flex print:hidden">
        <p className="font-emphasis px-3 py-2 text-xl font-bold text-primary">{APP_NAME}</p>
        <nav aria-label="주 메뉴" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-touch items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary-subtle text-primary' : 'text-foreground/70 hover:bg-muted',
                )
              }
            >
              <item.icon aria-hidden className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle font-bold text-primary"
          >
            {me.data?.displayName.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{me.data?.displayName}</p>
            <p className="truncate text-xs text-foreground/70">{me.data?.companyName}</p>
          </div>
          <ThemeToggle />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-surface/90 px-4 backdrop-blur md:hidden print:hidden">
          <p className="font-emphasis shrink-0 text-lg font-bold text-primary">{APP_NAME}</p>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-40 md:px-8 md:pt-8 md:pb-24 print:p-0">
          <Outlet />
        </main>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-16 flex justify-end p-4 md:bottom-0 print:hidden">
        <Button
          className="pointer-events-auto shadow-card"
          aria-label="빠른 추가"
          onClick={() => setQuickAddOpen(true)}
        >
          <Plus aria-hidden className="size-5" />
          추가
        </Button>
      </div>
      <nav
        aria-label="하단 메뉴"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
                isActive ? 'text-primary' : 'text-foreground/70',
              )
            }
          >
            <item.icon aria-hidden className="size-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <QuickAddSheet />
      <Toaster />
    </div>
  );
};
