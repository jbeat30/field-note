import { Progress } from 'radix-ui';

import { cn } from '../../lib/cn';

type ProgressBarProps = {
  // 0~100
  value: number;
  tone?: 'primary' | 'warning' | 'danger';
  'aria-label': string;
  className?: string;
};

const TONE = { primary: 'bg-primary', warning: 'bg-warning', danger: 'bg-danger' };

// 진행률·소진율 막대, 값은 항상 글자로도 병행 표시
export const ProgressBar = ({
  value,
  tone = 'primary',
  'aria-label': ariaLabel,
  className,
}: ProgressBarProps) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <Progress.Root
      value={clamped}
      aria-label={ariaLabel}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <Progress.Indicator
        className={cn(
          'h-full rounded-full transition-[width] duration-(--duration-base) ease-(--ease-out-expo)',
          TONE[tone],
        )}
        style={{ width: `${clamped}%` }}
      />
    </Progress.Root>
  );
};
