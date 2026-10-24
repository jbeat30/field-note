import {
  PROJECT_STATUS_LABELS,
  buildStaffingTimeline,
  countDays,
  listDates,
  periodStart,
  shiftDate,
  summarizeStaffingTimeline,
  todayInSeoul,
} from '@field-note/shared';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { BackLink } from '../components/ui/back-link';
import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Chip } from '../components/ui/chip';
import { EmptyState } from '../components/ui/empty-state';
import { PeriodNav } from '../components/ui/period-nav';
import { Select } from '../components/ui/select';
import { SegmentedControl } from '../components/ui/segmented-control';
import { useProjectChoices } from '../projects/useProjects';
import { StaffingTimeline } from '../staffing/StaffingTimeline';
import { useStaffingCalendar } from '../staffing/useStaffingCalendar';
import { LoadingBlock } from '../components/ui/loading-block';

type View = 'week' | 'twoWeeks' | 'month';

const VIEWS: { value: View; label: string }[] = [
  { value: 'week', label: '1주' },
  { value: 'twoWeeks', label: '2주' },
  { value: 'month', label: '월' },
];

// 날짜 열 최소 너비: 길게 볼수록 좁게 (넘치면 표만 가로 스크롤)
const COLUMN_MIN_WIDTH: Record<View, string> = {
  week: '4.5rem',
  twoWeeks: '3rem',
  month: '2.25rem',
};

const isDate = (value: string | null): value is string =>
  value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const isView = (value: string | null): value is View =>
  value === 'week' || value === 'twoWeeks' || value === 'month';

const monthEnd = (date: string) => {
  const [year, month] = date.split('-').map(Number) as [number, number];

  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
};

const shiftMonth = (date: string, delta: number) => {
  const [year, month] = date.split('-').map(Number) as [number, number];

  return new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 10);
};

// 보기와 기준일로 기간을 정한다: 주는 월요일부터, 월은 1일부터
const periodOf = (view: View, anchor: string) => {
  if (view === 'month') {
    const from = `${anchor.slice(0, 8)}01`;

    return { from, to: monthEnd(from) };
  }

  const from = periodStart(anchor, 'week');

  return { from, to: shiftDate(from, view === 'week' ? 6 : 13) };
};

const periodLabel = (view: View, from: string, to: string) =>
  view === 'month' ? `${from.slice(0, 4)}년 ${Number(from.slice(5, 7))}월` : `${from} ~ ${to}`;

// 프로젝트 이름이 번호보다 먼저 읽혀야 하므로 범례를 별도로 두지 않고 막대 안에 이름 표시
const READING_GUIDE =
  '막대는 그 프로젝트에서 일한 날이고 안의 숫자는 그날 시간입니다. 같은 날 두 곳에서 일하면 막대가 위아래로 쌓이고 빨간 테두리로 표시됩니다. 막대를 누르면 그날 하루 기록, 빈 칸을 누르면 프로젝트를 골라 그날 기록으로 갑니다';

// 인력 배치: 사람 행 × 날짜 열 타임라인, 누가 어디에서 일했고 누가 비었고 어디가 겹치는지 한눈에 확인
export const StaffingCalendarPage = () => {
  const [params, setParams] = useSearchParams();
  const view: View = isView(params.get('view')) ? (params.get('view') as View) : 'week';
  const requested = params.get('from');
  const today = todayInSeoul(new Date());
  const { from, to } = periodOf(view, isDate(requested) ? requested : today);
  const calendar = useStaffingCalendar(from, to);
  const choices = useProjectChoices();
  const [title, setTitle] = useState('');
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const highlightEmployeeId = params.get('employee');

  const rows = useMemo(
    () => (calendar.data ? buildStaffingTimeline(calendar.data) : []),
    [calendar.data],
  );
  const summary = summarizeStaffingTimeline(rows);
  const titles = [
    ...new Set(
      rows.map((row) => row.employee.title).filter((value): value is string => Boolean(value)),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ko'));
  const shown = rows.filter(
    (row) =>
      (!title || row.employee.title === title) && (!onlyConflicts || row.conflictDates.length > 0),
  );
  // 프로젝트마다 막대에서 같은 구분 색을 씀 (프로젝트 id 순서로 0~5번 색을 돌려 씀)
  const projectColors = useMemo(() => {
    const ids = [...new Set((calendar.data?.workDays ?? []).map((item) => item.projectId))].sort();

    return new Map(ids.map((projectId, index) => [projectId, index % 6] as const));
  }, [calendar.data]);
  // 빈 칸에서 고를 수 있는 프로젝트: 아직 끝나지 않은 것
  const projectOptions = (choices.data ?? [])
    .filter((item) => ['PLANNED', 'IN_PROGRESS', 'SUSPENDED'].includes(item.status))
    .map((item) => ({ id: item.id, name: item.name }));
  const statusText = (projectId: string) => {
    const item = calendar.data?.workDays.find((day) => day.projectId === projectId);

    return item ? PROJECT_STATUS_LABELS[item.projectStatus] : '';
  };

  // 보기를 바꿀 때 기준일: 오늘이 지금 기간 안이면 오늘, 아니면 기간 가운데 (월로 바꿀 때 엉뚱한 달로 가지 않게)
  const anchorFor = (start: string, end: string) =>
    today >= start && today <= end
      ? today
      : shiftDate(start, Math.floor(countDays(start, end) / 2));

  const move = (direction: 1 | -1) => {
    const anchor =
      view === 'month'
        ? shiftMonth(from, direction)
        : shiftDate(from, direction * (view === 'week' ? 7 : 14));

    setParams({ view, from: anchor });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="인력 배치"
        description="누가 어느 프로젝트에서 일했는지, 누가 비었고 어디가 겹치는지 봅니다"
        back={<BackLink to="/employees">직원</BackLink>}
      />

      <div className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-3 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <PeriodNav
            isBare
            label={periodLabel(view, from, to)}
            prevLabel={view === 'month' ? '이전 달' : '이전 기간'}
            nextLabel={view === 'month' ? '다음 달' : '다음 기간'}
            onPrev={() => move(-1)}
            onNext={() => move(1)}
            todayLabel={view === 'month' ? '이번 달' : '오늘'}
            onToday={() => setParams({ view })}
            pickValue={from}
            onPick={(date) => setParams({ view, from: date })}
          />
        </div>
        <SegmentedControl
          aria-label="보기 기간"
          className="md:w-auto"
          value={view}
          onValueChange={(next) => setParams({ view: next, from: anchorFor(from, to) })}
          options={VIEWS}
        />
      </div>

      {calendar.isError && <Alert role="alert">배치 현황을 불러오지 못했습니다</Alert>}
      {calendar.isPending && <LoadingBlock label="불러오는 중" />}

      {calendar.data && (
        <div className="flex flex-col gap-4 rounded-3xl bg-surface-subtle p-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p aria-label="요약" className="text-sm">
              <span className="font-semibold">일한 사람 {summary.working}명</span>
              <span className="mx-2 text-sub">·</span>
              <span>일한 기록이 없는 사람 {summary.idle}명</span>
              {summary.away > 0 && (
                <>
                  <span className="mx-2 text-sub">·</span>
                  <span>휴직·퇴사 {summary.away}명</span>
                </>
              )}
              <span className="mx-2 text-sub">·</span>
              <span className={summary.conflicts > 0 ? 'font-semibold text-danger' : undefined}>
                겹침 {summary.conflicts}건
              </span>
            </p>
            {summary.conflicts > 0 && (
              <Chip selected={onlyConflicts} onClick={() => setOnlyConflicts((value) => !value)}>
                겹침 있는 사람만
              </Chip>
            )}
            {titles.length > 0 && (
              <Select
                className="w-40 md:ml-auto"
                aria-label="직종으로 거르기"
                value={title}
                emptyLabel="모든 직종"
                onValueChange={setTitle}
                options={titles.map((value) => ({ value, label: value }))}
              />
            )}
          </div>

          {shown.length === 0 ? (
            <EmptyState
              title={rows.length === 0 ? '등록된 직원이 없습니다' : '조건에 맞는 직원이 없습니다'}
              description={
                rows.length === 0
                  ? '직원을 등록하면 배치 현황이 보입니다'
                  : '직종이나 겹침 조건을 바꿔 보세요'
              }
            />
          ) : (
            <StaffingTimeline
              rows={shown}
              dates={listDates(from, to)}
              today={today}
              projectColors={projectColors}
              choices={projectOptions}
              highlightEmployeeId={highlightEmployeeId}
              columnMinWidth={COLUMN_MIN_WIDTH[view]}
            />
          )}

          <p className="text-sm text-sub">{READING_GUIDE}</p>
          {calendar.data.workDays.length > 0 && (
            <ul
              aria-label="표에 나온 프로젝트"
              className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm"
            >
              {[...projectColors.entries()].map(([projectId, color]) => {
                const item = calendar.data.workDays.find((day) => day.projectId === projectId)!;

                return (
                  <li key={projectId} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-3.5 w-1.5 rounded-full"
                      style={{ backgroundColor: `var(--proj-${color})` }}
                    />
                    {item.projectName}
                    <span className="text-sub">({statusText(projectId)})</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
