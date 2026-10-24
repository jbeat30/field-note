import {
  PROJECT_STATUS_LABELS,
  roundTo,
  type ProjectStatus,
  type StaffingTimelineRow,
} from '@field-note/shared';
import { Link } from 'react-router';

import { Badge } from '../components/ui/badge';
import { cn } from '../lib/cn';
import { formatLongDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const hours = (minutes: number) => roundTo(minutes / 60, 1);

// 이 날짜 수를 넘으면(월 보기) 칸 안에 글자를 넣지 않는 촘촘한 띠로 그림
const COMPACT_OVER = 14;

type StaffingByProjectProps = {
  rows: readonly StaffingTimelineRow[];
  dates: readonly string[];
  today: string;
  // 프로젝트 id → 구분 색 번호 (0~5)
  projectColors: ReadonlyMap<string, number>;
};

type ProjectCard = {
  projectId: string;
  code: string;
  name: string;
  status: ProjectStatus;
  people: {
    row: StaffingTimelineRow;
    // 날짜 → 그날 이 프로젝트에서 일한 분
    minutesByDate: Map<string, number>;
    conflictDates: Set<string>;
  }[];
};

// 프로젝트 기준 보기: 프로젝트마다 누가 며칠, 몇 시간 일했는지와 그 기간의 일한 날 띠를 보여 줌
// 띠의 칸 하나가 하루: 짧은 기간은 칸 안에 시간, 월 보기는 색만 칠한 촘촘한 띠
export const StaffingByProject = ({
  rows,
  dates,
  today,
  projectColors,
}: StaffingByProjectProps) => {
  const isCompact = dates.length > COMPACT_OVER;
  const cards = new Map<string, ProjectCard>();

  for (const row of rows) {
    for (const lane of row.lanes) {
      const card = cards.get(lane.projectId) ?? {
        projectId: lane.projectId,
        code: lane.code,
        name: lane.name,
        status: lane.status,
        people: [],
      };
      const minutesByDate = new Map<string, number>();

      for (const segment of lane.segments) {
        for (const day of segment.days) minutesByDate.set(day.date, day.minutes);
      }

      card.people.push({ row, minutesByDate, conflictDates: new Set(row.conflictDates) });
      cards.set(lane.projectId, card);
    }
  }

  const ordered = [...cards.values()].sort((a, b) => a.code.localeCompare(b.code));
  const resting = rows.filter((row) => row.lanes.length === 0);
  const stripStyle = { gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))` };
  const stripClass = cn('grid min-w-0', isCompact ? 'gap-px' : 'gap-1');

  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="프로젝트별 인력" className="grid gap-4 xl:grid-cols-2">
        {ordered.map((card) => {
          const color = projectColors.get(card.projectId) ?? 0;
          const minutes = card.people.reduce(
            (sum, person) => sum + [...person.minutesByDate.values()].reduce((a, b) => a + b, 0),
            0,
          );

          return (
            <li
              key={card.projectId}
              className="flex flex-col gap-3 rounded-[24px] bg-[var(--surface-nested)] p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-1 h-10 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--proj-${color})` }}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/projects/${card.projectId}`}
                      className="text-[17px] font-extrabold tracking-tight hover:text-sub"
                    >
                      {card.name}
                    </Link>
                    <Badge>{PROJECT_STATUS_LABELS[card.status]}</Badge>
                  </div>
                  <p className="text-sm text-sub tabular-nums">
                    {card.people.length}명, {hours(minutes)}시간
                  </p>
                </div>
              </div>

              <div
                aria-hidden
                className="grid items-end gap-3 px-3 sm:grid-cols-[minmax(6rem,8rem)_1fr_6rem]"
              >
                <span className="hidden sm:block" />
                <DayHeader
                  dates={dates}
                  today={today}
                  isCompact={isCompact}
                  className={stripClass}
                />
                <span className="hidden sm:block" />
              </div>

              <ul className="flex flex-col gap-1.5">
                {card.people.map(({ row, minutesByDate, conflictDates }) => {
                  const total = [...minutesByDate.values()].reduce((a, b) => a + b, 0);

                  return (
                    <li
                      key={row.employee.id}
                      className="flex flex-col gap-2 rounded-2xl bg-[var(--surface-subtle)] px-3 py-2.5 sm:grid sm:grid-cols-[minmax(6rem,8rem)_1fr_6rem] sm:items-center sm:gap-3"
                    >
                      <div className="flex items-baseline justify-between gap-2 sm:contents">
                        <Link
                          to={`/employees/${row.employee.id}`}
                          className="min-w-0 truncate py-1 text-sm font-semibold hover:text-sub"
                        >
                          {row.employee.name}
                          {row.employee.title && (
                            <span className="ml-1.5 text-xs font-normal text-sub">
                              {row.employee.title}
                            </span>
                          )}
                        </Link>
                        <span className="text-right text-xs whitespace-nowrap text-sub tabular-nums sm:order-3">
                          {minutesByDate.size}일, {hours(total)}시간
                        </span>
                      </div>
                      <span className={cn(stripClass, 'sm:order-2')} style={stripStyle}>
                        {dates.map((date) => {
                          const worked = minutesByDate.get(date);
                          const isConflict = worked !== undefined && conflictDates.has(date);
                          const isToday = date === today;
                          const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
                          const cell = cn(
                            'flex items-center justify-center text-[11px] font-bold tabular-nums',
                            isCompact ? 'h-7 rounded-[3px]' : 'h-8 rounded-md',
                            worked === undefined
                              ? cn(
                                  'border',
                                  isToday ? 'border-accent bg-accent-subtle' : 'border-line',
                                  weekday === 0 && !isToday && 'bg-[var(--surface-nested)]',
                                )
                              : cn('border-2', isConflict && 'border-danger'),
                          );

                          if (worked === undefined) {
                            return <span key={date} aria-hidden className={cell} />;
                          }

                          const label = `${row.employee.name} ${formatLongDay(date)} ${card.name} ${hours(worked)}시간${isConflict ? ' (같은 날 겹침)' : ''}`;

                          return (
                            <Link
                              key={date}
                              to={projectWorkPath(card.projectId, date)}
                              aria-label={label}
                              title={label}
                              data-conflict={isConflict || undefined}
                              className={cn(
                                cell,
                                'text-foreground/85 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
                              )}
                              style={{
                                borderColor: isConflict ? undefined : `var(--proj-${color})`,
                                backgroundColor: `color-mix(in srgb, var(--proj-${color}) 40%, var(--surface-subtle))`,
                              }}
                            >
                              {!isCompact && hours(worked)}
                            </Link>
                          );
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>

      {ordered.length === 0 && (
        <p className="rounded-2xl bg-[var(--surface-nested)] p-4 text-sm text-sub">
          이 기간에 저장된 작업 내역이 있는 프로젝트가 없습니다
        </p>
      )}

      {resting.length > 0 && (
        <section
          aria-label="일한 기록이 없는 사람"
          className="flex flex-col gap-2 rounded-[24px] bg-[var(--surface-nested)] p-4 sm:p-5"
        >
          <h2 className="text-[15px] font-extrabold">일한 기록이 없는 사람 {resting.length}명</h2>
          <ul className="flex flex-wrap gap-2">
            {resting.map((row) => (
              <li key={row.employee.id}>
                <Link
                  to={`/employees/${row.employee.id}`}
                  className="inline-flex min-h-touch items-center rounded-full bg-[var(--surface-subtle)] px-4 text-sm font-semibold hover:text-sub"
                >
                  {row.employee.name}
                  {row.employee.title && (
                    <span className="ml-1.5 text-xs font-normal text-sub">
                      {row.employee.title}
                    </span>
                  )}
                  {row.employee.status !== 'ACTIVE' && (
                    <span className="ml-1.5 text-xs font-normal text-sub">휴직·퇴사</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

// 날짜 머리글: 짧은 기간은 날짜와 요일, 월 보기는 1일과 5의 배수 날짜만 표시
const DayHeader = ({
  dates,
  today,
  isCompact,
  className,
}: {
  dates: readonly string[];
  today: string;
  isCompact: boolean;
  className: string;
}) => (
  <span
    className={cn(className, 'text-center text-[11px] leading-tight text-sub')}
    style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))` }}
  >
    {dates.map((date) => {
      const day = Number(date.slice(8));
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      const showLabel = !isCompact || day === 1 || day % 5 === 0;

      return (
        <span
          key={date}
          className={cn(
            'rounded-md py-0.5',
            weekday === 0 && 'text-danger',
            date === today && 'bg-accent font-bold text-[#14110d]',
          )}
        >
          <span className="block">{showLabel ? day : ' '}</span>
          {!isCompact && <span className="block">{WEEKDAYS[weekday]}</span>}
        </span>
      );
    })}
  </span>
);
