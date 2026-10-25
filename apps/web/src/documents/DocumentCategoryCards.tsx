import type { OptionItem } from '@field-note/shared';

import { cn } from '../lib/cn';

type DocumentCategoryCardsProps = {
  // 보여 줄 문서 종류 (목록 관리의 순서, 숨긴 종류는 문서가 있을 때만)
  categories: readonly OptionItem[];
  // 종류별 문서 수 (검색어를 건 목록 기준, 종류 id로 셈)
  counts: Readonly<Record<string, number>>;
  total: number;
  // 고른 종류 id, 전체는 빈 값
  value: string;
  onChange: (value: string) => void;
};

// 문서 종류를 폴더 카드로: 문서 수를 보이고, 누르면 그 종류만 봄 (다시 누르면 전체)
export const DocumentCategoryCards = ({
  categories,
  counts,
  total,
  value,
  onChange,
}: DocumentCategoryCardsProps) => {
  const cards: { key: string; label: string; count: number }[] = [
    { key: '', label: '전체', count: total },
    ...categories.map((item) => ({ key: item.id, label: item.name, count: counts[item.id] ?? 0 })),
  ];

  return (
    <div
      role="group"
      aria-label="종류로 거르기"
      className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6"
    >
      {cards.map((card) => (
        <button
          key={card.key || 'ALL'}
          type="button"
          aria-pressed={value === card.key}
          onClick={() => onChange(value === card.key ? '' : card.key)}
          className={cn(
            'flex min-w-0 flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            value === card.key
              ? 'border-primary bg-primary-subtle'
              : 'border-line bg-surface hover:border-control-border-hover',
          )}
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold">{card.label}</span>
            <span className="text-sm tabular-nums text-sub">{card.count}</span>
          </span>
        </button>
      ))}
    </div>
  );
};
