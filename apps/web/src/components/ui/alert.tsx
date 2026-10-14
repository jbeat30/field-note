import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

type Variant = 'danger' | 'info' | 'success' | 'warning';

const STYLE: Record<Variant, { box: string; icon: typeof Info; iconClass: string }> = {
  danger: {
    box: 'border-danger/30 bg-danger-subtle text-danger',
    icon: CircleAlert,
    iconClass: 'text-danger',
  },
  warning: {
    box: 'border-warning/30 bg-warning-subtle text-foreground',
    icon: TriangleAlert,
    iconClass: 'text-warning',
  },
  success: {
    box: 'border-success/30 bg-success-subtle text-foreground',
    icon: CircleCheck,
    iconClass: 'text-success',
  },
  info: {
    box: 'border-primary/20 bg-primary-subtle text-foreground',
    icon: Info,
    iconClass: 'text-primary',
  },
};

// 폼 전체 오류·안내 (오류는 스크린 리더가 즉시 읽도록 role=alert)
export const Alert = ({
  className,
  variant = 'danger',
  children,
  ...props
}: ComponentProps<'div'> & { variant?: Variant }) => {
  const style = STYLE[variant];

  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        style.box,
        className,
      )}
      {...props}
    >
      <style.icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', style.iconClass)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};
