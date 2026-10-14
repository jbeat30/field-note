import { EMPLOYEE_STATUS_LABELS, type StaffingRow } from '@field-note/shared';
import { Link } from 'react-router';

import { cn } from '../lib/cn';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const dayLabel = (date: string) => ({
  day: Number(date.slice(8)),
  weekday: WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]!,
  isSunday: new Date(`${date}T00:00:00Z`).getUTCDay() === 0,
});

// 직원 × 날짜 표: 가로로 밀어 볼 수 있고 직원 이름 열은 고정. 칸에는 프로젝트 번호 끝 3자리만 보여 좁은 화면에서도 읽힌다
export const StaffingGrid = ({
  rows,
  dates,
  today,
  projectColors,
}: {
  rows: StaffingRow[];
  dates: string[];
  // 오늘 날짜가 표 안에 있으면 그 열을 강조
  today?: string;
  // 프로젝트 id → 구분 색 번호 (0~5). 없으면 모두 같은 색
  projectColors?: Map<string, number>;
}) => (
  <div className="overflow-x-auto rounded-xl bg-surface-subtle">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th
            scope="col"
            className="sticky left-0 z-10 min-w-28 border-r border-b border-line bg-surface-nested px-3 py-3 text-left font-semibold"
          >
            직원
          </th>
          {dates.map((date) => {
            const label = dayLabel(date);

            return (
              <th
                key={date}
                scope="col"
                aria-current={date === today ? 'date' : undefined}
                className={cn(
                  'min-w-16 border-b border-line bg-surface-nested px-1 py-2 text-center font-normal',
                  label.isSunday && 'text-danger',
                  date === today && 'bg-primary-subtle text-primary',
                )}
              >
                <span className="block text-base font-bold">{label.day}</span>
                <span className="block text-xs">
                  {label.weekday}
                  {date === today && ' · 오늘'}
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.employee.id}>
            <th
              scope="row"
              className="sticky left-0 z-10 border-r border-b border-line bg-surface-subtle px-3 py-2 text-left font-medium"
            >
              <Link
                to={`/employees/${row.employee.id}`}
                className="inline-flex min-h-touch items-center underline-offset-2 hover:underline"
              >
                {row.employee.name}
              </Link>
              {row.employee.status !== 'ACTIVE' && (
                <span className="block text-xs font-normal text-foreground/70">
                  {EMPLOYEE_STATUS_LABELS[row.employee.status]}
                </span>
              )}
            </th>
            {row.cells.map((cell) => {
              const names = cell.projects.map((project) => `${project.code} ${project.name}`);
              const text =
                cell.state === 'CONFLICT'
                  ? `겹침 ${cell.projects.length}`
                  : cell.state === 'ASSIGNED'
                    ? cell.projects[0]!.code.slice(-3)
                    : cell.state === 'UNAVAILABLE'
                      ? EMPLOYEE_STATUS_LABELS[cell.unavailable!]
                      : '';
              const label =
                cell.state === 'FREE'
                  ? `${row.employee.name} ${cell.date} 비어 있음`
                  : cell.state === 'UNAVAILABLE'
                    ? `${row.employee.name} ${cell.date} ${EMPLOYEE_STATUS_LABELS[cell.unavailable!]}`
                    : `${row.employee.name} ${cell.date} ${names.join(', ')}${cell.state === 'CONFLICT' ? ' (같은 날 겹침)' : ''}`;

              const color = cell.projects[0] ? (projectColors?.get(cell.projects[0].id) ?? 0) : 0;

              return (
                <td
                  key={cell.date}
                  title={label}
                  aria-label={label}
                  data-state={cell.state}
                  className={cn(
                    'h-14 border-b border-line p-1 text-center text-xs',
                    cell.date === today && 'bg-primary-subtle/50',
                    cell.state === 'FREE' &&
                      new Date(`${cell.date}T00:00:00Z`).getUTCDay() === 0 &&
                      'bg-surface-nested',
                    cell.state === 'UNAVAILABLE' && 'bg-surface-nested text-foreground/70',
                  )}
                >
                  {cell.state === 'ASSIGNED' && (
                    <span
                      className="flex h-full items-center justify-center rounded-md border-l-4 bg-surface-nested font-semibold text-foreground"
                      style={{ borderLeftColor: `var(--proj-${color})` }}
                    >
                      {text}
                    </span>
                  )}
                  {cell.state === 'CONFLICT' && (
                    <span className="flex h-full items-center justify-center rounded-md bg-danger-subtle font-bold text-danger ring-1 ring-danger/40">
                      {text}
                    </span>
                  )}
                  {(cell.state === 'UNAVAILABLE' || cell.state === 'FREE') && text}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
