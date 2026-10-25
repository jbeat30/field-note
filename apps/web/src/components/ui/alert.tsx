import { Check, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

type Variant = 'danger' | 'info' | 'success' | 'warning';

// 네 종류 모두 면 색·테두리와 둥근 마크로 구분하고, 뜻은 글자로도 전함
// 마크 원은 종류색 면에 본문 면 색 글리프라 밝은 모드와 어두운 모드 모두 대비 유지
const STYLE: Record<Variant, { box: string; icon: LucideIcon; dot: string }> = {
  danger: {
    box: 'border-[#f3b8af] bg-danger-subtle text-danger',
    icon: TriangleAlert,
    dot: 'bg-danger text-surface',
  },
  warning: {
    box: 'border-[#e8d070] bg-warning-subtle text-foreground',
    icon: TriangleAlert,
    dot: 'bg-warning text-surface',
  },
  success: {
    box: 'border-[#a9dcc1] bg-success-subtle text-foreground',
    icon: Check,
    dot: 'bg-success text-surface',
  },
  info: {
    box: 'border-[#bfd0a0] bg-highlight text-[#14110d]',
    icon: Info,
    dot: 'bg-[#14110d] text-highlight',
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
        'flex items-start gap-3 rounded-[18px] border px-[15px] py-[13px] text-sm leading-[1.55] font-medium dark:border-transparent',
        style.box,
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'mt-px inline-flex size-[22px] shrink-0 items-center justify-center rounded-full',
          style.dot,
        )}
      >
        <style.icon className="size-3 stroke-[3]" />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};
