import { APP_NAME } from '@field-note/shared';
import {
  BookUser,
  CalendarDays,
  FolderKanban,
  House,
  Menu,
  Plus,
  Settings,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';

import { useMe } from '../auth/useMe';
import { AlertBell } from '../dashboard/AlertBell';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Toaster } from '../components/ui/toaster';
import { cn } from '../lib/cn';
import { useUiStore } from '../stores/uiStore';

import { QuickAddSheet } from './QuickAddSheet';
import { ThemeToggle } from './ThemeToggle';

type NavItem = { to: string; label: string; end?: boolean; icon: typeof House };

const HOME: NavItem = { to: '/', label: '홈', end: true, icon: House };
const PROJECTS: NavItem = { to: '/projects', label: '프로젝트', icon: FolderKanban };
const EMPLOYEES: NavItem = { to: '/employees', label: '직원', icon: Users };
const PARTNERS: NavItem = { to: '/partners', label: '명부', icon: BookUser };
const MONTHLY: NavItem = { to: '/monthly-hours', label: '월 공수표', icon: CalendarDays };
const SETTINGS: NavItem = { to: '/settings', label: '설정', icon: Settings };

// 왼쪽 메뉴(넓은 화면): 프로젝트 중심 업무와 회사 관리용을 나눈다. 작업 내역은 프로젝트 안에서 다룬다
const SIDEBAR_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: '프로젝트 관리', items: [HOME, PROJECTS] },
  { title: '관리', items: [EMPLOYEES, PARTNERS, MONTHLY, SETTINGS] },
];

// 아래 메뉴(좁은 화면): 자주 쓰는 네 가지 + 더보기
const TAB_ITEMS: NavItem[] = [HOME, PROJECTS, EMPLOYEES, PARTNERS];
const MORE_ITEMS: NavItem[] = [MONTHLY, SETTINGS];

const tabClass = (isActive: boolean) =>
  cn(
    'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
    isActive ? 'text-primary' : 'text-foreground/70',
  );

// 모든 화면 공통 틀: 넓은 화면은 왼쪽 고정 메뉴(관리 화면 방식), 좁은 화면은 상단 헤더 + 하단 탭 메뉴. 빠른 추가 버튼(터치 영역 44px 이상)
export const AppLayout = () => {
  const setQuickAddOpen = useUiStore((state) => state.setQuickAddOpen);
  const me = useMe();
  const { pathname } = useLocation();
  const [isMoreOpen, setMoreOpen] = useState(false);
  // 더보기 안의 화면을 보고 있으면 더보기 탭을 강조
  const isInMore = MORE_ITEMS.some((item) => pathname.startsWith(item.to));
  // 빠른 추가(+)는 모바일의 프로젝트 밖 화면에서만. 프로젝트 안에서는 머리의 주 버튼이 같은 일을 하고, 넓은 화면은 왼쪽 메뉴·머리 버튼으로 충분
  const showQuickAdd = !/^\/projects\/(?!new$)[^/]+/.test(pathname);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 border-r border-line bg-surface p-4 md:flex print:hidden">
        <div className="flex items-center justify-between gap-2">
          <p className="font-emphasis px-3 py-2 text-xl font-bold text-primary">{APP_NAME}</p>
          <AlertBell />
        </div>
        <nav aria-label="주 메뉴" className="flex flex-1 flex-col gap-5 overflow-y-auto">
          {SIDEBAR_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-xs font-semibold text-foreground/70">{group.title}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-touch items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-subtle text-primary'
                        : 'text-foreground/70 hover:bg-muted',
                    )
                  }
                >
                  <item.icon aria-hidden className="size-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
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
          <span className="flex items-center">
            <AlertBell />
            <ThemeToggle />
          </span>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pt-4 pb-40 md:px-8 md:pt-8 md:pb-24 xl:px-10 print:p-0">
          <Outlet />
        </main>
      </div>
      {showQuickAdd && (
        <div className="pointer-events-none fixed inset-x-0 bottom-16 flex justify-end p-4 md:hidden print:hidden">
          <Button
            className="pointer-events-auto size-14 rounded-full px-0 shadow-card"
            aria-label="빠른 추가"
            title="빠른 추가: 메모·사진·오늘 작업 내역"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus aria-hidden className="size-6" />
          </Button>
        </div>
      )}
      <nav
        aria-label="하단 메뉴"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
      >
        {TAB_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => tabClass(isActive)}
          >
            <item.icon aria-hidden className="size-5" />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          aria-haspopup="dialog"
          className={tabClass(isInMore)}
          onClick={() => setMoreOpen(true)}
        >
          <Menu aria-hidden className="size-5" />
          더보기
        </button>
      </nav>
      <Modal open={isMoreOpen} onOpenChange={setMoreOpen} title="더보기" variant="sheet">
        <ul className="grid grid-cols-2 gap-2">
          {MORE_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className="flex min-h-14 items-center gap-3 rounded-xl bg-surface-nested px-4 text-base font-medium hover:bg-muted"
              >
                <item.icon aria-hidden className="size-5 text-primary" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </Modal>
      <QuickAddSheet />
      <Toaster />
    </div>
  );
};
