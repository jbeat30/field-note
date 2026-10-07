import { APP_NAME } from '@field-note/shared';
import { Plus } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

import { Button } from '../components/ui/button';
import { cn } from '../lib/cn';
import { useUiStore } from '../stores/uiStore';

const NAV_ITEMS = [
  { to: '/', label: '홈', end: true },
  { to: '/projects', label: '프로젝트', end: false },
  { to: '/employees', label: '직원', end: false },
  { to: '/partners', label: '명부', end: false },
  { to: '/settings', label: '설정', end: false },
];

// 모든 화면 공통 틀: 상단 메뉴, 하단 고정 빠른 추가 버튼(한 손 조작, 터치 영역 44px 이상)
export const AppLayout = () => {
  const setQuickAddOpen = useUiStore((state) => state.setQuickAddOpen);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border px-4">
        <p className="font-bold text-primary">{APP_NAME}</p>
        <nav aria-label="주 메뉴" className="flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-touch items-center px-3 text-base',
                  isActive ? 'font-bold text-primary' : 'text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 px-4 pt-4 pb-24">
        <Outlet />
      </main>
      <div className="fixed inset-x-0 bottom-0 flex justify-end p-4">
        <Button aria-label="빠른 추가" onClick={() => setQuickAddOpen(true)}>
          <Plus aria-hidden className="size-5" />
          추가
        </Button>
      </div>
    </div>
  );
};
