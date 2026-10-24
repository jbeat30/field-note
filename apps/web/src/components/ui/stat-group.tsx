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
  // 타일 면을 직접 정할 때 (기본은 자리에 따라 라임·크림·잉크)
  surface?: 'lime' | 'cream' | 'ink' | 'accent';
};

const TONE: Record<NonNullable<StatItem['tone']>, string> = {
  default: '',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
};

// 잉크 타일은 바탕이 어두워 상태색을 밝은 쪽으로 씀
const TONE_ON_INK: Record<NonNullable<StatItem['tone']>, string> = {
  default: '',
  warning: 'text-[#f3d070]',
  danger: 'text-[#ff9d90]',
  success: 'text-[#7fd6a8]',
};

// 라임 타일은 다크 모드에서도 밝은 면이라 상태색을 어두운 쪽으로 고정
const TONE_ON_LIME: Record<NonNullable<StatItem['tone']>, string> = {
  default: '',
  warning: 'text-[#6b4700]',
  danger: 'text-[#8f1d17]',
  success: 'text-[#0f5f33]',
};

// 칸 면: 첫 칸은 라임, 가운데는 크림, 칸이 네 개일 때만 마지막이 잉크(주황 숫자)
type Tile = {
  tile: string;
  sub: string;
  num: string;
  tones?: Record<NonNullable<StatItem['tone']>, string>;
};

const LIME: Tile = {
  tile: 'tile-lime bg-highlight text-[#14110d]',
  sub: 'text-[#14110d]/70',
  num: '',
  tones: TONE_ON_LIME,
};
const CREAM: Tile = {
  tile: 'tile-cream bg-surface-subtle text-foreground',
  sub: 'text-sub',
  num: '',
};
const INK: Tile = {
  tile: 'tile-ink bg-[#14110d] text-[#efe6d2]',
  sub: 'text-[#efe6d2]/80',
  num: 'text-accent',
  tones: TONE_ON_INK,
};

const ACCENT: Tile = {
  tile: 'tile-accent bg-accent text-[#14110d]',
  sub: 'text-[#14110d]/85',
  num: '',
  tones: { default: '', warning: '', danger: '', success: '' },
};

const SURFACES: Record<NonNullable<StatItem['surface']>, Tile> = {
  lime: LIME,
  cream: CREAM,
  ink: INK,
  accent: ACCENT,
};

const tileOf = (index: number, count: number, surface?: StatItem['surface']): Tile =>
  surface ? SURFACES[surface] : index === 0 ? LIME : count === 4 && index === 3 ? INK : CREAM;

// 큰 숫자 + 라벨을 두께 있는 타일로 나열, 넓은 화면은 한 줄, 좁은 화면은 2열
export const StatGroup = ({ items, className }: { items: StatItem[]; className?: string }) => (
  <dl
    className={cn(
      'grid grid-cols-2 gap-2.5 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none md:gap-4',
      className,
    )}
  >
    {items.map((item, index) => {
      const style = tileOf(index, items.length, item.surface);
      const isLong = typeof item.value === 'string' && item.value.length > 7;

      return (
        <div
          key={item.label}
          className={cn(
            'flex min-w-0 flex-col justify-between gap-2 rounded-[24px] px-4 pt-4 pb-3.5 md:rounded-[30px] md:px-6 md:py-[22px]',
            style.tile,
          )}
        >
          <dt className={cn('text-[12.5px] font-semibold md:text-sm', style.sub)}>{item.label}</dt>
          <dd
            className={cn(
              'flex flex-wrap items-baseline gap-x-1 font-emphasis font-semibold tracking-tight tabular-nums',
              // 짧은 숫자는 크게, 글자나 긴 값은 한 줄에 들어가도록 한 단계 작게
              isLong ? 'text-[24px] md:text-[32px]' : 'text-[34px] md:text-[54px]',
              style.num,
              (style.tones ?? TONE)[item.tone ?? 'default'],
            )}
          >
            {item.value}
            {item.unit && (
              <span
                className={cn(
                  'ml-1 font-sans text-[13px] font-semibold md:ml-1.5 md:text-base',
                  style.sub,
                )}
              >
                {item.unit}
              </span>
            )}
          </dd>
          {item.hint && (
            <dd className={cn('min-h-4 text-[12.5px] font-semibold', style.sub)}>{item.hint}</dd>
          )}
        </div>
      );
    })}
  </dl>
);
