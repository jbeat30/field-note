import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router';

import { Tooltip } from '../components/ui/tooltip';
import { cn } from '../lib/cn';

import { BrandLogo } from './BrandLogo';
import { SIDEBAR_GROUPS } from './navItems';
import { ProfileMenu } from './ProfileMenu';

type AppSidebarProps = {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

// 넓은 화면(lg)은 잉크 사이드바(펼침 248px, 접힘 96px), 태블릿(md)은 아이콘과 글자가 세로로 놓인 92px 레일
// 접힘은 넓은 화면에서만 가능하며 접으면 아이콘만 보이고 이름은 마우스를 올렸을 때 나옴
export const AppSidebar = ({ isCollapsed, onToggleCollapsed }: AppSidebarProps) => (
  <aside
    className={cn(
      'sticky top-0 hidden h-dvh w-[92px] shrink-0 flex-col gap-5 bg-sidebar p-3 text-[#f4eee0] transition-[width] duration-(--duration-base) ease-(--ease-smooth) md:flex lg:p-4 print:hidden',
      isCollapsed ? 'lg:w-24' : 'lg:w-[264px]',
    )}
  >
    <div
      className={cn(
        'flex items-center gap-2 px-1 pt-2',
        isCollapsed ? 'justify-center' : 'justify-center lg:justify-between',
      )}
    >
      <BrandLogo onInk markOnly={isCollapsed} compactBelowLg />
      <button
        type="button"
        aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        aria-expanded={!isCollapsed}
        onClick={onToggleCollapsed}
        className={cn(
          'hidden size-9 shrink-0 items-center justify-center rounded-full text-[#f4eee0]/75 hover:bg-white/10 hover:text-[#f4eee0] focus-visible:outline-2 focus-visible:outline-accent lg:flex',
          isCollapsed && 'lg:hidden',
        )}
      >
        <PanelLeftClose aria-hidden className="size-5" />
      </button>
    </div>
    {isCollapsed && (
      <button
        type="button"
        aria-label="사이드바 펼치기"
        aria-expanded={false}
        onClick={onToggleCollapsed}
        className="mx-auto hidden size-10 items-center justify-center rounded-full text-[#f4eee0]/75 hover:bg-white/10 hover:text-[#f4eee0] focus-visible:outline-2 focus-visible:outline-accent lg:flex"
      >
        <PanelLeftOpen aria-hidden className="size-5" />
      </button>
    )}
    <nav aria-label="주 메뉴" className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {SIDEBAR_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-1.5">
          <p
            className={cn(
              'hidden px-3 pb-1 text-xs font-bold text-[#f4eee0]/55',
              !isCollapsed && 'lg:block',
            )}
          >
            {group.title}
          </p>
          {group.items.map((item) => {
            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                aria-label={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-touch flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-accent',
                    isCollapsed
                      ? 'lg:size-12 lg:self-center lg:p-0'
                      : 'lg:flex-row lg:justify-start lg:gap-3 lg:px-3.5 lg:py-0 lg:text-sm',
                    isActive
                      ? 'bg-accent text-[#14110d]'
                      : 'text-[#f4eee0]/75 hover:bg-white/10 hover:text-[#f4eee0]',
                  )
                }
              >
                <item.icon aria-hidden className="size-5 shrink-0" />
                <span className={cn(isCollapsed && 'lg:hidden')}>{item.label}</span>
              </NavLink>
            );

            return isCollapsed ? (
              <Tooltip key={item.to} content={item.label} side="right">
                <span className="flex flex-col">{link}</span>
              </Tooltip>
            ) : (
              link
            );
          })}
        </div>
      ))}
    </nav>
    <div
      className={cn(
        'flex flex-col items-center gap-1 border-t border-white/10 pt-4',
        !isCollapsed && 'lg:flex-row',
      )}
    >
      <ProfileMenu compact={isCollapsed} />
    </div>
  </aside>
);
