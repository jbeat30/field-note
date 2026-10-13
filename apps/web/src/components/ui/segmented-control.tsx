import { ToggleGroup } from 'radix-ui';

import { cn } from '../../lib/cn';

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: Option<T>[];
  'aria-label': string;
};

// 서로 배타적인 2~4개 보기 전환 (화살표 키 이동, 선택 해제 불가)
export const SegmentedControl = <T extends string>({
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) => (
  <ToggleGroup.Root
    type="single"
    value={value}
    // 같은 항목을 다시 눌러 값이 비어도 선택을 유지
    onValueChange={(next) => next && onValueChange(next as T)}
    aria-label={ariaLabel}
    className="inline-flex w-full rounded-full bg-muted p-1"
  >
    {options.map((option) => (
      <ToggleGroup.Item
        key={option.value}
        value={option.value}
        className={cn(
          'min-h-10 flex-1 rounded-full px-3 text-sm font-semibold text-foreground/70 transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-primary data-[state=on]:bg-surface data-[state=on]:text-foreground data-[state=on]:shadow-card',
        )}
      >
        {option.label}
      </ToggleGroup.Item>
    ))}
  </ToggleGroup.Root>
);
