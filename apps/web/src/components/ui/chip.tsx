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
      'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:min-h-9',
      selected
        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
        : 'border-control-border bg-surface text-foreground/80 hover:border-control-border-hover hover:bg-muted',
      className,
    )}
    {...props}
  />
);
