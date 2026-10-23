import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 불러오는 동안 자리만 보여 주는 막대 (장식이므로 스크린 리더에서 숨김)
export const Skeleton = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    aria-hidden
    className={cn('animate-pulse rounded-md bg-surface-nested', className)}
    {...props}
  />
);
