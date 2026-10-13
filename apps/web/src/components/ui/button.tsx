import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 버튼: 크기 단계는 입력 칸(controlSize)과 같아 한 줄에 놓으면 높이가 맞는다. 모서리도 입력 칸과 같은 값
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-[background-color,border-color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-smooth) select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
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
        // 글자만 있는 동작 (표 안의 "자세히", 구역 제목 옆 "전체 보기")
        link: 'h-auto! px-0! text-primary underline-offset-4 hover:underline',
        // 바탕 없는 동작 (아이콘 버튼·표 안의 동작)
        ghost: 'text-foreground/80 hover:bg-muted hover:text-foreground',
        // 되돌리기 어려운 동작 (삭제·취소)
        danger: 'bg-danger text-primary-foreground shadow-xs hover:bg-danger/90',
      },
      size: {
        sm: 'h-9 px-3 text-sm md:h-8 [&_svg]:size-4',
        md: 'h-11 px-4 text-[15px] md:h-10 [&_svg]:size-4.5',
        lg: 'h-13 px-5 text-base md:h-12 [&_svg]:size-5',
        // 글자 없는 정사각 버튼 (aria-label 필수)
        'icon-sm': 'size-9 px-0 md:size-8 [&_svg]:size-4',
        icon: 'size-11 px-0 md:size-10 [&_svg]:size-5',
        'icon-lg': 'size-13 px-0 md:size-12 [&_svg]:size-5',
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
