import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { cn } from '../../lib/cn';

type PaginationProps = {
  // 1부터 시작
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
};

// 현재 쪽 주변만 보여 주는 쪽 번호 목록 (처음·끝 쪽은 항상 포함, 건너뛴 곳은 null)
export const pageWindow = (page: number, pageCount: number): (number | null)[] => {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);
  const result: (number | null)[] = [];

  for (const [index, value] of sorted.entries()) {
    const previous = sorted[index - 1];

    if (previous !== undefined && value - previous > 1) result.push(null);
    result.push(value);
  }

  return result;
};

const buttonClass =
  'inline-flex size-10 items-center justify-center rounded-lg text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40';

// 목록 아래 쪽 이동: « ‹ 1 2 3 … 9 › »
export const Pagination = ({ page, pageCount, onPageChange, className }: PaginationProps) => {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="쪽 이동" className={cn('flex items-center justify-center gap-1', className)}>
      <button
        type="button"
        aria-label="첫 쪽"
        className={buttonClass}
        disabled={page === 1}
        onClick={() => onPageChange(1)}
      >
        <ChevronsLeft aria-hidden className="size-4" />
      </button>
      <button
        type="button"
        aria-label="이전 쪽"
        className={buttonClass}
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      {pageWindow(page, pageCount).map((value, index) =>
        value === null ? (
          <span key={`gap-${index}`} aria-hidden className="px-1 text-sub">
            …
          </span>
        ) : (
          <button
            key={value}
            type="button"
            aria-label={`${value}쪽`}
            aria-current={value === page ? 'page' : undefined}
            className={cn(
              buttonClass,
              value === page && 'bg-primary text-primary-foreground hover:bg-primary',
            )}
            onClick={() => onPageChange(value)}
          >
            {value}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="다음 쪽"
        className={buttonClass}
        disabled={page === pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight aria-hidden className="size-4" />
      </button>
      <button
        type="button"
        aria-label="마지막 쪽"
        className={buttonClass}
        disabled={page === pageCount}
        onClick={() => onPageChange(pageCount)}
      >
        <ChevronsRight aria-hidden className="size-4" />
      </button>
    </nav>
  );
};
