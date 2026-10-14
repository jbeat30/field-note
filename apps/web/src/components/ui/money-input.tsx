import { useState, type ComponentProps } from 'react';

import { cn } from '../../lib/cn';

import { Input } from './input';

// 원 단위 정수를 천 단위 쉼표로 (예: 1250000 → "1,250,000")
export const formatWon = (value: number) => value.toLocaleString('ko-KR');

// 쉼표·공백 등 숫자가 아닌 글자를 버리고 정수로 (빈 칸이면 null)
export const parseWon = (text: string): number | null => {
  const digits = text.replace(/\D/g, '');

  return digits === '' ? null : Number(digits);
};

type MoneyInputProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'endAdornment'
> & {
  // 원 단위 정수, 비어 있으면 null
  value: number | null;
  onValueChange: (value: number | null) => void;
  // 칸 오른쪽 단위 (기본 "원")
  unit?: string;
};

// 금액 입력: 숫자만 받고 입력하는 동안 쉼표를 붙여 보여 준다. 값은 원 단위 정수
export const MoneyInput = ({
  value,
  onValueChange,
  unit = '원',
  className,
  ...props
}: MoneyInputProps) => {
  // 입력 중인 글자 (값이 같으면 사용자가 친 모양을 유지)
  const [text, setText] = useState(value === null ? '' : formatWon(value));
  const shown = parseWon(text) === value ? text : value === null ? '' : formatWon(value);

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      endAdornment={unit}
      {...props}
      className={cn('text-right tabular-nums', className)}
      value={shown}
      onChange={(event) => {
        const next = parseWon(event.target.value);

        // 너무 큰 수(안전한 정수 범위 밖)는 받지 않음
        if (next !== null && !Number.isSafeInteger(next)) return;

        setText(next === null ? '' : formatWon(next));
        onValueChange(next);
      }}
    />
  );
};
