import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const DOT: Record<Tone, string> = {
  neutral: 'bg-foreground/35',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

// 상태·경고를 작은 점 + 글자로 표시 (빨간 상자 대체), 색만으로 뜻을 전하지 않도록 글자 필수 병행
export const StatusDot = ({
  tone = 'neutral',
  className,
  children,
  ...props
}: ComponentProps<'span'> & { tone?: Tone }) => (
  <span
    className={cn('inline-flex items-center gap-1.5 text-sm text-foreground/80', className)}
    {...props}
  >
    <span aria-hidden className={cn('size-2 shrink-0 rounded-full', DOT[tone])} />
    {children}
  </span>
);
