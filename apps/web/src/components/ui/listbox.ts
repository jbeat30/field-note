// 펼침 목록 공통 모양 (Select·Combobox·DropdownMenu가 같은 모양으로 열림)

// 떠 있는 목록 상자
export const listboxContentClass = 'z-40 overflow-hidden rounded-xl bg-surface-subtle shadow-pop';

// 목록 한 줄, 키보드·마우스로 가리킨 줄은 data-highlighted(Radix) 또는 data-selected(cmdk)
export const listboxItemClass =
  'relative flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[15px] outline-none select-none data-[highlighted]:bg-surface-nested data-[selected=true]:bg-surface-nested md:min-h-9';

// 꺼진 줄: Radix는 꺼졌을 때만 data-disabled를 붙이고, cmdk는 늘 붙이며 값이 true/false
export const radixItemDisabledClass =
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-45';
export const cmdkItemDisabledClass =
  'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-45';

// 묶음 제목 (예: "프로젝트 팀", "다른 직원")
export const listboxGroupLabelClass = 'px-2.5 pt-2 pb-1 text-xs font-semibold text-sub';

export type ListOption = {
  value: string;
  label: string;
  // 이름 아래 작은 보조 설명 (예: 직책·코드)
  description?: string;
  // 같은 묶음끼리 모아 제목을 붙여 보여 줌 (처음 나온 순서대로)
  group?: string;
  disabled?: boolean;
};

// 묶음 순서를 지키며 나눔 (묶음이 없는 항목은 맨 앞 이름 없는 묶음)
export const groupOptions = <T extends ListOption>(options: readonly T[]) => {
  const groups = new Map<string, T[]>();

  for (const option of options) {
    const key = option.group ?? '';
    const list = groups.get(key);

    if (list) list.push(option);
    else groups.set(key, [option]);
  }

  return [...groups.entries()].map(([label, items]) => ({ label, items }));
};
