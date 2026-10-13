import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import { Fragment } from 'react';

import { cn } from '../../lib/cn';

import { controlClass, controlSize, type ControlSize } from './input';
import {
  groupOptions,
  listboxContentClass,
  listboxGroupLabelClass,
  listboxItemClass,
  radixItemDisabledClass,
  type ListOption,
} from './listbox';

export type SelectOption<T extends string = string> = ListOption & { value: T };

// Radix 항목 값은 빈 글자를 쓸 수 없어 "비움" 항목을 이 값으로 대신함
const EMPTY = '__empty__';

type SelectProps<T extends string> = {
  options: readonly SelectOption<T>[];
  // 빈 글자는 아무것도 고르지 않은 상태 (emptyLabel과 함께 쓸 때)
  value: T | '';
  onValueChange: (value: T) => void;
  // 고르지 않았을 때 칸에 보이는 글자
  placeholder?: string;
  // 목록 맨 위에 "선택 안 함"처럼 비움으로 되돌리는 항목을 둠
  emptyLabel?: string;
  size?: ControlSize;
  disabled?: boolean;
  className?: string;
  // 폼 전송용 이름 (숨은 기본 선택 칸에 들어감)
  name?: string;
  // FormField가 넣어 주는 접근성 속성
  id?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

// 짧은 목록에서 하나 고르는 칸 (상태·분류·쪽당 개수 등). 항목이 많아 찾아야 하면 Combobox
// 콤보박스·날짜 칸과 같은 모양으로 열리고, 키보드(위아래·Enter·Esc·글자로 찾기)로도 고를 수 있다
export const Select = <T extends string>({
  options,
  value,
  onValueChange,
  placeholder = '선택',
  emptyLabel,
  size = 'md',
  disabled,
  className,
  name,
  id,
  ...aria
}: SelectProps<T>) => {
  const internal = value === '' ? (emptyLabel ? EMPTY : '') : value;

  return (
    <SelectPrimitive.Root
      value={internal}
      // 비움 항목을 고르면 빈 글자 (emptyLabel이 있을 때만 생기므로 T에 빈 글자가 포함된 경우)
      onValueChange={(next) => onValueChange((next === EMPTY ? '' : next) as T)}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        className={cn(
          controlClass,
          controlSize({ size }),
          'group flex items-center justify-between gap-2 text-left data-[placeholder]:text-foreground/65',
          className,
        )}
        {...aria}
      >
        <span className="min-w-0 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            aria-hidden
            className="size-4.5 shrink-0 text-foreground/50 transition-transform duration-(--duration-fast) group-data-[state=open]:rotate-180"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          collisionPadding={12}
          className={cn(
            listboxContentClass,
            'max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) min-w-40',
          )}
        >
          <SelectPrimitive.Viewport className="max-h-72 p-1">
            {emptyLabel && <SelectItem option={{ value: EMPTY, label: emptyLabel }} muted />}
            {groupOptions(options).map((group) => (
              <Fragment key={group.label || '_'}>
                {group.label ? (
                  <SelectPrimitive.Group>
                    <SelectPrimitive.Label className={listboxGroupLabelClass}>
                      {group.label}
                    </SelectPrimitive.Label>
                    {group.items.map((option) => (
                      <SelectItem key={option.value} option={option} />
                    ))}
                  </SelectPrimitive.Group>
                ) : (
                  group.items.map((option) => <SelectItem key={option.value} option={option} />)
                )}
              </Fragment>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
};

const SelectItem = ({ option, muted = false }: { option: SelectOption; muted?: boolean }) => (
  <SelectPrimitive.Item
    value={option.value}
    disabled={option.disabled}
    className={cn(listboxItemClass, radixItemDisabledClass, 'pr-8')}
  >
    <span className="min-w-0 flex-1">
      <SelectPrimitive.ItemText>
        <span className={cn('block truncate', muted && 'text-foreground/65')}>{option.label}</span>
      </SelectPrimitive.ItemText>
      {option.description && (
        <span className="block truncate text-xs text-foreground/65">{option.description}</span>
      )}
    </span>
    <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
      <Check aria-hidden className="size-4 text-primary" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
);
