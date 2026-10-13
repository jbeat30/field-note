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
export const StaffingGrid = ({ rows, dates }: { rows: StaffingRow[]; dates: string[] }) => (
  <div className="overflow-x-auto rounded-xl border border-border">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th
            scope="col"
            className="sticky left-0 z-10 min-w-24 border-r border-b border-border bg-muted px-2 py-2 text-left"
          >
            직원
          </th>
          {dates.map((date) => {
            const label = dayLabel(date);

            return (
              <th
                key={date}
                scope="col"
                className={cn(
                  'min-w-14 border-b border-border bg-muted px-1 py-2 text-center font-normal',
                  label.isSunday && 'text-danger',
                )}
              >
                <span className="block font-bold">{label.day}</span>
                <span className="block text-xs">{label.weekday}</span>
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
              className="sticky left-0 z-10 border-r border-b border-border bg-surface px-2 py-2 text-left font-medium"
            >
              <Link
                to={`/employees/${row.employee.id}`}
                className="underline-offset-2 hover:underline"
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

              return (
                <td
                  key={cell.date}
                  title={label}
                  aria-label={label}
                  data-state={cell.state}
                  className={cn(
                    'h-11 border-b border-border px-1 text-center text-xs',
                    cell.state === 'ASSIGNED' && 'bg-primary-subtle font-medium text-primary',
                    cell.state === 'CONFLICT' && 'bg-danger-subtle font-bold text-danger',
                    cell.state === 'UNAVAILABLE' && 'bg-muted text-foreground/70',
                  )}
                >
                  {text}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
