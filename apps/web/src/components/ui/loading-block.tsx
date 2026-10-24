import { cn } from '../../lib/cn';

import { Skeleton } from './skeleton';

// 줄 폭을 조금씩 달리해 글 줄처럼 보이게 함
const LINE_WIDTHS = ['w-full', 'w-4/5', 'w-3/5'];

type LoadingBlockProps = {
  // 스크린 리더에 읽어 주는 안내 (예: 프로젝트를 불러오는 중)
  label: string;
  // 보여 줄 줄 수
  lines?: number;
  className?: string;
};

// 불러오는 동안 내용 자리를 막대로 채움 (안내 글은 눈에는 숨기고 스크린 리더에만 전달)
export const LoadingBlock = ({ label, lines = 3, className }: LoadingBlockProps) => (
  <div role="status" aria-busy className={cn('flex flex-col gap-2.5', className)}>
    <span className="sr-only">{label}</span>
    {Array.from({ length: lines }, (_, index) => (
      <Skeleton key={index} className={cn('h-5', LINE_WIDTHS[index % LINE_WIDTHS.length])} />
    ))}
  </div>
);
