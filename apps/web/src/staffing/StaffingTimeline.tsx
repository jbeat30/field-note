import {
  EMPLOYEE_STATUS_LABELS,
  roundTo,
  type StaffingTimelineGroup,
  type StaffingTimelineRow,
} from '@field-note/shared';
import { Fragment } from 'react';
import { Link, useNavigate } from 'react-router';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { cn } from '../lib/cn';
import { formatDay, formatLongDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const GROUP_LABELS: Record<StaffingTimelineGroup, string> = {
  WORKING: '일한 사람',
  IDLE: '일한 기록이 없는 사람',
  AWAY: '휴직·퇴사',
};

const GROUP_ORDER: StaffingTimelineGroup[] = ['WORKING', 'IDLE', 'AWAY'];

const hours = (minutes: number) => roundTo(minutes / 60, 1);

export type StaffingProjectChoice = { id: string; name: string };

type StaffingTimelineProps = {
  rows: readonly StaffingTimelineRow[];
  dates: readonly string[];
  today: string;
  // 프로젝트 id → 구분 색 번호 (0~5)
  projectColors: ReadonlyMap<string, number>;
  // 빈 칸을 눌렀을 때 고를 수 있는 프로젝트 (진행·예정·중단)
  choices: readonly StaffingProjectChoice[];
  // 이 직원 행을 강조 (알림에서 들어올 때)
  highlightEmployeeId?: string | null;
  // 날짜 열 최소 너비 (보기에 따라 다름)
  columnMinWidth: string;
};

// 이름 칸 너비는 좁은 화면에서 줄여 날짜 칸이 더 많이 보이게 함
const NAME_COLUMN = 'var(--name-col)';

// 사람 행 × 날짜 열 타임라인: 같은 프로젝트에 이어서 일한 날은 막대 하나, 막대 안에 그날 시간
// 같은 날 두 프로젝트에서 일하면 막대가 위아래로 쌓이고 그 날은 빨간 테두리, 빈 칸을 누르면 프로젝트를 골라 그날 하루 기록으로 이동
export const StaffingTimeline = ({
  rows,
  dates,
  today,
  projectColors,
  choices,
  highlightEmployeeId,
  columnMinWidth,
}: StaffingTimelineProps) => {
  const navigate = useNavigate();
  const columns = `${NAME_COLUMN} repeat(${dates.length}, minmax(${columnMinWidth}, 1fr))`;
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: rows.filter((row) => row.group === group),
  })).filter((item) => item.items.length > 0);

  return (
    <div className="isolate overflow-x-auto rounded-[30px] bg-surface-subtle p-3 sm:p-4">
      <div
        role="group"
        aria-label="인력 배치 타임라인"
        className="min-w-max [--name-col:5.5rem] sm:[--name-col:9rem]"
      >
        <div className="grid gap-1 pb-1" style={{ gridTemplateColumns: columns }}>
          <div className="sticky left-0 z-20 rounded-xl bg-[var(--surface-nested)] px-3 py-2.5 text-left text-sm font-bold">
            직원
          </div>
          {dates.map((date) => {
            const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
            const isFirst = date.endsWith('-01') || date === dates[0];

            return (
              <div
                key={date}
                aria-current={date === today ? 'date' : undefined}
                className={cn(
                  'rounded-xl px-1 py-1.5 text-center',
                  weekday === 0 && 'text-danger',
                  date === today
                    ? 'bg-accent font-bold text-[#14110d]'
                    : 'bg-[var(--surface-nested)]',
                )}
              >
                <span className="block text-[11px] leading-tight text-sub">
                  {isFirst ? `${Number(date.slice(5, 7))}월` : ' '}
                </span>
                <span className="block text-sm font-bold">{Number(date.slice(8))}</span>
                <span className="block text-[11px] leading-tight">
                  {WEEKDAYS[weekday]}
                  {date === today && ', 오늘'}
                </span>
              </div>
            );
          })}
        </div>

        {grouped.map(({ group, items }) => (
          <Fragment key={group}>
            <div className="sticky left-0 mt-2 px-3 py-1.5 text-xs font-bold text-sub">
              <span>
                {GROUP_LABELS[group]} {items.length}명
              </span>
            </div>
            {items.map((row) => (
              <EmployeeRow
                key={row.employee.id}
                row={row}
                dates={dates}
                today={today}
                columns={columns}
                projectColors={projectColors}
                choices={choices}
                isHighlighted={row.employee.id === highlightEmployeeId}
                onPickProject={(projectId, date) => navigate(projectWorkPath(projectId, date))}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

const EmployeeRow = ({
  row,
  dates,
  today,
  columns,
  projectColors,
  choices,
  isHighlighted,
  onPickProject,
}: {
  row: StaffingTimelineRow;
  dates: readonly string[];
  today: string;
  columns: string;
  projectColors: ReadonlyMap<string, number>;
  choices: readonly StaffingProjectChoice[];
  isHighlighted: boolean;
  onPickProject: (projectId: string, date: string) => void;
}) => {
  const { employee } = row;
  const conflictDates = new Set(row.conflictDates);
  const laneCount = Math.max(row.lanes.length, 1);
  // 날짜별로 그날 일한 곳 전체 (겹침 설명에 씀)
  const projectsOn = (date: string) =>
    row.lanes.flatMap((lane) => {
      const day = lane.segments
        .flatMap((segment) => segment.days)
        .find((item) => item.date === date);

      return day ? [{ name: lane.name, minutes: day.minutes }] : [];
    });

  return (
    <div
      role="group"
      aria-label={employee.name}
      className={cn('grid gap-1 rounded-2xl py-0.5', isHighlighted && 'bg-warning-subtle/40')}
      style={{ gridTemplateColumns: columns }}
    >
      <div
        className={cn(
          'sticky left-0 z-20 flex flex-col justify-center gap-0.5 rounded-xl px-3 py-2',
          isHighlighted ? 'bg-warning-subtle' : 'bg-[var(--surface-subtle)]',
        )}
      >
        <Link
          to={`/employees/${employee.id}`}
          className="w-fit py-1 text-sm font-semibold hover:text-sub"
        >
          {employee.name}
        </Link>
        <span className="text-xs text-sub">
          {[
            employee.title,
            employee.status !== 'ACTIVE' ? EMPLOYEE_STATUS_LABELS[employee.status] : null,
          ]
            .filter(Boolean)
            .join(', ') || ' '}
        </span>
        {row.workedDays > 0 && (
          <span className="text-xs tabular-nums text-sub">
            {row.workedDays}일, {hours(row.totalMinutes)}시간
          </span>
        )}
        {row.conflictDates.length > 0 && (
          <span className="w-fit rounded-full bg-danger-subtle px-2 py-0.5 text-xs font-bold text-danger">
            겹침 {row.conflictDates.length}일
          </span>
        )}
      </div>

      <div
        className="grid gap-x-1"
        style={{
          gridColumn: `2 / span ${dates.length}`,
          gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${laneCount}, 3.25rem)`,
          rowGap: '0.25rem',
        }}
      >
        {dates.map((date, index) => {
          const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
          const isFuture = date > today;
          const isConflictDay = conflictDates.has(date);
          const background = cn(
            'rounded-xl border-2 border-line',
            weekday === 0 && 'bg-[var(--surface-nested)]',
            date === today && 'border-accent bg-accent-subtle',
            isConflictDay && 'border-danger bg-danger-subtle',
          );
          const style = { gridColumn: index + 1, gridRow: `1 / span ${laneCount}` };

          // 미래 날짜는 기록할 수 없어 선택 불가
          if (isFuture) {
            return <div key={date} aria-hidden className={background} style={style} />;
          }

          return (
            <DropdownMenu key={date}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`${employee.name} ${formatDay(date)} 프로젝트 고르기`}
                  title="눌러서 이 날 일한 프로젝트를 고르기"
                  className={cn(
                    background,
                    'cursor-pointer hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                  )}
                  style={style}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>
                  {employee.name}, {formatDay(date)} 하루 기록으로
                </DropdownMenuLabel>
                {choices.length === 0 ? (
                  <DropdownMenuItem disabled>기록할 수 있는 프로젝트가 없습니다</DropdownMenuItem>
                ) : (
                  choices.map((choice) => (
                    <DropdownMenuItem
                      key={choice.id}
                      onSelect={() => onPickProject(choice.id, date)}
                    >
                      {choice.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {row.lanes.flatMap((lane, laneIndex) =>
          lane.segments.map((segment) => {
            const color = projectColors.get(lane.projectId) ?? 0;

            return (
              <div
                key={`${lane.projectId}-${segment.startIndex}`}
                className="pointer-events-none relative z-10 mx-px flex min-w-0 flex-col overflow-hidden rounded-[10px] border-2"
                style={{
                  gridColumn: `${segment.startIndex + 1} / span ${segment.days.length}`,
                  gridRow: laneIndex + 1,
                  borderColor: `var(--proj-${color})`,
                  backgroundColor: `color-mix(in srgb, var(--proj-${color}) 28%, var(--surface-subtle))`,
                }}
              >
                <span className="truncate px-2 pt-1 text-xs leading-tight font-semibold">
                  {lane.name}
                </span>
                <span
                  className="absolute inset-0 grid"
                  style={{ gridTemplateColumns: `repeat(${segment.days.length}, minmax(0, 1fr))` }}
                >
                  {segment.days.map((day, dayIndex) => {
                    const detail = projectsOn(day.date)
                      .map((item) => `${item.name} ${hours(item.minutes)}시간`)
                      .join(', ');
                    const label = `${employee.name} ${formatLongDay(day.date)}: ${detail}${day.conflict ? ' (같은 날 겹침)' : ''}`;

                    return (
                      <Link
                        key={day.date}
                        to={projectWorkPath(lane.projectId, day.date)}
                        aria-label={label}
                        title={label}
                        data-conflict={day.conflict || undefined}
                        className={cn(
                          // 제목 칸까지 포함해 막대의 그날 세로 전체가 클릭 영역, 모서리는 막대가 잘라 줌
                          'pointer-events-auto relative flex items-end justify-center pb-1.5 text-[11px] tabular-nums text-foreground/80 hover:bg-foreground/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                          dayIndex > 0 && 'border-l border-foreground/15',
                          day.conflict && 'font-bold text-foreground',
                        )}
                      >
                        {hours(day.minutes)}h
                        {day.conflict && (
                          <span
                            aria-hidden
                            className="absolute right-1 bottom-1.5 size-1.5 rounded-full bg-danger"
                          />
                        )}
                      </Link>
                    );
                  })}
                </span>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
};
