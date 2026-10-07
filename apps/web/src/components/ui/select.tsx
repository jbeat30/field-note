import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 모바일에서 기기 기본 선택 화면을 쓰도록 네이티브 select 사용 (터치 영역 44px 이상)
export const Select = ({ className, ...props }: ComponentProps<'select'>) => (
  <select
    className={cn(
      'min-h-touch w-full rounded-md border border-border bg-surface px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50 aria-[invalid=true]:border-danger',
      className,
    )}
    {...props}
  />
);
