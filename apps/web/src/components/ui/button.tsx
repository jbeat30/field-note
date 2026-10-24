import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 버튼: 크기 단계는 입력 칸(controlSize)과 같은 높이 규칙, 모서리는 18px
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-bold whitespace-nowrap transition-[background-color,border-color,transform,opacity] duration-(--duration-fast) ease-(--ease-smooth) select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:scale-[0.98] disabled:pointer-events-none disabled:bg-line disabled:text-sub [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // 가장 중요한 동작 (한 화면에 하나): 잉크 면
        primary: 'bg-primary text-primary-foreground hover:bg-primary/85',
        // 보조 동작: 모래 면과 옅은 테두리 (바탕과 같은 모래색 위에서도 3 대 1 이상으로 버튼 모양이 보임)
        secondary: 'border-2 border-input-border bg-field text-foreground hover:bg-line',
        // 가볍게 강조: 라임 면
        soft: 'bg-highlight text-[#14110d] hover:brightness-95',
        // 잉크 면 위에서 지금 해야 할 동작: 주황 면 (홈의 기록하기 같은 버튼)
        accent: 'bg-accent text-[#14110d] hover:brightness-95',
        // 글자만 있는 동작 (표 안의 "자세히", 구역 제목 옆 "전체 보기")
        link: 'h-auto! px-0! font-semibold hover:text-sub disabled:bg-transparent',
        // 바탕 없는 동작 (아이콘 버튼·표 안의 동작)
        ghost: 'text-foreground/80 hover:bg-field hover:text-foreground disabled:bg-transparent',
        // 되돌리기 어려운 동작 (삭제·취소)
        danger: 'bg-danger text-white hover:bg-danger/90 dark:text-[#14110d]',
      },
      size: {
        sm: 'h-10 px-4 text-sm [&_svg]:size-4',
        md: 'h-12 px-5 text-[15px] [&_svg]:size-4.5',
        lg: 'h-14 px-6 text-base [&_svg]:size-5',
        // 글자 없는 정사각 버튼 (aria-label 필수)
        'icon-sm': 'size-10 px-0 [&_svg]:size-4',
        icon: 'size-12 px-0 [&_svg]:size-5',
        'icon-lg': 'size-14 px-0 [&_svg]:size-5',
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

// 화면 위쪽 행동 줄용 알약 버튼: 잉크 알약 안에 주황 아이콘 원 (프로젝트 등록, 폴더 더하기 아이콘)
export const pillIconButtonClass =
  'inline-flex h-[50px] shrink-0 items-center gap-2.5 rounded-full bg-[#14110d] pr-5 pl-1.5 text-[15px] font-bold whitespace-nowrap text-[#fbf7ee] transition-opacity duration-(--duration-fast) hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground [&>svg:first-child]:box-content [&>svg:first-child]:size-[18px] [&>svg:first-child]:rounded-full [&>svg:first-child]:bg-accent [&>svg:first-child]:p-[10px] [&>svg:first-child]:text-[#14110d]';

// 화면 위쪽 행동 줄용 크림 알약 버튼 (인력 배치 보기, 월 공수표 같은 이동 버튼)
export const pillButtonClass =
  'inline-flex h-[50px] shrink-0 items-center gap-2 rounded-full bg-[#fbf7ee] px-5 text-[15px] font-bold whitespace-nowrap text-[#14110d] transition-opacity duration-(--duration-fast) hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground';
