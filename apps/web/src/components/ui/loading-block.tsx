import type { CSSProperties } from 'react';

import { cn } from '../../lib/cn';

import { Skeleton } from './skeleton';

// 줄 폭을 조금씩 달리해 글 줄처럼 보이게 함
const LINE_WIDTHS = ['w-full', 'w-4/5', 'w-3/5'];

type LoadingBlockProps = {
  // 스크린 리더에 읽어 주는 안내 (예: 프로젝트를 불러오는 중)
  label: string;
  // lines 글 줄, rows 카드 목록 줄, table 카드 안의 제목과 표(좁은 화면은 카드 목록), page 제목과 큰 면이 있는 화면 전체, blocks 실제 카드 높이(px)를 그대로 지정한 면
  variant?: 'lines' | 'rows' | 'table' | 'page' | 'blocks';
  // 보여 줄 줄 수 (lines·rows)
  lines?: number;
  // 카드 높이 목록 (blocks), 좁은 화면은 기준 높이의 70%
  heights?: number[];
  className?: string;
};

// 불러오는 동안 내용 자리를 실제 모양과 비슷한 막대·면으로 채워 내용이 나올 때 위치가 흔들리지 않게 함
// 안내 글은 눈에는 숨기고 스크린 리더에만 전달
export const LoadingBlock = ({
  label,
  variant = 'lines',
  lines = 3,
  heights = [],
  className,
}: LoadingBlockProps) => (
  <div
    role="status"
    aria-busy
    className={cn(
      'flex flex-col',
      variant === 'lines' ? 'gap-2.5' : variant === 'blocks' ? 'gap-5' : 'gap-3',
      variant === 'table' && 'rounded-[30px] bg-surface-subtle p-5 sm:p-7',
      className,
    )}
  >
    <span className="sr-only">{label}</span>
    {variant === 'lines' &&
      Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn('h-5', LINE_WIDTHS[index % LINE_WIDTHS.length])} />
      ))}
    {variant === 'rows' &&
      Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className="h-[72px] w-full rounded-2xl" />
      ))}
    {variant === 'table' && (
      <>
        <Skeleton className="h-7 w-44" />
        <Skeleton className="hidden h-10 w-full md:block" />
        <div className="flex flex-col">
          {Array.from({ length: lines }, (_, index) => (
            // 실제 표의 줄 높이(47)와 좁은 화면 카드 높이(70)와 간격(8)에 맞춤
            <div key={index} className="flex h-[78px] items-start md:h-[47px] md:items-center">
              <Skeleton className="h-[70px] w-full rounded-2xl md:h-5 md:rounded-md" />
            </div>
          ))}
        </div>
      </>
    )}
    {variant === 'blocks' &&
      heights.map((height, index) => (
        <Skeleton
          key={index}
          className="h-(--block-h) rounded-[30px] md:h-(--block-h-md)"
          style={
            {
              '--block-h': `${Math.round(height * 0.7)}px`,
              '--block-h-md': `${height}px`,
            } as CSSProperties
          }
        />
      ))}
    {variant === 'page' && (
      <>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-3xl" />
      </>
    )}
  </div>
);
