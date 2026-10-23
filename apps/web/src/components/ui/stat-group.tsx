import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type StatItem = {
  label: string;
  value: ReactNode;
  // 숫자 뒤 작은 단위 ("시간", "원", "명")
  unit?: string;
  // 숫자 아래 보조 설명 (비교·기준 등)
  hint?: ReactNode;
  // 경고·위험 수치는 색을 바꿈 (글자로도 hint에 뜻을 함께 씀)
  tone?: 'default' | 'warning' | 'danger' | 'success';
};

const TONE: Record<NonNullable<StatItem['tone']>, string> = {
  default: '',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
};

// 칸 면 순서: 라임, 크림, 크림, 잉크(주황 숫자), 이후 반복
const TILES = [
  { tile: 'tile-lime bg-highlight text-[#14110d]', sub: 'text-[#14110d]/70', num: '' },
  { tile: 'tile-cream bg-surface-subtle text-foreground', sub: 'text-foreground/65', num: '' },
  { tile: 'tile-cream bg-surface-subtle text-foreground', sub: 'text-foreground/65', num: '' },
  { tile: 'tile-ink bg-[#14110d] text-[#fbf7ee]', sub: 'text-[#fbf7ee]/70', num: 'text-accent' },
] as const;

// 큰 숫자 + 라벨을 두께 있는 타일로 나열, 넓은 화면은 한 줄, 좁은 화면은 2열
export const StatGroup = ({ items, className }: { items: StatItem[]; className?: string }) => (
  <dl
    className={cn(
      'grid grid-cols-2 gap-3 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none',
      className,
    )}
  >
    {items.map((item, index) => {
      const style = TILES[index % TILES.length];

      return (
        <div
          key={item.label}
          className={cn('flex min-w-0 flex-col gap-1 rounded-3xl px-5 py-4', style.tile)}
        >
          <dt className={cn('text-[13px] font-bold', style.sub)}>{item.label}</dt>
          <dd
            className={cn(
              'flex items-baseline gap-1 font-emphasis text-[34px] font-semibold tracking-tight tabular-nums md:text-[44px]',
              style.num,
              TONE[item.tone ?? 'default'],
            )}
          >
            {item.value}
            {item.unit && (
              <span className={cn('font-sans text-sm font-bold', style.sub)}>{item.unit}</span>
            )}
          </dd>
          {item.hint && <dd className={cn('text-xs font-medium', style.sub)}>{item.hint}</dd>}
        </div>
      );
    })}
  </dl>
);
