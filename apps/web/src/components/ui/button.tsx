import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 버튼: 모바일은 터치하기 좋게 44px, 넓은 화면은 40px. 모서리는 입력 칸과 같은 값
export const buttonVariants = cva(
  'inline-flex min-w-11 shrink-0 items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-[background-color,border-color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-smooth) select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 md:min-w-10 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // 가장 중요한 동작 (한 화면에 하나)
        primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        // 보조 동작: 흰 바탕 + 윤곽선
        secondary:
          'border border-control-border bg-surface text-foreground shadow-xs hover:border-control-border-hover hover:bg-muted',
        // 가볍게 강조: 옅은 파랑
        soft: 'bg-primary-subtle text-primary hover:bg-primary-subtle/70',
        // 바탕 없는 동작 (아이콘 버튼·표 안의 동작)
        ghost: 'text-foreground/80 hover:bg-muted hover:text-foreground',
        // 되돌리기 어려운 동작 (삭제·취소)
        danger: 'bg-danger text-primary-foreground shadow-xs hover:bg-danger/90',
      },
      size: {
        sm: 'min-h-9 px-3 text-sm',
        md: 'min-h-11 px-4 text-[15px] md:min-h-10',
        lg: 'min-h-12 px-6 text-base',
        // 글자 없는 정사각 버튼 (aria-label 필수)
        icon: 'size-11 px-0 md:size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = ({ className, variant, size, asChild = false, ...props }: ButtonProps) => {
  const Component = asChild ? Slot.Root : 'button';

  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
};
