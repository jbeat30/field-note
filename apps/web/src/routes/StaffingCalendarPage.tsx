import {
  PROJECT_STATUS_LABELS,
  buildStaffingGrid,
  findFreeEmployees,
  findStaffingConflicts,
  listDates,
  periodStart,
  shiftDate,
  todayInSeoul,
} from '@field-note/shared';
import { useSearchParams } from 'react-router';

import { BackLink } from '../components/ui/back-link';
import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { EmptyState } from '../components/ui/empty-state';
import { PeriodNav } from '../components/ui/period-nav';
import { StaffingGrid } from '../staffing/StaffingGrid';
import { useStaffingCalendar } from '../staffing/useStaffingCalendar';

const WEEK_DAYS = 7;

const isDate = (value: string | null): value is string =>
  value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

// 인력 배치 캘린더 (§9.7): 한 주 단위로 직원 × 날짜 투입 현황, 같은 날 겹침, 이번 주 비는 사람
export const StaffingCalendarPage = () => {
  const [params, setParams] = useSearchParams();
  const requested = params.get('from');
  // 주소의 시작일은 그 주 월요일로 맞춘다 (없거나 잘못되면 이번 주)
  const from = periodStart(isDate(requested) ? requested : todayInSeoul(new Date()), 'week');
  const to = shiftDate(from, WEEK_DAYS - 1);
  const calendar = useStaffingCalendar(from, to);
  const move = (days: number) => setParams({ from: shiftDate(from, days) });
  const rows = calendar.data ? buildStaffingGrid(calendar.data) : [];
  const conflicts = findStaffingConflicts(rows);
  const free = findFreeEmployees(rows);
  // 프로젝트마다 표와 범례에서 같은 구분 색을 쓴다 (프로젝트 id 순서로 0~5번 색을 돌려 씀)
  const projects = new Map(
    (calendar.data?.assignments ?? []).map((item) => [item.projectId, item]),
  );
  const projectColors = new Map(
    [...projects.keys()].sort().map((projectId, index) => [projectId, index % 6] as const),
  );

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/employees">직원</BackLink>
      <PageHeader title="인력 배치" description="직원별 투입 현황과 겹침을 한 주 단위로 봅니다" />

      <PeriodNav
        label={`${from} ~ ${to}`}
        prevLabel="이전 주"
        nextLabel="다음 주"
        onPrev={() => move(-WEEK_DAYS)}
        onNext={() => move(WEEK_DAYS)}
        todayLabel="이번 주"
        onToday={() => setParams({})}
        pickValue={from}
        onPick={(date) => setParams({ from: periodStart(date, 'week') })}
      />

      {calendar.isError && <Alert role="alert">배치 현황을 불러오지 못했습니다</Alert>}
      {calendar.isPending && <p>불러오는 중</p>}

      {calendar.data && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-3">
            <ul
              aria-label="표 보는 법"
              className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground/70"
            >
              <li className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-5 w-8 rounded-md border-l-4 bg-surface-subtle ring-1 ring-line"
                  style={{ borderLeftColor: 'var(--proj-0)' }}
                />
                프로젝트 투입
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-5 w-8 rounded-md bg-danger-subtle ring-1 ring-danger/40"
                />
                한 날 두 곳 이상
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-5 w-8 rounded-md bg-surface-nested ring-1 ring-line"
                />
                휴직·퇴사
              </li>
            </ul>
            {rows.length === 0 ? (
              <EmptyState
                title="등록된 직원이 없습니다"
                description="직원을 등록하면 배치 현황이 보입니다"
              />
            ) : (
              <StaffingGrid
                rows={rows}
                dates={listDates(from, to)}
                today={todayInSeoul(new Date())}
                projectColors={projectColors}
              />
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <section
              aria-labelledby="staffing-conflicts"
              className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-5"
            >
              <h2 id="staffing-conflicts" className="text-lg font-bold">
                같은 날 겹침
              </h2>
              {conflicts.length === 0 ? (
                <p className="text-sm text-foreground/70">이 주에는 겹치는 배치가 없습니다</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {conflicts.map((item) => (
                    <li key={item.employee.id} className="text-sm text-danger">
                      {item.employee.name}: {item.dates.map((date) => date.slice(5)).join(', ')}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              aria-labelledby="staffing-free"
              className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-5"
            >
              <h2 id="staffing-free" className="text-lg font-bold">
                이번 주 비는 사람
              </h2>
              <p className="text-sm text-foreground/70">일요일을 뺀 모든 날에 투입이 없는 직원</p>
              {free.length === 0 ? (
                <p className="text-sm">없습니다</p>
              ) : (
                <p className="flex flex-wrap gap-1.5">
                  {free.map((item) => (
                    <Badge key={item.id} tone="success">
                      {item.name}
                    </Badge>
                  ))}
                </p>
              )}
            </section>

            {projects.size > 0 && (
              <section
                aria-labelledby="staffing-projects"
                className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-5"
              >
                <h2 id="staffing-projects" className="text-lg font-bold">
                  표에 나온 프로젝트
                </h2>
                <ul className="flex flex-col gap-2 text-sm">
                  {[...projects.values()].map((item) => (
                    <li key={item.projectId} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="mt-1 h-4 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: `var(--proj-${projectColors.get(item.projectId) ?? 0})`,
                        }}
                      />
                      <span>
                        {item.projectCode.slice(-3)} · {item.projectCode} {item.projectName} (
                        {PROJECT_STATUS_LABELS[item.projectStatus]})
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
