import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../../lib/cn';

// 입력 칸 공통 모양 (Input·Textarea·Select·날짜·콤보박스가 같이 씀). 크기는 controlSize로 따로 정함
export const controlClass =
  'w-full rounded-control border border-control-border bg-surface text-foreground shadow-xs transition-[border-color,box-shadow] duration-(--duration-fast) placeholder:text-foreground/55 hover:border-control-border-hover focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-foreground/65 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/15';

// 크기 단계 (모바일 / 넓은 화면): sm 36/32 표·필터 줄, md 44/40 일반 폼, lg 52/48 현장 입력
// 입력·셀렉트·콤보박스·날짜·버튼이 같은 단계를 써서 한 줄에 놓으면 높이가 맞는다
export const controlSize = cva('', {
  variants: {
    size: {
      sm: 'h-9 px-2.5 text-sm md:h-8',
      md: 'h-11 px-3 text-base md:h-10 md:text-[15px]',
      lg: 'h-13 px-4 text-base md:h-12',
    },
  },
  defaultVariants: { size: 'md' },
});

export type ControlSize = NonNullable<VariantProps<typeof controlSize>['size']>;

// 앞뒤 붙임 글자·아이콘 자리 너비 (크기 단계별)
const ADORNMENT_PAD: Record<ControlSize, { start: string; end: string }> = {
  sm: { start: 'pl-8', end: 'pr-9' },
  md: { start: 'pl-10', end: 'pr-11' },
  lg: { start: 'pl-11', end: 'pr-12' },
};

type InputProps = Omit<ComponentProps<'input'>, 'size'> & {
  size?: ControlSize;
  // 칸 안 왼쪽 아이콘 (검색 돋보기 등, 장식용)
  startAdornment?: ReactNode;
  // 칸 안 오른쪽 단위·아이콘 ("원", "시간" 등)
  endAdornment?: ReactNode;
};

// 터치 영역 모바일 44px·넓은 화면 40px(md 기준), 오류 상태는 aria-invalid로 표시
export const Input = ({
  className,
  size = 'md',
  startAdornment,
  endAdornment,
  ...props
}: InputProps) => {
  const input = (
    <input
      className={cn(
        controlClass,
        controlSize({ size }),
        startAdornment && ADORNMENT_PAD[size].start,
        endAdornment && ADORNMENT_PAD[size].end,
        className,
      )}
      {...props}
    />
  );

  if (!startAdornment && !endAdornment) return input;

  return (
    <div className="relative w-full">
      {startAdornment && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-foreground/65 [&_svg]:size-4.5">
          {startAdornment}
        </span>
      )}
      {input}
      {endAdornment && (
        <span className="pointer-events-none absolute inset-y-0 right-0 flex min-w-10 items-center justify-center pr-3 text-sm text-foreground/65">
          {endAdornment}
        </span>
      )}
    </div>
  );
};
