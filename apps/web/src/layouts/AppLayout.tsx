import { LogOut, Menu, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';

import { useMe } from '../auth/useMe';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Toaster } from '../components/ui/toaster';
import { AlertBell } from '../dashboard/AlertBell';
import { cn } from '../lib/cn';
import { useUiStore } from '../stores/uiStore';

import { AppSidebar } from './AppSidebar';
import { BrandLogo } from './BrandLogo';
import { DemoBanner } from './DemoBanner';
import { MORE_ITEMS, TAB_ITEMS } from './navItems';
import { OfflineNotice } from './OfflineNotice';
import { ProfileAvatar } from './ProfileMenu';
import { QuickAddSheet } from './QuickAddSheet';
import { ThemeToggle } from './ThemeToggle';
import { useLogout } from './useLogout';

const tabClass = (isActive: boolean) =>
  cn(
    'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-bold',
    isActive ? 'bg-accent text-[#14110d]' : 'text-[#f4eee0]/75',
  );

// 모든 화면 공통 틀: 넓은 화면은 잉크 사이드바와 한 줄 머리(찾기·알림·프로젝트 등록), 태블릿은 아이콘 레일
// 좁은 화면은 주황 상단 줄과 잉크 알약 하단 메뉴, 빠른 추가 버튼(터치 영역 44px 이상)
export const AppLayout = () => {
  const setQuickAddOpen = useUiStore((state) => state.setQuickAddOpen);
  const me = useMe();
  const onLogout = useLogout();
  const { pathname } = useLocation();
  const [isMoreOpen, setMoreOpen] = useState(false);
  // 사이드바 접힘은 화면을 새로 열면 펼친 상태로 돌아감 (저장하지 않음)
  const [isCollapsed, setCollapsed] = useState(false);
  // 더보기 안의 화면을 보고 있으면 더보기 탭을 강조
  const isInMore = MORE_ITEMS.some((item) => pathname.startsWith(item.to));
  // 빠른 추가(+)는 모바일의 프로젝트 밖 화면에서만 표시, 프로젝트 안에서는 머리의 주 버튼이 같은 역할, 넓은 화면은 왼쪽 메뉴·머리 버튼으로 충분
  const showQuickAdd = !/^\/projects\/(?!new$)[^/]+/.test(pathname);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AppSidebar isCollapsed={isCollapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <header className="plane sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 md:hidden print:hidden">
          <BrandLogo />
          <span className="flex items-center gap-1.5">
            <Link
              to="/search"
              aria-label="찾기"
              className="inline-flex size-11 items-center justify-center rounded-full bg-surface-subtle hover:opacity-85"
            >
              <Search aria-hidden className="size-5" />
            </Link>
            <AlertBell />
          </span>
        </header>
        <OfflineNotice />
        <DemoBanner />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pt-0 pb-40 md:px-8 md:pb-24 xl:px-10 print:p-0">
          <Outlet />
        </main>
      </div>
      {showQuickAdd && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 flex justify-end p-4 md:hidden print:hidden">
          <Button
            className="pointer-events-auto size-14 rounded-full bg-accent px-0 text-[#14110d] hover:bg-accent/90"
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
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 grid grid-cols-5 gap-1 rounded-full bg-sidebar p-1.5 shadow-card md:hidden print:hidden"
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
                className="flex min-h-14 items-center gap-3 rounded-xl bg-surface-nested px-4 text-base font-bold hover:bg-field"
              >
                <item.icon aria-hidden className="size-5" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-sm font-bold">화면 밝기</span>
          <ThemeToggle />
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
          <ProfileAvatar name={me.data?.displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{me.data?.displayName}</p>
            <p className="truncate text-xs text-sub">{me.data?.companyName}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setMoreOpen(false);
              void onLogout();
            }}
          >
            <LogOut aria-hidden className="size-4" />
            로그아웃
          </Button>
        </div>
      </Modal>
      <QuickAddSheet />
      <Toaster />
    </div>
  );
};
