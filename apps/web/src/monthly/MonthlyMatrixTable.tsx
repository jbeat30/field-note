import {
  monthlyWorkValue,
  pivotMonthlyHours,
  type MonthlyHoursRow,
  type MonthlyMatrixAxis,
} from '@field-note/shared';
import { useState } from 'react';

import { EmptyState } from '../components/ui/empty-state';
import { SegmentedControl } from '../components/ui/segmented-control';

type Settings = { standardWorkMinutes: number; monthlyWorkDays: number };

const AXES: { value: MonthlyMatrixAxis; label: string }[] = [
  { value: 'EMPLOYEE', label: '직원별' },
  { value: 'PROJECT', label: '프로젝트별' },
];

const th = 'whitespace-nowrap border-b border-line px-3 py-2.5 text-xs font-semibold text-sub';
const td = 'border-b border-line px-3 py-2 tabular-nums';

// 월 공수표 본문: 행 직원 × 열 프로젝트(또는 반대) 표, 칸은 MD, 끝 열·아래 합계 행은 MD와 MM 병기
export const MonthlyMatrixTable = ({
  rows,
  settings,
}: {
  rows: readonly MonthlyHoursRow[];
  settings: Settings;
}) => {
  const [axis, setAxis] = useState<MonthlyMatrixAxis>('EMPLOYEE');
  const matrix = pivotMonthlyHours(rows, axis);
  const value = (minutes: number) => monthlyWorkValue(minutes, settings);
  const rowTitle = axis === 'EMPLOYEE' ? '직원' : '프로젝트';

  if (rows.length === 0) {
    return <EmptyState title="이 달에 저장된 작업 내역이 없습니다" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        aria-label="표 보기"
        size="sm"
        className="w-fit"
        value={axis}
        onValueChange={setAxis}
        options={AXES}
      />
      <div className="isolate overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-max border-collapse text-sm" aria-label="월 공수표">
          <thead>
            <tr className="bg-surface-nested">
              <th scope="col" className={`${th} sticky left-0 z-10 bg-surface-nested text-left`}>
                {rowTitle}
              </th>
              {matrix.columns.map((column) => (
                <th key={column.id} scope="col" className={`${th} text-right`}>
                  {column.label}
                </th>
              ))}
              <th scope="col" className={`${th} border-l border-line text-right`}>
                합계 MD
              </th>
              <th scope="col" className={`${th} text-right`}>
                MM
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.id}>
                <th
                  scope="row"
                  className={`${td} sticky left-0 z-10 bg-surface text-left font-semibold`}
                >
                  {row.label}
                </th>
                {matrix.columns.map((column) => (
                  <td key={column.id} className={`${td} text-right`}>
                    {row.cells[column.id] ? (
                      value(row.cells[column.id]!).manDays
                    ) : (
                      <span aria-hidden className="text-sub">
                        -
                      </span>
                    )}
                  </td>
                ))}
                <td className={`${td} border-l border-line text-right font-semibold`}>
                  {value(row.total).manDays}
                </td>
                <td className={`${td} text-right text-sub`}>{value(row.total).manMonths}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-nested font-semibold">
              <th scope="row" className={`${td} sticky left-0 z-10 bg-surface-nested text-left`}>
                합계
              </th>
              {matrix.columns.map((column) => (
                <td key={column.id} className={`${td} text-right`}>
                  {value(matrix.columnTotals[column.id] ?? 0).manDays}
                </td>
              ))}
              <td className={`${td} border-l border-line text-right`}>
                {value(matrix.total).manDays}
              </td>
              <td className={`${td} text-right`}>{value(matrix.total).manMonths}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-sub">
        칸의 숫자는 MD(하루 기준시간 {settings.standardWorkMinutes / 60}시간 = 1MD)이고, MM은 1MM ={' '}
        {settings.monthlyWorkDays}MD로 환산합니다
      </p>
    </div>
  );
};
