import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 입력 칸 공통 모양 (Input·Textarea·Select·날짜·콤보박스가 같이 씀)
export const controlClass =
  'w-full rounded-control border border-control-border bg-surface px-3 text-base text-foreground shadow-xs transition-[border-color,box-shadow] duration-(--duration-fast) placeholder:text-foreground/60 hover:border-control-border-hover focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-foreground/60 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/15 md:text-[15px]';

// 터치 영역 모바일 44px·넓은 화면 40px, 오류 상태는 aria-invalid로 표시
export const Input = ({ className, ...props }: ComponentProps<'input'>) => (
  <input className={cn(controlClass, 'min-h-11 md:min-h-10', className)} {...props} />
);
