import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 내용 묶음 (배경색으로 구분, 테두리 없음), 눌러서 이동하는 카드는 안에 링크 배치
export const Card = ({ className, ...props }: ComponentProps<'section'>) => (
  <section className={cn('rounded-xl bg-surface-subtle p-4', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: ComponentProps<'h2'>) => (
  <h2 className={cn('text-lg font-bold', className)} {...props} />
);
