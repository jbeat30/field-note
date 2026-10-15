import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { Command } from 'cmdk';
import { Popover } from 'radix-ui';
import { useState, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

import { controlClass, controlSize, type ControlSize } from './input';
import {
  cmdkItemDisabledClass,
  groupOptions,
  listboxContentClass,
  listboxItemClass,
  type ListOption,
} from './listbox';

export type ComboboxOption = ListOption;

type CommonProps = {
  options: readonly ComboboxOption[];
  // 고르지 않았을 때 보이는 글자
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  // 목록 맨 아래 "새로 추가" 동작 (검색어를 넘겨 줌), 명부에 없는 고객을 바로 등록할 때 등
  onCreate?: (search: string) => void;
  createLabel?: string;
  size?: ControlSize;
  disabled?: boolean;
  className?: string;
  // FormField가 넣어 주는 접근성 속성
  id?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

type ComboboxProps = CommonProps & {
  value: string;
  onValueChange: (value: string) => void;
  // 선택을 지울 수 있는 X 버튼 (값은 빈 글자가 됨)
  clearable?: boolean;
};

type MultiComboboxProps = CommonProps & {
  value: readonly string[];
  onValueChange: (value: string[]) => void;
  // 고른 개수 표시 (기본: "3개 선택")
  summary?: (count: number) => string;
};

// 이름·설명에 검색어가 들어 있으면 보임 (값(id)은 검색에 쓰지 않음)
const matches = (_value: string, search: string, keywords?: string[]) =>
  (keywords ?? []).join(' ').toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0;

// 검색해서 고르는 목록 (단일·여러 개 공통), 고르면 onPick, 열림 상태는 바깥에서 관리
const ComboboxList = ({
  options,
  isSelected,
  onPick,
  searchPlaceholder,
  emptyText,
  onCreate,
  createLabel,
}: {
  options: readonly ComboboxOption[];
  isSelected: (value: string) => boolean;
  onPick: (value: string) => void;
  searchPlaceholder: string;
  emptyText: string;
  onCreate?: (search: string) => void;
  createLabel: string;
}) => {
  const [search, setSearch] = useState('');

  const renderItem = (option: ComboboxOption) => (
    <Command.Item
      key={option.value}
      value={option.value}
      keywords={[option.label, option.description ?? '']}
      disabled={option.disabled}
      onSelect={() => onPick(option.value)}
      className={cn(listboxItemClass, cmdkItemDisabledClass)}
    >
      <Check
        aria-hidden
        className={cn(
          'size-4 shrink-0 text-primary',
          isSelected(option.value) ? 'opacity-100' : 'opacity-0',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{option.label}</span>
        {option.description && (
          <span className="block truncate text-xs text-foreground/65">{option.description}</span>
        )}
      </span>
    </Command.Item>
  );

  return (
    <Command filter={matches} loop>
      <div className="flex items-center gap-2 border-b border-line px-3">
        <Search aria-hidden className="size-4 shrink-0 text-foreground/50" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder={searchPlaceholder}
          className="h-10 w-full bg-transparent text-base outline-none placeholder:text-foreground/55 md:text-[15px]"
        />
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-1">
        <Command.Empty className="px-3 py-6 text-center text-sm text-foreground/65">
          {emptyText}
        </Command.Empty>
        {groupOptions(options).map((group) =>
          group.label ? (
            <Command.Group
              key={group.label}
              heading={group.label}
              // 묶음 제목 모양은 listboxGroupLabelClass와 같음 (cmdk가 제목 요소를 직접 만들어 하위 선택자로 꾸밈)
              className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-foreground/65"
            >
              {group.items.map(renderItem)}
            </Command.Group>
          ) : (
            group.items.map(renderItem)
          ),
        )}
      </Command.List>
      {onCreate && (
        <div className="border-t border-line p-1">
          <button
            type="button"
            onClick={() => onCreate(search.trim())}
            className={cn(listboxItemClass, 'w-full text-primary hover:bg-muted')}
          >
            <Plus aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 truncate">
              {search.trim() ? `"${search.trim()}" ${createLabel}` : createLabel}
            </span>
          </button>
        </div>
      )}
    </Command>
  );
};

const Trigger = ({
  open,
  size,
  disabled,
  className,
  hasValue,
  padEnd,
  children,
  aria,
}: {
  open: boolean;
  size: ControlSize;
  disabled?: boolean;
  className?: string;
  hasValue: boolean;
  padEnd: boolean;
  children: ReactNode;
  aria: Pick<CommonProps, 'id' | 'aria-label' | 'aria-invalid' | 'aria-describedby'>;
}) => (
  <Popover.Trigger asChild>
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      disabled={disabled}
      className={cn(
        controlClass,
        controlSize({ size }),
        'flex items-center justify-between gap-2 text-left',
        className,
      )}
      {...aria}
    >
      {/* 지우기 버튼이 겹치지 않게 글자 오른쪽에 자리를 비움 */}
      <span className={cn('min-w-0 truncate', !hasValue && 'text-foreground/65', padEnd && 'pr-8')}>
        {children}
      </span>
      <ChevronDown
        aria-hidden
        className={cn(
          'size-4.5 shrink-0 text-foreground/50 transition-transform duration-(--duration-fast)',
          open && 'rotate-180',
        )}
      />
    </button>
  </Popover.Trigger>
);

const Content = ({ label, children }: { label: string; children: ReactNode }) => (
  <Popover.Portal>
    <Popover.Content
      align="start"
      sideOffset={4}
      collisionPadding={12}
      aria-label={label}
      className={cn(listboxContentClass, 'w-(--radix-popover-trigger-width) min-w-60')}
    >
      {children}
    </Popover.Content>
  </Popover.Portal>
);

// 검색해서 하나 고르는 칸: 직원·고객·프로젝트처럼 항목이 많을 때 사용, 키보드(위아래·Enter·Esc) 선택 지원
export const Combobox = ({
  options,
  value,
  onValueChange,
  placeholder = '선택',
  searchPlaceholder = '이름으로 찾기',
  emptyText = '찾는 항목이 없습니다',
  onCreate,
  createLabel = '새로 추가',
  clearable = false,
  size = 'md',
  disabled,
  className,
  ...aria
}: ComboboxProps) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const showClear = clearable && Boolean(selected) && !disabled;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="relative">
        <Trigger
          open={open}
          size={size}
          disabled={disabled}
          className={className}
          hasValue={Boolean(selected)}
          padEnd={showClear}
          aria={aria}
        >
          {selected ? selected.label : placeholder}
        </Trigger>
        {showClear && (
          <button
            type="button"
            aria-label="선택 지우기"
            className="absolute inset-y-0 right-8 my-auto flex size-7 items-center justify-center rounded-md text-foreground/65 hover:bg-muted hover:text-foreground"
            onClick={() => onValueChange('')}
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      <Content label={aria['aria-label'] ?? placeholder}>
        <ComboboxList
          options={options}
          isSelected={(option) => option === value}
          onPick={(option) => {
            onValueChange(option);
            setOpen(false);
          }}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
          onCreate={
            onCreate &&
            ((search) => {
              setOpen(false);
              onCreate(search);
            })
          }
          createLabel={createLabel}
        />
      </Content>
    </Popover.Root>
  );
};

// 검색해서 여러 개 고르는 칸 (팀에 여러 명 추가 등), 고른 항목은 목록을 연 채로 켜고 끔
export const MultiCombobox = ({
  options,
  value,
  onValueChange,
  placeholder = '선택',
  searchPlaceholder = '이름으로 찾기',
  emptyText = '찾는 항목이 없습니다',
  onCreate,
  createLabel = '새로 추가',
  summary,
  size = 'md',
  disabled,
  className,
  ...aria
}: MultiComboboxProps) => {
  const [open, setOpen] = useState(false);
  const picked = options.filter((option) => value.includes(option.value));
  const label =
    picked.length === 0
      ? placeholder
      : picked.length <= 2
        ? picked.map((option) => option.label).join(', ')
        : (summary?.(picked.length) ?? `${picked[0]!.label} 외 ${picked.length - 1}개`);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Trigger
        open={open}
        size={size}
        disabled={disabled}
        className={className}
        hasValue={picked.length > 0}
        padEnd={false}
        aria={aria}
      >
        {label}
      </Trigger>
      <Content label={aria['aria-label'] ?? placeholder}>
        <ComboboxList
          options={options}
          isSelected={(option) => value.includes(option)}
          onPick={(option) =>
            onValueChange(
              value.includes(option) ? value.filter((item) => item !== option) : [...value, option],
            )
          }
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
          onCreate={
            onCreate &&
            ((search) => {
              setOpen(false);
              onCreate(search);
            })
          }
          createLabel={createLabel}
        />
        {value.length > 0 && (
          <div className="flex items-center justify-between border-t border-line px-3 py-2 text-sm">
            <span className="text-foreground/70">{value.length}개 선택</span>
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => onValueChange([])}
            >
              모두 해제
            </button>
          </div>
        )}
      </Content>
    </Popover.Root>
  );
};
