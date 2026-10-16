import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_HINTS,
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
} from '@field-note/shared';

import { cn } from '../lib/cn';

type DocumentCategoryCardsProps = {
  // 분류별 문서 수 (검색어를 건 목록 기준)
  counts: Readonly<Partial<Record<DocumentCategory, number>>>;
  total: number;
  value: DocumentCategory | '';
  onChange: (value: DocumentCategory | '') => void;
};

// 분류를 폴더 카드로: 무엇을 올리는 곳인지 예시 한 줄과 문서 수를 보이고, 누르면 그 분류만 봄 (다시 누르면 전체)
export const DocumentCategoryCards = ({
  counts,
  total,
  value,
  onChange,
}: DocumentCategoryCardsProps) => {
  const cards: { key: DocumentCategory | ''; label: string; hint: string; count: number }[] = [
    { key: '', label: '전체', hint: '모든 분류', count: total },
    ...DOCUMENT_CATEGORIES.map((key) => ({
      key,
      label: DOCUMENT_CATEGORY_LABELS[key],
      hint: DOCUMENT_CATEGORY_HINTS[key] || '그 밖의 서류',
      count: counts[key] ?? 0,
    })),
  ];

  return (
    <div
      role="group"
      aria-label="분류로 거르기"
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
            <span className="font-semibold">{card.label}</span>
            <span className="text-sm tabular-nums text-foreground/65">{card.count}</span>
          </span>
          <span className="truncate text-xs text-foreground/65">{card.hint}</span>
        </button>
      ))}
    </div>
  );
};
