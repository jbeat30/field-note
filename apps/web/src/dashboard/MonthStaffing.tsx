import {
  buildStaffingMonthCalendar,
  monthOf,
  monthRange,
  type Dashboard,
} from '@field-note/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { LoadingBlock } from '../components/ui/loading-block';
import { useStaffingCalendar } from '../staffing/useStaffingCalendar';

import { HomeMonthCalendar } from './HomeMonthCalendar';

// 고를 수 있는 연도 범위 (올해 기준 앞뒤)
const YEARS_BEFORE = 3;
const YEARS_AFTER = 1;

const arrowClass =
  'inline-flex size-11 items-center justify-center rounded-full bg-field hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground';
const selectClass =
  'h-11 cursor-pointer rounded-full border-0 bg-field px-4 font-emphasis text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground';

// YYYY-MM에서 달 수만큼 이동
const shiftMonth = (month: string, delta: number) => {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1 + delta;

  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
};

// 대시보드의 인력 달력: 달 이동과 연도·월 선택, 날짜 칸마다 프로젝트별 투입 인원 칩
export const MonthStaffing = ({ dashboard }: { dashboard: Dashboard }) => {
  const { today } = dashboard;
  const [month, setMonth] = useState(monthOf(today));
  const range = monthRange(month);
  const calendar = useStaffingCalendar(range.from, range.to);
  const weeks = useMemo(
    () => (calendar.data ? buildStaffingMonthCalendar(calendar.data, 0) : []),
    [calendar.data],
  );
  const year = Number(month.slice(0, 4));
  const thisYear = Number(today.slice(0, 4));
  const years = Array.from(
    { length: YEARS_BEFORE + YEARS_AFTER + 1 },
    (_, index) => thisYear - YEARS_BEFORE + index,
  );

  return (
    <section
      aria-labelledby="month-heading"
      className="flex flex-col gap-5 rounded-[32px] bg-surface-subtle p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="month-heading" className="text-[24px] font-extrabold tracking-[-0.025em]">
          {month === monthOf(today) ? '이번 달 인력 달력' : '인력 달력'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="이전 달"
            className={arrowClass}
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft aria-hidden className="size-[18px]" />
          </button>
          <select
            aria-label="연도"
            className={selectClass}
            value={year}
            onChange={(event) => setMonth(`${event.target.value}-${month.slice(5)}`)}
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {value}년
              </option>
            ))}
          </select>
          <select
            aria-label="월"
            className={selectClass}
            value={Number(month.slice(5))}
            onChange={(event) =>
              setMonth(`${year}-${String(Number(event.target.value)).padStart(2, '0')}`)
            }
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value}월
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="다음 달"
            className={arrowClass}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight aria-hidden className="size-[18px]" />
          </button>
        </div>
      </div>
      {calendar.isError && <Alert role="alert">인력 달력을 불러오지 못했습니다</Alert>}
      {calendar.isPending && <LoadingBlock label="불러오는 중" />}
      {calendar.data && <HomeMonthCalendar weeks={weeks} today={today} />}
      <Link
        to={`/staffing?view=month&from=${range.from}`}
        className="inline-flex min-h-touch items-center self-start text-sm font-semibold hover:text-sub"
      >
        인력 배치 보기
      </Link>
    </section>
  );
};
