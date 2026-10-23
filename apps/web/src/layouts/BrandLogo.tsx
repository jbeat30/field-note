import { APP_NAME } from '@field-note/shared';

import { cn } from '../lib/cn';

type BrandLogoProps = {
  // 어두운 면(사이드바) 위에서는 글자와 막대를 크림색으로
  onInk?: boolean;
  // 이름 글자를 숨기고 마크만 보임 (사이드바 접힘)
  markOnly?: boolean;
  // 태블릿 레일처럼 좁은 폭(lg 미만)에서는 마크만 보임
  compactBelowLg?: boolean;
  className?: string;
};

// 세 줄 막대 마크 + 서비스 이름 + 베타 표시
export const BrandLogo = ({
  onInk = false,
  markOnly = false,
  compactBelowLg = false,
  className,
}: BrandLogoProps) => {
  const tone = onInk ? 'bg-[#fbf7ee]' : 'bg-[#14110d]';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-3.5',
        onInk ? 'text-[#fbf7ee]' : 'text-[#14110d]',
        className,
      )}
    >
      <span aria-hidden className="flex flex-col gap-1">
        <span className={cn('h-[7px] w-[30px] rounded', tone)} />
        <span className={cn('ml-2.5 h-[7px] w-5 rounded', tone)} />
        <span className={cn('ml-1 h-[7px] w-[26px] rounded', tone)} />
      </span>
      {!markOnly && (
        <>
          <span
            className={cn(
              'font-emphasis text-[28px] font-bold tracking-[-0.03em] whitespace-nowrap',
              compactBelowLg && 'hidden lg:inline',
            )}
          >
            {APP_NAME}
          </span>
          <span
            className={cn(
              'rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
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
