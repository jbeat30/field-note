import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 터치 영역 최소 44px (min-h-touch)
export const buttonVariants = cva(
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-full px-5 text-base font-semibold transition-colors duration-(--duration-fast) ease-(--ease-smooth) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        secondary: 'bg-muted text-foreground hover:bg-border',
        ghost: 'bg-transparent px-0 text-foreground hover:bg-muted',
        danger: 'bg-danger text-primary-foreground hover:bg-danger/90',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = ({ className, variant, asChild = false, ...props }: ButtonProps) => {
  const Component = asChild ? Slot.Root : 'button';

  return <Component className={cn(buttonVariants({ variant }), className)} {...props} />;
};
