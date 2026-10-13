import { Check, ChevronDown, X } from 'lucide-react';
import { Command } from 'cmdk';
import { Popover } from 'radix-ui';
import { useState } from 'react';

import { cn } from '../../lib/cn';

import { controlClass } from './input';

export type ComboboxOption = {
  value: string;
  label: string;
  // 이름 아래에 작게 보여 주는 보조 설명 (예: 직책·코드)
  description?: string;
  disabled?: boolean;
};

type ComboboxProps = {
  options: readonly ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  // 고르지 않았을 때 보이는 글자
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  // 선택을 지울 수 있는 X 버튼 (값은 빈 글자가 됨)
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  // FormField가 넣어 주는 접근성 속성
  id?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

// 이름·설명에 검색어가 들어 있으면 보임 (값(id)은 검색에 쓰지 않음)
const matches = (_value: string, search: string, keywords?: string[]) =>
  (keywords ?? []).join(' ').toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0;

// 검색해서 고르는 선택 칸: 직원·고객·프로젝트처럼 항목이 많을 때. 키보드(위아래·Enter·Esc)로도 고를 수 있다
export const Combobox = ({
  options,
  value,
  onValueChange,
  placeholder = '선택',
  searchPlaceholder = '이름으로 찾기',
  emptyText = '찾는 항목이 없습니다',
  clearable = false,
  disabled,
  className,
  ...aria
}: ComboboxProps) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="relative">
        <Popover.Trigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            className={cn(
              controlClass,
              'flex min-h-11 items-center justify-between gap-2 text-left md:min-h-10',
              clearable && selected && 'pr-16',
              className,
            )}
            {...aria}
          >
            <span className={cn('min-w-0 truncate', !selected && 'text-foreground/70')}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronDown aria-hidden className="size-5 shrink-0 text-foreground/50" />
          </button>
        </Popover.Trigger>
        {clearable && selected && !disabled && (
          <button
            type="button"
            aria-label="선택 지우기"
            className="absolute inset-y-0 right-9 my-auto flex size-7 items-center justify-center rounded-md text-foreground/70 hover:bg-muted hover:text-foreground"
            onClick={() => onValueChange('')}
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          aria-label={aria['aria-label'] ?? placeholder}
          className="z-40 w-(--radix-popover-trigger-width) min-w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        >
          <Command filter={matches} loop>
            <Command.Input
              placeholder={searchPlaceholder}
              className="h-11 w-full border-b border-line bg-transparent px-3 text-base outline-none placeholder:text-foreground/70 md:text-[15px]"
            />
            <Command.List className="max-h-64 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-foreground/70">
                {emptyText}
              </Command.Empty>
              {options.map((option) => (
                <Command.Item
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, option.description ?? '']}
                  disabled={option.disabled}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[15px] data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 data-[selected=true]:bg-muted"
                >
                  <Check
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0 text-primary',
                      option.value === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-xs text-foreground/70">
                        {option.description}
                      </span>
                    )}
                  </span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
