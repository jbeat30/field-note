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
    className={cn('inline-flex w-full rounded-full bg-track p-1', className)}
  >
    {options.map((option) => (
      <ToggleGroup.Item
        key={option.value}
        value={option.value}
        className={cn(
          'flex-1 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-foreground/70 transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground data-[state=on]:bg-primary data-[state=on]:font-bold data-[state=on]:text-primary-foreground',
          size === 'sm' ? 'h-9' : 'h-11',
        )}
      >
        {option.label}
      </ToggleGroup.Item>
    ))}
  </ToggleGroup.Root>
);
