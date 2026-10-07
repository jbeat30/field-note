import {
  WORK_SUMMARY_UNIT_LABELS,
  WORK_SUMMARY_UNITS,
  type WorkSummaryUnit,
} from '@field-note/shared';
import { useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { useEmployees } from '../employees/useEmployees';
import { formatDay } from '../lib/dates';
import { useCompanySettings } from '../settings/useCompanySettings';
import { useOptions } from '../settings/useOptions';

import { formatBurnRate, formatManMonths, formatWork } from './formatWork';
import { useWorkSummary } from './useWorkSummary';

const Bar = ({ value, max }: { value: number; max: number }) => (
  <div className="h-2 rounded bg-muted" aria-hidden="true">
    <div
      className="h-2 rounded bg-primary"
      style={{ width: `${max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0}%` }}
    />
  </div>
);

// 프로젝트 공수 집계: 직원별·작업 구분별·기간별 (서비스 기획서 §9.6). 저장된 일지만 반영한다
export const ProjectWorkSummaryPanel = ({ projectId }: { projectId: string }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [unit, setUnit] = useState<WorkSummaryUnit>('week');
  const summary = useWorkSummary(projectId, {
    from: from || undefined,
    to: to || undefined,
    unit,
  });
  const settings = useCompanySettings();
  const employees = useEmployees({});
  const options = useOptions();

  const nameOf = new Map([
    ...(employees.data ?? []).map((item) => [item.id, item.name] as const),
    ...(options.data ?? []).map((item) => [item.id, item.name] as const),
  ]);
  const filtered = Boolean(from || to);

  if (summary.isError || settings.isError) {
    return <Alert>공수 집계를 불러오지 못했습니다</Alert>;
  }

  if (!summary.data || !settings.data) {
    return <p className="text-sm">공수 집계를 불러오는 중</p>;
  }

  const data = summary.data;
  const config = settings.data;
  const maxPeriod = Math.max(0, ...data.byPeriod.map((item) => item.totalMinutes));
  const maxCategory = Math.max(0, ...data.byCategory.map((item) => item.totalMinutes));

  return (
    <section className="flex flex-col gap-3" aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="text-lg font-bold">
        공수 집계
      </h2>

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          aria-label="집계 시작일"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <Input
          type="date"
          aria-label="집계 종료일"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>

      <dl className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 text-sm">
        <div>
          <dt className="text-foreground/70">총 공수</dt>
          <dd className="font-bold">{formatWork(data.totalMinutes, config)}</dd>
        </div>
        <div>
          <dt className="text-foreground/70">맨먼스</dt>
          <dd className="font-bold">{formatManMonths(data.totalMinutes, config)}</dd>
        </div>
        <div>
          <dt className="text-foreground/70">작업한 날</dt>
          <dd className="font-bold">{data.workedDays}일</dd>
        </div>
        <div>
          <dt className="text-foreground/70">소진율</dt>
          <dd className="font-bold">
            {filtered
              ? '기간 선택 중에는 표시하지 않음'
              : formatBurnRate(data.totalMinutes, data.plannedMinutes, config)}
          </dd>
        </div>
      </dl>
      {data.draftLogCount > 0 && (
        <p className="text-sm text-foreground/70">
          임시 저장 일지 {data.draftLogCount}건은 집계에 포함되지 않았습니다
        </p>
      )}

      {data.savedLogCount === 0 ? (
        <p className="text-sm">저장된 일지가 없어 집계할 공수가 없습니다</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold">직원별</h3>
            <ul
              className="divide-y divide-border rounded-md border border-border"
              aria-label="직원별 공수"
            >
              {data.byEmployee.map((row) => (
                <li key={row.employeeId} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
                  <span className="flex justify-between gap-2">
                    <span className="font-medium">{nameOf.get(row.employeeId) ?? '직원'}</span>
                    <span>{formatWork(row.totalMinutes, config)}</span>
                  </span>
                  <span className="text-foreground/70">
                    {row.workedDays}일 · {formatManMonths(row.totalMinutes, config)}
                    {!filtered && row.plannedMinutes !== null
                      ? ` · 소진율 ${formatBurnRate(row.totalMinutes, row.plannedMinutes, config)}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold">작업 구분별</h3>
            <ul
              className="flex flex-col gap-2 rounded-md border border-border p-3"
              aria-label="작업 구분별 공수"
            >
              {data.byCategory.map((row) => (
                <li key={row.categoryId} className="flex flex-col gap-1 text-sm">
                  <span className="flex justify-between gap-2">
                    <span>{nameOf.get(row.categoryId) ?? '작업'}</span>
                    <span>{formatWork(row.totalMinutes, config)}</span>
                  </span>
                  <Bar value={row.totalMinutes} max={maxCategory} />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold">기간별</h3>
              <Select
                aria-label="기간 묶음"
                className="w-28"
                value={unit}
                onChange={(event) => setUnit(event.target.value as WorkSummaryUnit)}
              >
                {WORK_SUMMARY_UNITS.map((item) => (
                  <option key={item} value={item}>
                    {WORK_SUMMARY_UNIT_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>
            <ul
              className="flex flex-col gap-2 rounded-md border border-border p-3"
              aria-label="기간별 공수"
            >
              {data.byPeriod.map((row) => (
                <li key={row.periodStart} className="flex flex-col gap-1 text-sm">
                  <span className="flex justify-between gap-2">
                    <span>
                      {unit === 'week'
                        ? `${formatDay(row.periodStart)} 주`
                        : `${row.periodStart.slice(0, 7)}월`}
                    </span>
                    <span>{formatWork(row.totalMinutes, config)}</span>
                  </span>
                  <Bar value={row.totalMinutes} max={maxPeriod} />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
};
