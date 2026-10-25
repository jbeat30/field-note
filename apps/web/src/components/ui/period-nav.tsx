import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useState } from 'react';

import { cn } from '../../lib/cn';

import { Button } from './button';
import { Calendar } from './calendar';
import { formatDay, parseDay } from './date-input';

type PeriodNavProps = {
  // 현재 기간 표시 (예: 2026-10-12 ~ 2026-10-18)
  label: string;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  // "오늘/이번 주/이번 달" 버튼
  todayLabel: string;
  onToday: () => void;
  // 달력에서 날짜를 고르면 그 날짜(YYYY-MM-DD) 반환, 없으면 달력 없이 표시만 제공
  onPick?: (date: string) => void;
  pickValue?: string;
  pickMax?: string;
  // 다른 카드 안에 함께 놓을 때는 바깥 카드 면 없이 그림
  isBare?: boolean;
};

// 기간(주·달·하루) 이동 줄: 큰 이전/다음 버튼, 가운데 기간(눌러서 달력으로 이동), 오른쪽 "오늘" 버튼
export const PeriodNav = ({
  label,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  nextDisabled,
  todayLabel,
  onToday,
  onPick,
  pickValue,
  pickMax,
  isBare = false,
}: PeriodNavProps) => {
  const [open, setOpen] = useState(false);
  const selected = pickValue ? parseDay(pickValue) : undefined;
  const maxDay = pickMax ? parseDay(pickMax) : undefined;

  const title = (
    <>
      <span className="font-bold">{label}</span>
      {onPick && <CalendarDays aria-hidden className="size-4 text-sub" />}
    </>
  );

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        !isBare && 'rounded-3xl bg-surface-subtle p-3',
      )}
    >
      <Button
        variant="secondary"
        aria-label={prevLabel}
        className="flex-1 sm:flex-none"
        onClick={onPrev}
      >
        <ChevronLeft aria-hidden className="size-5" />
      </Button>
      {onPick ? (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label={`${label} 달력에서 이동`}
              className="order-first flex min-h-touch w-full min-w-0 items-center justify-center gap-1.5 rounded-full whitespace-nowrap hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary sm:order-none sm:w-auto sm:flex-1"
            >
              {title}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="center"
              sideOffset={6}
              collisionPadding={12}
              aria-label="날짜 선택"
              className="z-50 rounded-xl border border-line bg-surface p-3 shadow-card"
            >
              <Calendar
                selected={selected}
                maxDay={maxDay}
                onSelect={(date) => {
                  if (!date) return;
                  onPick(formatDay(date));
                  setOpen(false);
                }}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ) : (
        <p className="order-first flex min-h-touch w-full items-center justify-center gap-2 sm:order-none sm:w-auto sm:flex-1">
          {title}
        </p>
      )}
      <Button
        variant="secondary"
        aria-label={nextLabel}
        disabled={nextDisabled}
        className="flex-1 sm:flex-none"
        onClick={onNext}
      >
        <ChevronRight aria-hidden className="size-5" />
      </Button>
      <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onToday}>
        {todayLabel}
      </Button>
    </div>
  );
};
