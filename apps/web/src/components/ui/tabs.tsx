import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export const Tabs = TabsPrimitive.Root;

export const TabsList = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}
    {...props}
  />
);

export const TabsTrigger = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      '-mb-px min-h-touch border-b-2 border-transparent px-4 text-sm font-medium whitespace-nowrap text-foreground/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary data-[state=active]:border-primary data-[state=active]:text-primary',
      className,
    )}
    {...props}
  />
);

export const TabsContent = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content className={cn('pt-4', className)} {...props} />
);
