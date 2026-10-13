import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 터치 영역 최소 44px, 오류 상태는 aria-invalid로 표시
export const Input = ({ className, ...props }: ComponentProps<'input'>) => (
  <input
    className={cn(
      'min-h-touch w-full rounded-md border border-border bg-surface placeholder:text-foreground/70 hover:border-border-strong transition-colors duration-(--duration-fast) px-3 text-base focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary/40 disabled:opacity-50 aria-[invalid=true]:border-danger',
      className,
    )}
    {...props}
  />
);
