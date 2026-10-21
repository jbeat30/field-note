import { ChevronsUpDown, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router';

import { useMe } from '../auth/useMe';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

import { useLogout } from './useLogout';

// 이름의 첫 글자를 담은 동그란 표시 (장식이라 보조 기술에는 숨김)
export const ProfileAvatar = ({ name }: { name?: string }) => (
  <span
    aria-hidden
    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle font-bold text-primary"
  >
    {name?.slice(0, 1)}
  </span>
);

// 왼쪽 메뉴 아래의 내 정보: 누르면 설정과 로그아웃이 위로 열림
export const ProfileMenu = () => {
  const me = useMe();
  const onLogout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="내 메뉴"
          className="flex min-h-touch min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ProfileAvatar name={me.data?.displayName} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{me.data?.displayName}</span>
            <span className="block truncate text-xs text-foreground/70">
              {me.data?.companyName}
            </span>
          </span>
          <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-foreground/60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel>{me.data?.email ?? me.data?.companyName}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings aria-hidden />
            설정
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={onLogout}>
          <LogOut aria-hidden />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
