import type { ChangeEvent } from 'react';
import { DayPicker, type DropdownProps } from 'react-day-picker';
import { ko } from 'react-day-picker/locale';

import { Select } from './select';

// 연도 선택 범위: 생년월일부터 먼 앞날의 계획일까지
const FIRST_YEAR = 1930;
const YEARS_AHEAD = 15;

// 달력 위의 연도, 월 선택: 기본 선택 칸 대신 앱의 선택 목록 모양을 씀
const CaptionDropdown = ({ options, value, disabled, onChange, ...props }: DropdownProps) => (
  <Select
    size="sm"
    aria-label={props['aria-label']}
    disabled={disabled}
    value={String(value ?? '')}
    options={(options ?? []).map((option) => ({
      value: String(option.value),
      label: option.label,
      disabled: option.disabled,
    }))}
    onValueChange={(next) =>
      onChange?.({ target: { value: next } } as ChangeEvent<HTMLSelectElement>)
    }
    className="w-auto min-w-[4.75rem] gap-1.5 px-3 font-bold"
  />
);

type CalendarProps = {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  defaultMonth?: Date;
  // 이 날짜 앞뒤는 고를 수 없고, 연도·월 선택도 이 범위 안으로 좁힘
  minDay?: Date;
  maxDay?: Date;
};

// 앱 공통 날짜 선택 달력: 이전·다음 달 이동과 함께 연도·월을 바로 고를 수 있음
export const Calendar = ({ selected, onSelect, defaultMonth, minDay, maxDay }: CalendarProps) => (
  <DayPicker
    mode="single"
    locale={ko}
    selected={selected}
    defaultMonth={defaultMonth ?? selected ?? maxDay ?? new Date()}
    onSelect={onSelect}
    captionLayout="dropdown"
    components={{ Dropdown: CaptionDropdown }}
    startMonth={minDay ?? new Date(FIRST_YEAR, 0)}
    endMonth={maxDay ?? new Date(new Date().getFullYear() + YEARS_AHEAD, 11)}
    disabled={[...(minDay ? [{ before: minDay }] : []), ...(maxDay ? [{ after: maxDay }] : [])]}
    weekStartsOn={0}
  />
);
