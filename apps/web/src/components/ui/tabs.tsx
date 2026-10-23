import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export const Tabs = TabsPrimitive.Root;

// 트랙 안의 알약: 선택한 탭은 잉크 채움
export const TabsList = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cn(
      'flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-track p-1',
      className,
    )}
    {...props}
  />
);

export const TabsTrigger = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      'min-h-10 rounded-full px-4 text-[15px] font-semibold whitespace-nowrap text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground data-[state=active]:bg-primary data-[state=active]:font-bold data-[state=active]:text-primary-foreground',
      className,
    )}
    {...props}
  />
);

export const TabsContent = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content className={cn('pt-5', className)} {...props} />
);
