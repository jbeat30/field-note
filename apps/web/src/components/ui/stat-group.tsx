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
  default: 'text-foreground',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
};

// 큰 숫자 + 라벨 여러 개를 한 상자에 칸만 나눠 보여 줌 (카드 여러 개를 늘어놓지 않음)
// 넓은 화면은 한 줄, 좁은 화면은 2열
export const StatGroup = ({ items, className }: { items: StatItem[]; className?: string }) => (
  <dl
    className={cn(
      'grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface-subtle sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none',
      className,
    )}
  >
    {items.map((item, index) => (
      <div
        key={item.label}
        className={cn(
          'flex min-w-0 flex-col gap-1 px-4 py-3.5',
          // 칸 사이 구분선: 좁은 화면은 2열 격자, 넓은 화면은 세로선만
          index % 2 === 1 && 'border-l border-line',
          index >= 2 && 'border-t border-line sm:border-t-0',
          index > 0 && 'sm:border-l',
        )}
      >
        <dt className="text-[13px] text-foreground/65">{item.label}</dt>
        <dd
          className={cn(
            'flex items-baseline gap-1 text-xl font-semibold tabular-nums',
            TONE[item.tone ?? 'default'],
          )}
        >
          {item.value}
          {item.unit && <span className="text-sm font-medium text-foreground/65">{item.unit}</span>}
        </dd>
        {item.hint && <dd className="text-xs text-foreground/65">{item.hint}</dd>}
      </div>
    ))}
  </dl>
);
