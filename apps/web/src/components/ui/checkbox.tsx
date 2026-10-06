import { Check } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 시각 크기는 24px이지만 라벨 전체를 눌러 선택하므로 터치 영역은 라벨이 보장
export const Checkbox = ({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) => (
  <CheckboxPrimitive.Root
    className={cn(
      'flex size-6 shrink-0 items-center justify-center rounded border border-border bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <Check aria-hidden className="size-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);
