import { ToggleGroup } from 'radix-ui';

import { cn } from '../../lib/cn';

import type { ControlSize } from './input';

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: Option<T>[];
  'aria-label': string;
  size?: Exclude<ControlSize, 'lg'>;
  className?: string;
};

// 서로 배타적인 2~4개 보기 전환 (화살표 키 이동, 선택 해제 불가)
export const SegmentedControl = <T extends string>({
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
  size = 'md',
  className,
}: SegmentedControlProps<T>) => (
  <ToggleGroup.Root
    type="single"
    value={value}
    // 같은 항목을 다시 눌러 값이 비어도 선택을 유지
    onValueChange={(next) => next && onValueChange(next as T)}
    aria-label={ariaLabel}
    className={cn('inline-flex w-full rounded-control bg-foreground/6 p-0.5', className)}
  >
    {options.map((option) => (
      <ToggleGroup.Item
        key={option.value}
        value={option.value}
        className={cn(
          'flex-1 rounded-md px-3 text-sm font-medium whitespace-nowrap text-foreground/65 transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary data-[state=on]:bg-surface data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:shadow-xs',
          size === 'sm' ? 'h-8 md:h-7' : 'h-10 md:h-9',
        )}
      >
        {option.label}
      </ToggleGroup.Item>
    ))}
  </ToggleGroup.Root>
);
