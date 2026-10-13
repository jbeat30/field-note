import { DropdownMenu as MenuPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

import { listboxContentClass, listboxItemClass, radixItemDisabledClass } from './listbox';

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;

export const DropdownMenuContent = ({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Content
      align="end"
      sideOffset={4}
      collisionPadding={12}
      className={cn(listboxContentClass, 'min-w-44 p-1', className)}
      {...props}
    />
  </MenuPrimitive.Portal>
);

// danger: 삭제처럼 되돌리기 어려운 동작은 빨간 글자
export const DropdownMenuItem = ({
  className,
  danger = false,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item> & { danger?: boolean }) => (
  <MenuPrimitive.Item
    className={cn(
      listboxItemClass,
      radixItemDisabledClass,
      '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-foreground/65',
      danger && 'text-danger [&_svg]:text-danger',
      className,
    )}
    {...props}
  />
);

export const DropdownMenuLabel = ({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Label>) => (
  <MenuPrimitive.Label
    className={cn('px-2.5 pt-2 pb-1 text-xs font-semibold text-foreground/65', className)}
    {...props}
  />
);

export const DropdownMenuSeparator = ({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) => (
  <MenuPrimitive.Separator className={cn('my-1 h-px bg-line', className)} {...props} />
);
