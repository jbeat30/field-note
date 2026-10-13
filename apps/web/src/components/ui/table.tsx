import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

// 좁은 화면에서는 표만 가로로 밀리고 페이지는 넘치지 않게 감쌈
export const Table = ({ className, ...props }: ComponentProps<'table'>) => (
  <div className="w-full overflow-x-auto">
    <table className={cn('w-full border-collapse text-sm', className)} {...props} />
  </div>
);

export const TableHead = (props: ComponentProps<'thead'>) => <thead {...props} />;

export const TableBody = ({ className, ...props }: ComponentProps<'tbody'>) => (
  <tbody className={cn('divide-y divide-border', className)} {...props} />
);

export const TableRow = (props: ComponentProps<'tr'>) => <tr {...props} />;

export const TableHeaderCell = ({ className, ...props }: ComponentProps<'th'>) => (
  <th
    scope="col"
    className={cn(
      'border-b border-border px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground/70',
      className,
    )}
    {...props}
  />
);

export const TableCell = ({ className, ...props }: ComponentProps<'td'>) => (
  <td className={cn('min-h-touch px-3 py-3', className)} {...props} />
);
