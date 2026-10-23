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

const NAME_COLUMN = 'minmax(7.5rem, 9rem)';

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
    <div className="isolate overflow-x-auto rounded-xl border border-line bg-surface">
      <div role="group" aria-label="인력 배치 타임라인" className="min-w-max">
        <div className="grid border-b border-line" style={{ gridTemplateColumns: columns }}>
          <div className="sticky left-0 z-20 border-r border-line bg-surface-nested px-3 py-2.5 text-left text-sm font-semibold">
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
                  'px-1 py-1.5 text-center',
                  weekday === 0 && 'text-danger',
                  date === today ? 'bg-accent font-bold text-[#14110d]' : 'bg-surface-nested',
                )}
              >
                <span className="block text-[11px] leading-tight text-foreground/70">
                  {isFirst ? `${Number(date.slice(5, 7))}월` : ' '}
                </span>
                <span className="block text-sm font-bold">{Number(date.slice(8))}</span>
                <span className="block text-[11px] leading-tight">
                  {WEEKDAYS[weekday]}
                  {date === today && ' · 오늘'}
                </span>
              </div>
            );
          })}
        </div>

        {grouped.map(({ group, items }) => (
          <Fragment key={group}>
            <div className="sticky left-0 border-b border-line bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-foreground/70">
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
      className={cn('grid border-b border-line', isHighlighted && 'bg-warning-subtle/40')}
      style={{ gridTemplateColumns: columns }}
    >
      <div
        className={cn(
          'sticky left-0 z-20 flex flex-col justify-center gap-0.5 border-r border-line px-3 py-2',
          isHighlighted ? 'bg-warning-subtle' : 'bg-surface',
        )}
      >
        <Link
          to={`/employees/${employee.id}`}
          className="w-fit py-1 text-sm font-semibold underline-offset-2 hover:underline"
        >
          {employee.name}
        </Link>
        <span className="text-xs text-foreground/65">
          {[
            employee.title,
            employee.status !== 'ACTIVE' ? EMPLOYEE_STATUS_LABELS[employee.status] : null,
          ]
            .filter(Boolean)
            .join(' · ') || ' '}
        </span>
        {row.workedDays > 0 && (
          <span className="text-xs tabular-nums text-foreground/65">
            {row.workedDays}일 · {hours(row.totalMinutes)}시간
          </span>
        )}
      </div>

      <div
        className="grid"
        style={{
          gridColumn: `2 / span ${dates.length}`,
          gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${laneCount}, 3.25rem)`,
        }}
      >
        {dates.map((date, index) => {
          const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
          const isFuture = date > today;
          const background = cn(
            'border-l border-line',
            weekday === 0 && 'bg-surface-nested',
            date === today && 'bg-accent-subtle',
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
                  {employee.name} · {formatDay(date)} 하루 기록으로
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
                className="pointer-events-none relative z-10 flex min-w-0 flex-col overflow-hidden rounded-md border-l-4 p-px"
                style={{
                  gridColumn: `${segment.startIndex + 1} / span ${segment.days.length}`,
                  gridRow: laneIndex + 1,
                  borderLeftColor: `var(--proj-${color})`,
                  backgroundColor: `color-mix(in srgb, var(--proj-${color}) 16%, var(--surface))`,
                }}
              >
                <span className="truncate px-1.5 pt-0.5 text-xs font-semibold leading-tight">
                  {lane.name}
                </span>
                <span
                  className="absolute inset-0 grid"
                  style={{ gridTemplateColumns: `repeat(${segment.days.length}, minmax(0, 1fr))` }}
                >
                  {segment.days.map((day) => {
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
                          // 제목 칸까지 포함해 막대의 그날 세로 전체가 클릭 영역
                          'pointer-events-auto flex items-end justify-center rounded pb-1.5 text-[11px] tabular-nums text-foreground/80 hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-primary',
                          day.conflict && 'font-bold text-foreground ring-2 ring-danger ring-inset',
                        )}
                      >
                        {hours(day.minutes)}h
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
