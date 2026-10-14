import { Label as LabelPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 입력 칸 이름표. 눌러도 입력 칸이 선택됨
export const Label = ({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) => (
  <LabelPrimitive.Root
    className={cn('text-sm font-semibold text-foreground', className)}
    {...props}
  />
);
