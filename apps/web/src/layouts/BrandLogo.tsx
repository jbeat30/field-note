import { APP_NAME } from '@field-note/shared';

import { cn } from '../lib/cn';

type BrandLogoProps = {
  // 어두운 면(사이드바) 위에서는 글자를 크림색, 막대를 주황으로
  onInk?: boolean;
  // 이름 글자를 숨기고 마크만 보임 (사이드바 접힘)
  markOnly?: boolean;
  // 태블릿 레일처럼 좁은 폭(lg 미만)에서는 마크만 보임
  compactBelowLg?: boolean;
  // lg는 로그인 전 화면, sm은 사이드바와 모바일 상단 줄
  size?: 'sm' | 'lg';
  className?: string;
};

// 막대 세 줄의 높이·폭·들여쓰기: 시안의 로그인 크기와 사이드바 크기
const BARS = {
  lg: {
    gap: 'gap-1',
    height: 'h-[7px]',
    widths: ['w-[30px]', 'w-5', 'w-[26px]'],
    indents: ['', 'ml-2.5', 'ml-1'],
  },
  sm: {
    gap: 'gap-[3px]',
    height: 'h-[5px]',
    widths: ['w-5', 'w-3.5', 'w-[17px]'],
    indents: ['', 'ml-1.5', 'ml-[3px]'],
  },
} as const;

// 세 줄 막대 마크 + 서비스 이름 + 베타 표시
export const BrandLogo = ({
  onInk = false,
  markOnly = false,
  compactBelowLg = false,
  size = 'sm',
  className,
}: BrandLogoProps) => {
  const bars = BARS[size];
  const tone = onInk ? 'bg-accent' : 'bg-[#14110d]';
  const isLarge = size === 'lg';

  return (
    <span
      className={cn(
        'inline-flex items-center',
        isLarge ? 'gap-3.5' : 'gap-2.5',
        onInk ? 'text-[#fbf7ee]' : 'text-[#14110d]',
        className,
      )}
    >
      <span aria-hidden className={cn('flex flex-col', bars.gap)}>
        {bars.widths.map((width, index) => (
          <span
            key={width}
            className={cn('rounded-[3px]', bars.height, width, bars.indents[index], tone)}
          />
        ))}
      </span>
      {!markOnly && (
        <>
          <span
            className={cn(
              'font-emphasis font-bold tracking-[-0.03em] whitespace-nowrap',
              isLarge ? 'text-[28px]' : 'text-xl',
              compactBelowLg && 'hidden lg:inline',
            )}
          >
            {APP_NAME}
          </span>
          <span
            className={cn(
              'rounded-full border-[1.5px] font-bold whitespace-nowrap',
              isLarge ? 'px-2.5 py-0.5 text-xs' : 'px-2 text-[11px] leading-[18px]',
              compactBelowLg && 'hidden lg:inline',
              onInk ? 'border-[#fbf7ee]' : 'border-[#14110d]',
            )}
          >
            베타
          </span>
        </>
      )}
    </span>
  );
};
