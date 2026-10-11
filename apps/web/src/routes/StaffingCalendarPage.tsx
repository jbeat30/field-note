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

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
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
  const projects = new Map(
    (calendar.data?.assignments ?? []).map((item) => [item.projectId, item]),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">인력 배치</h1>

      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" aria-label="이전 주" onClick={() => move(-WEEK_DAYS)}>
          ‹
        </Button>
        <div className="flex flex-col items-center">
          <p className="font-bold">
            {from} ~ {to}
          </p>
          <button
            type="button"
            className="min-h-touch text-sm text-primary underline"
            onClick={() => setParams({})}
          >
            이번 주
          </button>
        </div>
        <Button variant="secondary" aria-label="다음 주" onClick={() => move(WEEK_DAYS)}>
          ›
        </Button>
      </div>

      {calendar.isError && <Alert role="alert">배치 현황을 불러오지 못했습니다</Alert>}
      {calendar.isPending && <p>불러오는 중</p>}

      {calendar.data && (
        <>
          {rows.length === 0 ? (
            <p className="text-foreground/70">등록된 직원이 없습니다</p>
          ) : (
            <StaffingGrid rows={rows} dates={listDates(from, to)} />
          )}

          <section aria-labelledby="staffing-conflicts" className="flex flex-col gap-2">
            <h2 id="staffing-conflicts" className="text-lg font-bold">
              같은 날 겹침
            </h2>
            {conflicts.length === 0 ? (
              <p className="text-foreground/70">이 주에는 겹치는 배치가 없습니다</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {conflicts.map((item) => (
                  <li key={item.employee.id} className="text-danger">
                    {item.employee.name}: {item.dates.map((date) => date.slice(5)).join(', ')}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="staffing-free" className="flex flex-col gap-2">
            <h2 id="staffing-free" className="text-lg font-bold">
              이번 주 비는 사람
            </h2>
            <p className="text-sm text-foreground/70">일요일을 뺀 모든 날에 투입이 없는 직원</p>
            {free.length === 0 ? (
              <p>없습니다</p>
            ) : (
              <p>{free.map((item) => item.name).join(', ')}</p>
            )}
          </section>

          {projects.size > 0 && (
            <section aria-labelledby="staffing-projects" className="flex flex-col gap-2">
              <h2 id="staffing-projects" className="text-lg font-bold">
                표에 나온 프로젝트
              </h2>
              <ul className="flex flex-col gap-1 text-sm">
                {[...projects.values()].map((item) => (
                  <li key={item.projectId}>
                    {item.projectCode.slice(-3)} · {item.projectCode} {item.projectName} (
                    {PROJECT_STATUS_LABELS[item.projectStatus]})
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
};
