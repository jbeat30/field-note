import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 상태 표시용 작은 알약: 입체감 없는 옅은 면과 진한 글자, 색만으로 뜻을 전하지 않도록 항상 글자 병행
export const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-field text-foreground/80',
        primary: 'bg-accent-subtle text-foreground',
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        danger: 'bg-danger-subtle text-danger',
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
