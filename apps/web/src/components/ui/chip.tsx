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
      'inline-flex min-h-touch items-center rounded-full border px-4 text-sm font-medium transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      selected
        ? 'border-primary bg-primary-subtle text-primary'
        : 'border-border bg-surface text-foreground hover:bg-muted',
      className,
    )}
    {...props}
  />
);
