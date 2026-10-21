import { buildStaffingMonthCalendar, type Dashboard } from '@field-note/shared';
import { useMemo } from 'react';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { useStaffingCalendar } from '../staffing/useStaffingCalendar';

import { StaffingMonthCalendar } from './StaffingMonthCalendar';

// 대시보드의 이번 달 인력: 이번 달(1일~말일)을 달력으로 보여 주고 날짜 칸마다 일한 사람과 프로젝트를 모음
export const MonthStaffing = ({ dashboard }: { dashboard: Dashboard }) => {
  const { month, today } = dashboard;
  const calendar = useStaffingCalendar(month.from, month.to);
  const weeks = useMemo(
    () => (calendar.data ? buildStaffingMonthCalendar(calendar.data) : []),
    [calendar.data],
  );
  const projectColors = useMemo(() => {
    const ids = [...new Set((calendar.data?.workDays ?? []).map((item) => item.projectId))].sort();

    return new Map(ids.map((projectId, index) => [projectId, index % 6] as const));
  }, [calendar.data]);

  return (
    <section
      aria-labelledby="month-heading"
      className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="month-heading" className="text-lg font-bold">
          이번 달 인력
        </h2>
        <Link
          to={`/staffing?view=month&from=${month.from}`}
          className="inline-flex min-h-touch items-center text-sm text-primary underline"
        >
          인력 배치 보기
        </Link>
      </div>
      <p className="text-sm">
        <span className="font-semibold">일한 사람 {month.workingCount}명</span>
        <span className="mx-2 text-foreground/45">·</span>
        <span>일한 기록이 없는 사람 {month.idleCount}명</span>
        <span className="mx-2 text-foreground/45">·</span>
        <span className={month.conflicts.length > 0 ? 'font-semibold text-danger' : undefined}>
          {month.conflicts.length === 0
            ? '같은 날 겹친 사람 없음'
            : `겹침 ${month.conflicts.map((item) => `${item.name} ${item.dateCount}일`).join(', ')}`}
        </span>
      </p>
      {calendar.isError && <Alert role="alert">이번 달 인력을 불러오지 못했습니다</Alert>}
      {calendar.isPending && <p className="text-sm text-foreground/75">불러오는 중</p>}
      {calendar.data && (
        <StaffingMonthCalendar weeks={weeks} today={today} projectColors={projectColors} />
      )}
    </section>
  );
};
