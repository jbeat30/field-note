import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 필터·태그 선택용 알약 버튼 (터치 영역 44px, 선택 상태는 aria-pressed)
export const Chip = ({
  className,
  selected = false,
  ...props
}: ComponentProps<'button'> & { selected?: boolean }) => (
  <button
    type="button"
    aria-pressed={selected}
    className={cn(
      'inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:h-8',
      selected
        ? 'border-foreground bg-foreground text-surface'
        : 'border-control-border bg-surface text-foreground/75 hover:border-control-border-hover hover:text-foreground',
      className,
    )}
    {...props}
  />
);
