import {
  PROJECT_STATUS_LABELS,
  buildStaffingMonthCalendar,
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
import { StatGroup } from '../components/ui/stat-group';
import { StaffingMonthCalendar } from '../dashboard/StaffingMonthCalendar';
import { useProjectChoices } from '../projects/useProjects';
import { StaffingByProject } from '../staffing/StaffingByProject';
import { StaffingTimeline } from '../staffing/StaffingTimeline';
import { useStaffingCalendar } from '../staffing/useStaffingCalendar';
import { LoadingBlock } from '../components/ui/loading-block';

type View = 'week' | 'twoWeeks' | 'month';

const VIEWS: { value: View; label: string }[] = [
  { value: 'week', label: '1주' },
  { value: 'twoWeeks', label: '2주' },
  { value: 'month', label: '월' },
];

// 날짜 칸 달력, 사람 기준 타임라인, 프로젝트 기준 카드 세 가지 보기
type Layout = 'calendar' | 'person' | 'project';

const LAYOUTS: { value: Layout; label: string }[] = [
  { value: 'calendar', label: '달력' },
  { value: 'person', label: '사람별' },
  { value: 'project', label: '프로젝트별' },
];

// 상태로 거르기: 일한 사람, 기록 없는 사람, 겹침 있는 사람
type StatusFilter = 'all' | 'working' | 'idle' | 'conflict';

// 날짜 열 최소 너비: 길게 볼수록 좁게 (넘치면 표만 가로 스크롤)
const COLUMN_MIN_WIDTH: Record<View, string> = {
  week: '3.75rem',
  twoWeeks: '2.75rem',
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

// 보기별 한 줄 사용 안내
const GUIDES: Record<Layout, string> = {
  calendar:
    '날짜 칸을 누르면 아래에 그날 일한 사람이 프로젝트별로 나옵니다. 빨간 테두리는 같은 날 두 곳 이상에서 일한 사람이 있는 날입니다',
  person:
    '막대를 누르면 그날 하루 기록, 빈 칸을 누르면 프로젝트를 골라 그날 기록으로 갑니다. 같은 날 두 곳에서 일하면 빨간 테두리로 표시됩니다',
  project:
    '칸 하나가 하루입니다. 색이 칠해진 칸을 누르면 그날 하루 기록으로 갑니다. 같은 날 두 곳에서 일하면 빨간 테두리로 표시됩니다',
};

// 인력 배치: 사람별 타임라인과 프로젝트별 카드로 누가 어디에서 일했고 누가 비었고 어디가 겹치는지 확인
export const StaffingCalendarPage = () => {
  const [params, setParams] = useSearchParams();
  const view: View = isView(params.get('view')) ? (params.get('view') as View) : 'week';
  const by = params.get('by');
  const layout: Layout = by === 'project' ? 'project' : by === 'person' ? 'person' : 'calendar';
  const requested = params.get('from');
  const today = todayInSeoul(new Date());
  const { from, to } = periodOf(view, isDate(requested) ? requested : today);
  const calendar = useStaffingCalendar(from, to);
  const choices = useProjectChoices();
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const highlightEmployeeId = params.get('employee');

  const rows = useMemo(
    () => (calendar.data ? buildStaffingTimeline(calendar.data) : []),
    [calendar.data],
  );
  const summary = summarizeStaffingTimeline(rows);
  const conflictPeople = rows.filter((row) => row.conflictDates.length > 0).length;
  const titles = [
    ...new Set(
      rows.map((row) => row.employee.title).filter((value): value is string => Boolean(value)),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ko'));
  const matchesStatus = (row: (typeof rows)[number]) =>
    status === 'all' ||
    (status === 'working' && row.group === 'WORKING') ||
    (status === 'idle' && row.group !== 'WORKING') ||
    (status === 'conflict' && row.conflictDates.length > 0);
  const shown = rows.filter(
    (row) => (!title || row.employee.title === title) && matchesStatus(row),
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

  // 기간을 바꿔도 보기 방식은 유지 (달력은 기본이라 주소에 담지 않음)
  const withLayout = (values: Record<string, string>, next: Layout = layout) =>
    next === 'calendar' ? values : { ...values, by: next };

  const move = (direction: 1 | -1) => {
    const anchor =
      view === 'month'
        ? shiftMonth(from, direction)
        : shiftDate(from, direction * (view === 'week' ? 7 : 14));

    setParams(withLayout({ view, from: anchor }));
  };

  // 달력 보기도 위 조건(직종, 상태)에 맞는 사람만 보여 줌
  const filteredCalendar = useMemo(() => {
    if (!calendar.data) return null;

    const ids = new Set(shown.map((row) => row.employee.id));

    return {
      ...calendar.data,
      employees: calendar.data.employees.filter((employee) => ids.has(employee.id)),
      workDays: calendar.data.workDays.filter((item) => ids.has(item.employeeId)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar.data, title, status]);
  const monthWeeks = useMemo(
    () => (filteredCalendar ? buildStaffingMonthCalendar(filteredCalendar) : []),
    [filteredCalendar],
  );

  const statusOptions = [
    { value: 'all', label: '전체', count: rows.length },
    { value: 'working', label: '일한 사람', count: summary.working },
    { value: 'idle', label: '기록 없는 사람', count: summary.idle + summary.away },
    { value: 'conflict', label: '겹침 있는 사람', count: conflictPeople },
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        overlap
        title="인력 배치"
        description="누가 어느 프로젝트에서 일했는지, 누가 비었고 어디가 겹치는지 봅니다"
        back={<BackLink to="/employees">직원</BackLink>}
      />

      <div className="relative -mt-14 flex flex-col gap-3 rounded-[30px] bg-surface-subtle p-4 sm:p-5">
        <PeriodNav
          isBare
          label={periodLabel(view, from, to)}
          prevLabel={view === 'month' ? '이전 달' : '이전 기간'}
          nextLabel={view === 'month' ? '다음 달' : '다음 기간'}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
          todayLabel={view === 'month' ? '이번 달' : '오늘'}
          onToday={() => setParams(withLayout({ view }))}
          pickValue={from}
          onPick={(date) => setParams(withLayout({ view, from: date }))}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <SegmentedControl
            aria-label="보기 기간"
            value={view}
            onValueChange={(next) =>
              setParams(withLayout({ view: next, from: anchorFor(from, to) }))
            }
            options={VIEWS}
          />
          <SegmentedControl
            aria-label="보기 방식"
            value={layout}
            onValueChange={(next) => setParams(withLayout({ view, from }, next))}
            options={LAYOUTS}
          />
        </div>
      </div>

      {calendar.isError && <Alert role="alert">배치 현황을 불러오지 못했습니다</Alert>}
      {calendar.isPending && (
        <LoadingBlock
          label="불러오는 중"
          variant="blocks"
          heights={[
            [226, 181],
            [640, 560],
          ]}
        />
      )}

      {calendar.data && (
        <>
          <StatGroup
            items={[
              { label: '일한 사람', value: summary.working, unit: '명' },
              { label: '일한 기록이 없는 사람', value: summary.idle, unit: '명' },
              { label: '휴직·퇴사', value: summary.away, unit: '명' },
              {
                label: '겹침',
                value: summary.conflicts,
                unit: '건',
                tone: summary.conflicts > 0 ? 'danger' : 'default',
                hint: summary.conflicts > 0 ? '같은 날 두 곳 이상' : '겹치는 날 없음',
              },
            ]}
          />

          <div className="flex flex-col gap-4 rounded-[30px] bg-surface-subtle p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              {statusOptions.map((option) => (
                <Chip
                  key={option.value}
                  selected={status === option.value}
                  onClick={() => setStatus(option.value)}
                >
                  {option.label} {option.count}
                </Chip>
              ))}
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
                    : '직종이나 상태 조건을 바꿔 보세요'
                }
              />
            ) : layout === 'calendar' ? (
              <StaffingMonthCalendar
                key={`${from}-${to}-${title}-${status}`}
                weeks={monthWeeks}
                today={today}
                projectColors={projectColors}
                headingLevel={2}
              />
            ) : layout === 'person' ? (
              <StaffingTimeline
                rows={shown}
                dates={listDates(from, to)}
                today={today}
                projectColors={projectColors}
                choices={projectOptions}
                highlightEmployeeId={highlightEmployeeId}
                columnMinWidth={COLUMN_MIN_WIDTH[view]}
              />
            ) : (
              <StaffingByProject
                rows={shown}
                dates={listDates(from, to)}
                today={today}
                projectColors={projectColors}
              />
            )}

            <p className="text-sm text-sub">{GUIDES[layout]}</p>
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
        </>
      )}
    </div>
  );
};
