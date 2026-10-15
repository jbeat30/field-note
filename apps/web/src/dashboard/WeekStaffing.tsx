import { buildStaffingTimeline, listDates, type Dashboard } from '@field-note/shared';
import { useMemo } from 'react';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { useProjectChoices } from '../projects/useProjects';
import { StaffingTimeline } from '../staffing/StaffingTimeline';
import { useStaffingCalendar } from '../staffing/useStaffingCalendar';

// 홈의 이번 주 인력: 인력 배치 타임라인을 1주로 줄여 그대로 보여 준다 (누가 일했고 누가 비었고 어디가 겹치는지)
export const WeekStaffing = ({ dashboard }: { dashboard: Dashboard }) => {
  const { week, today } = dashboard;
  const calendar = useStaffingCalendar(week.from, week.to);
  const choices = useProjectChoices();
  const rows = useMemo(
    () => (calendar.data ? buildStaffingTimeline(calendar.data) : []),
    [calendar.data],
  );
  const projectColors = useMemo(() => {
    const ids = [...new Set((calendar.data?.workDays ?? []).map((item) => item.projectId))].sort();

    return new Map(ids.map((projectId, index) => [projectId, index % 6] as const));
  }, [calendar.data]);
  const projectOptions = (choices.data ?? [])
    .filter((item) => ['PLANNED', 'IN_PROGRESS', 'SUSPENDED'].includes(item.status))
    .map((item) => ({ id: item.id, name: item.name }));

  return (
    <section
      aria-labelledby="week-heading"
      className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="week-heading" className="text-lg font-bold">
          이번 주 인력
        </h2>
        <Link
          to={`/staffing?from=${week.from}`}
          className="inline-flex min-h-touch items-center text-sm text-primary underline"
        >
          인력 배치 보기
        </Link>
      </div>
      <p className="text-sm">
        <span className="font-semibold">일한 사람 {week.workingCount}명</span>
        <span className="mx-2 text-foreground/45">·</span>
        <span>일한 기록이 없는 사람 {week.idleCount}명</span>
        <span className="mx-2 text-foreground/45">·</span>
        <span className={week.conflicts.length > 0 ? 'font-semibold text-danger' : undefined}>
          {week.conflicts.length === 0
            ? '같은 날 겹친 사람 없음'
            : `겹침 ${week.conflicts.map((item) => `${item.name} ${item.dateCount}일`).join(', ')}`}
        </span>
      </p>
      {calendar.isError && <Alert role="alert">이번 주 인력을 불러오지 못했습니다</Alert>}
      {calendar.isPending && <p className="text-sm text-foreground/75">불러오는 중</p>}
      {calendar.data &&
        (rows.length === 0 ? (
          <p className="text-sm text-foreground/75">등록된 직원이 없습니다</p>
        ) : (
          <StaffingTimeline
            rows={rows}
            dates={listDates(week.from, week.to)}
            today={today}
            projectColors={projectColors}
            choices={projectOptions}
            columnMinWidth="3.5rem"
          />
        ))}
    </section>
  );
};
