import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 상태 표시용 작은 알약: 입체감 없는 파스텔 면과 진한 글자 (시안 배지 색), 색만으로 뜻을 전하지 않도록 항상 글자 병행
export const badgeVariants = cva(
  'inline-flex items-center rounded-full px-[11px] py-[3px] text-xs font-bold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-field text-[#5a5040] dark:text-sub',
        primary: 'bg-accent-subtle text-[#7a2e08] dark:text-foreground',
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        danger: 'bg-[#f8d4cd] text-[#8f1f17] dark:bg-danger-subtle dark:text-danger',
        // 베타처럼 상태가 아닌 표식: 잉크 면
        ink: 'bg-[#14110d] text-[#fbf7ee]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export const Badge = ({
  className,
  tone,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) => (
  <span className={cn(badgeVariants({ tone }), className)} {...props} />
);
