import { roundTo, type EmployeeProjectDays } from '@field-note/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { StatGroup } from '../components/ui/stat-group';
import { cn } from '../lib/cn';
import { addDays, formatDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';

import { useEmployeeProjectDays } from './useWorkSummary';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const hours = (minutes: number) => roundTo(minutes / 60, 1);

// 달 이동 (YYYY-MM-01 기준)
const shiftMonth = (month: string, delta: number) => {
  const date = new Date(`${month}T00:00:00Z`);

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1))
    .toISOString()
    .slice(0, 10);
};

// 달 전체를 일요일부터 토요일까지 주 단위로 채운 날짜 목록 (앞뒤 달은 null)
const buildMonth = (month: string) => {
  const first = new Date(`${month}T00:00:00Z`);
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  const total = Math.ceil((first.getUTCDay() + last.getUTCDate()) / 7) * 7;

  return Array.from({ length: total }, (_, index) => {
    const offset = index - first.getUTCDay();

    return offset >= 0 && offset < last.getUTCDate() ? addDays(month, offset) : null;
  });
};

const monthLabel = (month: string) => `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`;

type Props = {
  projectId: string;
  employeeId: string;
  employeeName: string;
  // 인원 탭에서 고른 기간 (없으면 전체)
  range: { from?: string; to?: string };
  rangeLabel: string;
  categoryNames: ReadonlyMap<string, string>;
  onClose: () => void;
};

type Day = EmployeeProjectDays['days'][number];

// 한 사람이 이 프로젝트에서 일한 날: 달력(일한 날에 시간)과 날짜 목록(시간·한 일), 날짜를 누르면 그날 하루 기록으로
export const EmployeeWorkDaysDialog = ({
  projectId,
  employeeId,
  employeeName,
  range,
  rangeLabel,
  categoryNames,
  onClose,
}: Props) => {
  const query = useEmployeeProjectDays(projectId, employeeId, range);
  const days = query.data?.days ?? [];
  const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0);

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={`${employeeName} · 일한 날`}
      description={`${rangeLabel} 동안 이 프로젝트의 작업 기록에 들어간 날입니다. 날짜를 누르면 그날 하루 기록으로 갑니다`}
    >
      {query.isError ? (
        <Alert>일한 날을 불러오지 못했습니다</Alert>
      ) : !query.data ? (
        <p className="text-sm">불러오는 중</p>
      ) : days.length === 0 ? (
        <p className="text-sm text-sub">이 기간에 일한 날이 없습니다</p>
      ) : (
        <>
          <StatGroup
            className="shrink-0"
            items={[
              { label: '일한 날', value: days.length, unit: '일' },
              { label: '총 시간', value: hours(totalMinutes), unit: '시간' },
              { label: '하루 평균', value: hours(totalMinutes / days.length), unit: '시간' },
            ]}
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <WorkDaysCalendar projectId={projectId} days={days} onNavigate={onClose} />
            <section aria-label="일한 날 목록" className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-semibold">날짜 목록</p>
              <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-lg border border-line text-sm">
                {days.map((day) => (
                  <li key={day.workDate}>
                    <Link
                      to={projectWorkPath(projectId, day.workDate)}
                      onClick={onClose}
                      className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-muted"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-medium">{formatDay(day.workDate)}</span>
                        <span className="truncate text-xs text-sub">
                          {day.categories
                            .map((item) => categoryNames.get(item.categoryId) ?? '작업')
                            .join(' · ')}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {hours(day.minutes)}시간
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </Modal>
  );
};

// 월 달력: 일한 날만 색칠하고 시간 표시, 일한 날이 있는 달 사이만 이동 가능
const WorkDaysCalendar = ({
  projectId,
  days,
  onNavigate,
}: {
  projectId: string;
  days: readonly Day[];
  onNavigate: () => void;
}) => {
  const latest = `${days[0]!.workDate.slice(0, 7)}-01`;
  const earliest = `${days.at(-1)!.workDate.slice(0, 7)}-01`;
  const [month, setMonth] = useState(latest);
  const byDate = new Map(days.map((day) => [day.workDate, day]));
  const monthDays = days.filter((day) => day.workDate.startsWith(month.slice(0, 7)));

  return (
    <section aria-label="일한 날 달력" className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="이전 달"
          disabled={month <= earliest}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>
        <p className="text-sm font-semibold">
          {monthLabel(month)}
          <span className="ml-1.5 font-normal text-sub">{monthDays.length}일</span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="다음 달"
          disabled={month >= latest}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
      <div aria-hidden className="grid grid-cols-7 text-center text-xs font-semibold">
        {WEEKDAYS.map((label, index) => (
          <span
            key={label}
            className={cn(
              'py-1',
              index === 0 ? 'text-danger' : index === 6 ? 'text-primary' : 'text-sub',
            )}
          >
            {label}
          </span>
        ))}
      </div>
      <ul aria-label={`${monthLabel(month)} 일한 날`} className="grid grid-cols-7 gap-1">
        {buildMonth(month).map((date, index) => {
          if (!date) return <li key={`blank-${index}`} aria-hidden />;

          const day = byDate.get(date);
          const number = Number(date.slice(8));

          return (
            <li key={date}>
              {day ? (
                <Link
                  to={projectWorkPath(projectId, date)}
                  onClick={onNavigate}
                  aria-label={`${formatDay(date)} ${hours(day.minutes)}시간`}
                  className="flex aspect-square flex-col items-center justify-center rounded-md bg-primary-subtle text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <span className="text-xs font-semibold">{number}</span>
                  <span className="text-[11px] leading-none tabular-nums">
                    {hours(day.minutes)}h
                  </span>
                </Link>
              ) : (
                <span className="flex aspect-square items-center justify-center text-xs text-sub">
                  {number}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
