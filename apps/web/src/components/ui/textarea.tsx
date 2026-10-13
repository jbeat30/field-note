import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

import { controlClass } from './input';

export const Textarea = ({ className, ...props }: ComponentProps<'textarea'>) => (
  <textarea className={cn(controlClass, 'min-h-24 py-2.5', className)} {...props} />
);
