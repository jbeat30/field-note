import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 터치 영역 최소 44px, 오류 상태는 aria-invalid로 표시
export const Input = ({ className, ...props }: ComponentProps<'input'>) => (
  <input
    className={cn(
      'min-h-touch w-full rounded-md border border-border bg-surface px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50 aria-[invalid=true]:border-danger',
      className,
    )}
    {...props}
  />
);
