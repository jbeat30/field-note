import { Bell, ChevronsUpDown, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router';

import { useMe } from '../auth/useMe';
import { cn } from '../lib/cn';
import { useUiStore } from '../stores/uiStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

import { ThemeSwitch } from './ThemeSwitch';
import { useLogout } from './useLogout';

// 이름의 첫 글자를 담은 동그란 표시 (장식이라 보조 기술에는 숨김)
export const ProfileAvatar = ({ name }: { name?: string }) => (
  <span
    aria-hidden
    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-[#14110d]"
  >
    {name?.slice(0, 1)}
  </span>
);

// 왼쪽 메뉴 아래의 내 정보: 누르면 알림·설정·화면 모드·로그아웃이 위로 열림
export const ProfileMenu = ({ compact = false }: { compact?: boolean }) => {
  const me = useMe();
  const onLogout = useLogout();
  const setAlertsOpen = useUiStore((state) => state.setAlertsOpen);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="내 메뉴"
          className={cn(
            'flex min-h-touch min-w-0 items-center justify-center gap-3 rounded-2xl p-1.5 text-left text-[#f4eee0] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-accent lg:flex-1 lg:justify-start',
            compact && 'lg:flex-none lg:justify-center',
          )}
        >
          <ProfileAvatar name={me.data?.displayName} />
          <span className={cn('hidden min-w-0 flex-1 lg:block', compact && 'lg:hidden')}>
            <span className="block truncate text-sm font-semibold">{me.data?.displayName}</span>
            <span className="block truncate text-xs text-[#f4eee0]/65">{me.data?.companyName}</span>
          </span>
          <ChevronsUpDown
            aria-hidden
            className={cn(
              'hidden size-4 shrink-0 text-[#f4eee0]/60 lg:block',
              compact && 'lg:hidden',
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel>{me.data?.email ?? me.data?.companyName}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => setAlertsOpen(true)}>
          <Bell aria-hidden />
          알림
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings aria-hidden />
            설정
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-3 px-2.5 py-1.5">
          <span className="text-sm font-semibold">화면 모드</span>
          <ThemeSwitch />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={onLogout}>
          <LogOut aria-hidden />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
