import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 켜고 끄는 스위치 (터치하기 쉽게 48×28), 이름은 aria-label이나 감싼 label로 지정
export const Switch = ({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) => (
  <SwitchPrimitive.Root
    className={cn(
      'relative h-7 w-12 shrink-0 rounded-full border border-transparent bg-border-strong transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 data-[state=checked]:bg-primary',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block size-5 translate-x-1 rounded-full bg-surface shadow-sm transition-transform duration-(--duration-fast) data-[state=checked]:translate-x-6" />
  </SwitchPrimitive.Root>
);
