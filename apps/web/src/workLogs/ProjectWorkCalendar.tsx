import { roundTo, type WorkLogSummary } from '@field-note/shared';
import { Link } from 'react-router';

import { Badge } from '../components/ui/badge';
import { cn } from '../lib/cn';
import { addDays } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

// 토요일은 파랑, 일요일은 빨강 (요일 머리와 날짜 숫자 공통, 밝은 모드와 어두운 모드 모두 대비 확보)
const weekendTone = (column: number) =>
  column === 5 ? 'text-[#2a55c4] dark:text-[#9db8ff]' : column === 6 ? 'text-danger' : '';

type Props = {
  projectId: string;
  // 보여 줄 달의 1일 (YYYY-MM-01)
  month: string;
  today: string;
  // 프로젝트 예정 기간 (이 밖의 날은 입력 불가)
  plannedStart: string;
  plannedEnd: string;
  logs: readonly WorkLogSummary[];
  nameOf: (employeeId: string) => string;
};

// 달 전체를 월요일부터 일요일까지 주 단위로 채운 날짜 목록 (앞뒤 달 날짜 포함)
const buildDays = (month: string) => {
  const first = new Date(`${month}T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7;
  const start = addDays(month, -lead);
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  const total = Math.ceil((lead + last.getUTCDate()) / 7) * 7;

  return Array.from({ length: total }, (_, index) => addDays(start, index));
};

// 프로젝트의 달력: 날짜마다 그날 일한 사람과 시간을 표시하고 눌러서 그날의 투입 인원·시간 입력
export const ProjectWorkCalendar = ({
  projectId,
  month,
  today,
  plannedStart,
  plannedEnd,
  logs,
  nameOf,
}: Props) => {
  const byDate = new Map(logs.map((item) => [item.workDate, item]));

  return (
    <div className="flex flex-col">
      <div aria-hidden className="grid grid-cols-7 gap-1.5 pb-2">
        {WEEKDAYS.map((label, index) => (
          <div
            key={label}
            className={cn('text-center text-xs font-bold', weekendTone(index) || 'text-sub')}
          >
            {label}
          </div>
        ))}
      </div>
      <ul aria-label={`${month.slice(0, 7)} 작업 달력`} className="grid grid-cols-7 gap-1.5">
        {buildDays(month).map((date, position) => {
          const inMonth = date.slice(0, 7) === month.slice(0, 7);
          const writable = date >= plannedStart && date <= plannedEnd && date <= today;
          const log = byDate.get(date);
          const workers = log?.workers ?? [];
          const minutes = workers.reduce((sum, item) => sum + item.minutes, 0);
          const day = Number(date.slice(8));
          const label = `${Number(date.slice(5, 7))}월 ${day}일${
            workers.length > 0
              ? `, ${workers.length}명 ${roundTo(minutes / 60, 1)}시간`
              : writable
                ? ', 기록 없음'
                : ''
          }`;
          const content = (
            <>
              <span className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full text-xs font-semibold',
                    weekendTone(position % 7),
                    date === today && 'bg-accent text-[#14110d]',
                  )}
                >
                  {day}
                </span>
                {log?.status === 'DRAFT' && <Badge tone="warning">임시</Badge>}
              </span>
              {workers.length > 0 && (
                <span className="flex flex-col gap-0.5 text-xs">
                  <span className="font-bold">
                    {workers.length}명 · {roundTo(minutes / 60, 1)}h
                  </span>
                  <span className="hidden truncate text-sub md:block">
                    {workers
                      .slice(0, 2)
                      .map((item) => nameOf(item.employeeId))
                      .join(', ')}
                    {workers.length > 2 && ` 외 ${workers.length - 2}`}
                  </span>
                </span>
              )}
            </>
          );
          const base = cn(
            'flex min-h-16 flex-col gap-1 rounded-xl p-1.5 text-left md:min-h-24 md:p-2',
            inMonth ? 'bg-surface-nested' : 'bg-transparent',
            log && 'bg-accent-subtle',
          );

          return (
            <li key={date}>
              {writable ? (
                <Link
                  aria-label={label}
                  to={projectWorkPath(projectId, date)}
                  className={cn(base, 'hover:bg-line')}
                >
                  {content}
                </Link>
              ) : (
                <div className={cn(base, 'cursor-default text-sub')}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
