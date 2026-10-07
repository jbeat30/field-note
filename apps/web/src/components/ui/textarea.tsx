import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export const Textarea = ({ className, ...props }: ComponentProps<'textarea'>) => (
  <textarea
    className={cn(
      'min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50 aria-[invalid=true]:border-danger',
      className,
    )}
    {...props}
  />
);
