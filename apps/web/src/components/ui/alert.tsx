import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 폼 전체 오류·안내 (스크린 리더가 즉시 읽도록 role 지정)
export const Alert = ({
  className,
  variant = 'danger',
  ...props
}: ComponentProps<'div'> & { variant?: 'danger' | 'info' }) => (
  <div
    role={variant === 'danger' ? 'alert' : 'status'}
    className={cn(
      'rounded-md border px-3 py-2 text-sm',
      variant === 'danger' ? 'border-danger text-danger' : 'border-border bg-muted',
      className,
    )}
    {...props}
  />
);
