import type { ComponentProps } from 'react';

import { cn } from '../lib/cn';

// 카카오 브랜드 색(노란 배경 + 어두운 글자). 터치 영역 최소 44px
export const KakaoButton = ({ className, children, ...props }: ComponentProps<'button'>) => (
  <button
    type="button"
    className={cn(
      'inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-md bg-[#fee500] px-4 text-base font-medium text-[#191919] transition-colors hover:bg-[#f0d800] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191919] disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {children}
  </button>
);
