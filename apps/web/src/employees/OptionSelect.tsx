import type { OptionItem, OptionKind } from '@field-note/shared';
import type { ComponentProps } from 'react';

import { Select } from '../components/ui/select';

// 선택 목록(직종·직원 구분)에서 고르는 입력. 숨긴 항목은 새로 고를 수 없지만,
// 이미 그 항목을 쓰고 있다면(keepId) "(숨김)"으로 계속 보여 준다
export const OptionSelect = ({
  kind,
  options,
  keepId,
  emptyLabel = '선택 안 함',
  ...props
}: ComponentProps<typeof Select> & {
  kind: OptionKind;
  options: OptionItem[];
  // 숨긴 항목이어도 목록에 남겨 둘 항목 (현재 저장된 값)
  keepId?: string | null;
  emptyLabel?: string;
}) => {
  const current = keepId ?? (typeof props.value === 'string' ? props.value : '');
  const items = options.filter(
    (item) => item.kind === kind && (item.isActive || item.id === current),
  );

  return (
    <Select {...props}>
      <option value="">{emptyLabel}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
          {item.isActive ? '' : ' (숨김)'}
        </option>
      ))}
    </Select>
  );
};

// 항목 id로 이름을 찾는 표 (목록·카드에 이름을 보여 줄 때)
export const optionNameMap = (options: OptionItem[]) =>
  new Map(options.map((item) => [item.id, item.name]));
