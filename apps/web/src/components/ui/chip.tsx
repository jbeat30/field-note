import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 필터·태그 선택용 알약 버튼 (선택 상태는 aria-pressed): 선택은 잉크 채움, 비선택은 잉크 테두리
export const Chip = ({
  className,
  selected = false,
  ...props
}: ComponentProps<'button'> & { selected?: boolean }) => (
  <button
    type="button"
    aria-pressed={selected}
    className={cn(
      'inline-flex h-10 items-center rounded-full border-[1.5px] px-4 text-sm font-bold transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
      selected
        ? 'border-foreground bg-foreground text-surface'
        : 'border-foreground bg-transparent text-foreground hover:bg-field',
      className,
    )}
    {...props}
  />
);
