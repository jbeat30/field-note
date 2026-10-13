import { DropdownMenu as MenuPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;

export const DropdownMenuContent = ({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Content
      align="end"
      sideOffset={6}
      collisionPadding={12}
      className={cn(
        'z-40 min-w-44 rounded-xl border border-line bg-surface p-1 shadow-pop',
        className,
      )}
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
      'flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-[15px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:shrink-0',
      danger && 'text-danger',
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
    className={cn('px-3 py-1.5 text-xs font-semibold text-foreground/70', className)}
    {...props}
  />
);

export const DropdownMenuSeparator = ({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) => (
  <MenuPrimitive.Separator className={cn('my-1 h-px bg-line', className)} {...props} />
);
