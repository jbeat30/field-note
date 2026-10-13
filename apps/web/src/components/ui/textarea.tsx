import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export const Textarea = ({ className, ...props }: ComponentProps<'textarea'>) => (
  <textarea
    className={cn(
      'min-h-24 w-full rounded-md border border-border bg-surface placeholder:text-foreground/70 hover:border-border-strong transition-colors duration-(--duration-fast) px-3 py-2 text-base focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary/40 disabled:opacity-50 aria-[invalid=true]:border-danger',
      className,
    )}
    {...props}
  />
);
