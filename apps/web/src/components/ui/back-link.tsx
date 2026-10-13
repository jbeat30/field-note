import { ChevronLeft } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Link } from 'react-router';

import { cn } from '../../lib/cn';

// 상위 화면으로 돌아가는 링크: 제목 위에 두고 화면마다 같은 모양·위치로 쓴다 (터치 영역 44px)
export const BackLink = ({ className, children, ...props }: ComponentProps<typeof Link>) => (
  <Link
    className={cn(
      '-ml-2 inline-flex min-h-touch w-fit max-w-full items-center gap-0.5 rounded-full pr-4 pl-1 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary',
      className,
    )}
    {...props}
  >
    <ChevronLeft aria-hidden className="size-5 shrink-0" />
    <span className="truncate">{children}</span>
  </Link>
);
