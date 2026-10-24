import { roundTo } from '@field-note/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Section } from '../components/ui/section';
import { SegmentedControl } from '../components/ui/segmented-control';
import { StatGroup } from '../components/ui/stat-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/table';
import { useEmployees } from '../employees/useEmployees';
import { optionNameMap } from '../employees/OptionSelect';
import { formatDay, seoulToday } from '../lib/dates';
import { useOptions } from '../settings/useOptions';

import { EmployeeWorkDaysDialog } from './EmployeeWorkDaysDialog';
import { useWorkSummary } from './useWorkSummary';
import { LoadingBlock } from '../components/ui/loading-block';

type Range = 'all' | 'thisMonth' | 'lastMonth';

const RANGES: { value: Range; label: string }[] = [
  { value: 'all', label: '전체 기간' },
  { value: 'thisMonth', label: '이번 달' },
  { value: 'lastMonth', label: '지난 달' },
];

const rangeQuery = (range: Range) => {
  if (range === 'all') return {};

  const [year, month] = seoulToday().split('-').map(Number) as [number, number];
  const target =
    range === 'thisMonth'
      ? new Date(Date.UTC(year, month - 1, 1))
      : new Date(Date.UTC(year, month - 2, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0));

  return { from: target.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
};

const hours = (minutes: number) => roundTo(minutes / 60, 1);

export const ProjectPeopleStats = ({ projectId }: { projectId: string }) => {
  const [range, setRange] = useState<Range>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const summary = useWorkSummary(projectId, { unit: 'week', ...rangeQuery(range) });
  const employees = useEmployees({});
  const options = useOptions();

  if (summary.isError) return <Alert>투입 인원 통계를 불러오지 못했습니다</Alert>;

  const byId = new Map((employees.data ?? []).map((item) => [item.id, item]));
  const categoryNames = optionNameMap(options.data ?? []);
  const rows = (summary.data?.byEmployee ?? []).filter((row) => row.totalMinutes > 0);
  const totalMinutes = summary.data?.totalMinutes ?? 0;

  return (
    <Section
      title="투입 인원"
      description="작업 달력에 기록한 사람별로 일한 날과 시간을 모았습니다. 사람을 넣고 빼는 것은 작업 달력의 날짜에서 합니다"
      actions={
        <SegmentedControl
          aria-label="기간"
          size="sm"
          className="w-auto"
          value={range}
          onValueChange={setRange}
          options={RANGES}
        />
      }
    >
      {!summary.data ? (
        <LoadingBlock label="불러오는 중" />
      ) : (
        <>
          <StatGroup
            items={[
              { label: '일한 사람', value: rows.length, unit: '명' },
              { label: '작업한 날', value: summary.data.workedDays, unit: '일' },
              { label: '총 일한 시간', value: hours(totalMinutes), unit: '시간' },
              {
                label: '하루 평균 인원',
                value:
                  summary.data.workedDays === 0
                    ? '-'
                    : roundTo(
                        rows.reduce((sum, row) => sum + row.workedDays, 0) /
                          summary.data.workedDays,
                        1,
                      ),
                unit: summary.data.workedDays === 0 ? undefined : '명',
              },
            ]}
          />
          {summary.data.draftLogCount > 0 && (
            <p className="text-sm text-sub">
              임시 저장한 작업 내역 {summary.data.draftLogCount}건은 통계에 들어가지 않았습니다
            </p>
          )}
          {rows.length === 0 ? (
            <EmptyState
              title="이 기간에 기록한 사람이 없습니다"
              description="작업 달력에서 날짜를 눌러 일한 사람을 기록하세요"
              action={
                <Link
                  to={`/projects/${projectId}`}
                  className="text-sm font-semibold text-primary hover:text-sub"
                >
                  작업 달력으로
                </Link>
              }
            />
          ) : (
            <Table aria-label="사람별 통계">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>직원</TableHeaderCell>
                  <TableHeaderCell className="text-right">총 시간</TableHeaderCell>
                  <TableHeaderCell className="text-right">하루 평균</TableHeaderCell>
                  <TableHeaderCell>일한 날</TableHeaderCell>
                  <TableHeaderCell>한 일</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const employee = byId.get(row.employeeId);

                  return (
                    <TableRow key={row.employeeId}>
                      <TableCell>
                        <button
                          type="button"
                          className="font-semibold hover:text-sub"
                          onClick={() => setDetailId(row.employeeId)}
                        >
                          {employee?.name ?? '직원'}
                        </button>
                        {employee?.title && <span className="ml-2 text-sub">{employee.title}</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {hours(row.totalMinutes)}시간
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sub">
                        {hours(row.totalMinutes / Math.max(row.workedDays, 1))}시간
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="font-semibold tabular-nums">{row.workedDays}일</span>
                        {row.lastWorkDate && (
                          <span className="ml-1.5 text-sm text-sub">
                            · 최근 {formatDay(row.lastWorkDate)}
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-6 px-1.5 text-xs"
                          onClick={() => setDetailId(row.employeeId)}
                        >
                          날짜 보기
                        </Button>
                      </TableCell>
                      <TableCell className="text-sub">
                        {row.categories
                          .slice(0, 3)
                          .map(
                            (item) =>
                              `${categoryNames.get(item.categoryId) ?? '작업'} ${hours(item.totalMinutes)}시간`,
                          )
                          .join(' · ')}
                        {row.categories.length > 3 ? ` 외 ${row.categories.length - 3}` : ''}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell className="font-semibold">합계 {rows.length}명</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {hours(totalMinutes)}시간
                  </TableCell>
                  <TableCell />
                  <TableCell className="tabular-nums text-sub">
                    작업한 날 {summary.data.workedDays}일
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </>
      )}

      {detailId && (
        <EmployeeWorkDaysDialog
          projectId={projectId}
          employeeId={detailId}
          employeeName={byId.get(detailId)?.name ?? '직원'}
          range={rangeQuery(range)}
          rangeLabel={RANGES.find((item) => item.value === range)!.label}
          categoryNames={categoryNames}
          onClose={() => setDetailId(null)}
        />
      )}
    </Section>
  );
};
