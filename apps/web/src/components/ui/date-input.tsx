import { CalendarDays } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useRef, useState, type ComponentProps } from 'react';

import { cn } from '../../lib/cn';

import { Button } from './button';
import { Calendar } from './calendar';
import { Input, type ControlSize } from './input';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// 'YYYY-MM-DD' → 로컬 날짜 (시간대 때문에 하루 어긋나지 않게 직접 쪼갬)
export const parseDay = (value: string): Date | undefined => {
  if (!ISO_DAY.test(value)) return undefined;

  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);

  return date.getMonth() === month - 1 ? date : undefined;
};

export const formatDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// 날짜 입력: 직접 입력(YYYY-MM-DD) 또는 달력 선택, 값 형식과 onChange는 기존 날짜 입력과 동일
// react-hook-form의 register()와 value/onChange를 그대로 사용 가능
export const DateInput = ({
  className,
  ref,
  min,
  max,
  disabled,
  size = 'md',
  ...props
}: Omit<ComponentProps<'input'>, 'type' | 'size'> & { size?: ControlSize }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>();

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;

    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  // 입력 칸 값을 바꾸고 변경 이벤트를 흘려 보내 폼 라이브러리가 알아채게 함
  const commit = (value: string) => {
    const input = inputRef.current;

    if (!input) return;

    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    setOpen(false);
  };

  const openCalendar = () => {
    if (disabled || open) return;

    setSelected(parseDay(inputRef.current?.value ?? ''));
    setOpen(true);
  };

  const minDay = min ? parseDay(String(min)) : undefined;
  const maxDay = max ? parseDay(String(max)) : undefined;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setSelected(parseDay(inputRef.current?.value ?? ''));
        setOpen(next);
      }}
    >
      <Popover.Anchor asChild>
        <div className="relative">
          <Input
            ref={setRefs}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="YYYY-MM-DD"
            maxLength={10}
            disabled={disabled}
            size={size}
            className={cn(size === 'sm' ? 'pr-9' : 'pr-11', className)}
            {...props}
            // 입력 칸을 눌러도 달력이 열림 (직접 입력도 계속 가능)
            onClick={(event) => {
              props.onClick?.(event);
              openCalendar();
            }}
          />
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="달력 열기"
              disabled={disabled}
              className={cn(
                'absolute inset-y-0 right-0 flex items-center justify-center rounded-r-control text-sub hover:text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50',
                size === 'sm' ? 'w-9' : 'w-11',
              )}
            >
              <CalendarDays aria-hidden className={size === 'sm' ? 'size-4' : 'size-4.5'} />
            </button>
          </Popover.Trigger>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          aria-label="날짜 선택"
          // 입력 칸에 커서를 둔 채로 달력을 열어 직접 입력도 이어서 할 수 있게 함
          onOpenAutoFocus={(event) => event.preventDefault()}
          // 입력 칸을 누르는 것은 바깥 클릭으로 보지 않음
          onInteractOutside={(event) => {
            if (inputRef.current?.contains(event.target as Node)) event.preventDefault();
          }}
          className="z-50 rounded-lg border border-line bg-surface p-3 shadow-pop"
        >
          <Calendar
            selected={selected}
            onSelect={(date) => date && commit(formatDay(date))}
            minDay={minDay}
            maxDay={maxDay}
          />
          <div className="mt-2 flex justify-between border-t border-line pt-2">
            <Button
              type="button"
              variant="ghost"
              className="px-3 text-sm"
              onClick={() => commit('')}
            >
              지우기
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-3 text-sm text-primary"
              onClick={() => commit(formatDay(new Date()))}
            >
              오늘
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
