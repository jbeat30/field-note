import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

import { controlClass } from './input';

// 오른쪽 화살표 (회색이라 밝은·어두운 화면 모두에서 보임)
const CHEVRON =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%238b95a1' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat";

// 기기 기본 선택 화면(모바일에서 가장 쓰기 쉬움)을 쓰되 모양만 통일한 선택 칸. 항목이 많아 검색이 필요하면 Combobox
export const Select = ({ className, ...props }: ComponentProps<'select'>) => (
  <select
    className={cn(controlClass, 'min-h-11 appearance-none pr-10 md:min-h-10', CHEVRON, className)}
    {...props}
  />
);
