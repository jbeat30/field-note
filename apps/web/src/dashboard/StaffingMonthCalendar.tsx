import { roundTo, type StaffingMonthDay } from '@field-note/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { cn } from '../lib/cn';
import { formatLongDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';
import { projectChipClass } from '../lib/projectTone';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// 칸 안에 이름을 보여 줄 프로젝트 수 (넘치면 "+N")
const VISIBLE_PROJECTS = 2;

const hoursText = (minutes: number) => `${roundTo(minutes / 60, 1)}시간`;

export type StaffingMonthCalendarProps = {
  weeks: readonly (readonly StaffingMonthDay[])[];
  today: string;
  // 프로젝트별 구분 색 번호 (인력 배치 타임라인과 같은 색)
  projectColors: ReadonlyMap<string, number>;
};

// 달력 형태의 월간 인력: 날짜 칸마다 일한 사람 수와 프로젝트, 칸을 누르면 아래에 그날 일한 사람이 프로젝트별로 나옴
export const StaffingMonthCalendar = ({
  weeks,
  today,
  projectColors,
}: StaffingMonthCalendarProps) => {
  const days = weeks.flat();
  const [selected, setSelected] = useState(
    () => days.find((day) => day.date === today && day.inMonth)?.date ?? null,
  );
  const selectedDay = days.find((day) => day.date === selected && day.inMonth) ?? null;
  const colorOf = (projectId: string) => `var(--proj-${projectColors.get(projectId) ?? 0})`;

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="이번 달 인력 달력" className="flex flex-col gap-1.5">
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-foreground/70">
          {WEEKDAY_LABELS.map((label, index) => (
            <div key={label} className={cn('py-1.5', index === 6 && 'text-danger')}>
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0]!.date} className="grid grid-cols-7 gap-1.5">
            {week.map((day, index) => {
              const isToday = day.date === today;
              const isSelected = day.date === selectedDay?.date;
              const hidden = day.projects.length - VISIBLE_PROJECTS;
              const label = `${formatLongDay(day.date)} 일한 사람 ${day.headcount}명${
                day.conflictCount > 0 ? `, 같은 날 겹침 ${day.conflictCount}명` : ''
              }`;

              if (!day.inMonth) {
                return <div key={day.date} aria-hidden="true" className="min-h-14 sm:min-h-24" />;
              }

              return (
                <button
                  key={day.date}
                  type="button"
                  aria-label={label}
                  aria-pressed={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => setSelected(isSelected ? null : day.date)}
                  className={cn(
                    'flex min-h-14 min-w-0 flex-col gap-1 rounded-2xl p-1 text-left transition-colors sm:min-h-24 sm:p-2',
                    isSelected
                      ? 'bg-accent-subtle ring-2 ring-foreground ring-inset'
                      : 'bg-surface-nested hover:bg-field',
                    day.conflictCount > 0 && !isSelected && 'ring-2 ring-danger ring-inset',
                  )}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'inline-flex min-w-6 justify-center rounded-full px-1 text-sm font-semibold',
                        isToday && 'bg-accent text-[#14110d]',
                        !isToday && index === 6 && 'text-danger',
                      )}
                    >
                      {Number(day.date.slice(8))}
                    </span>
                    {day.headcount > 0 && (
                      <span className="text-[11px] font-semibold text-foreground/75">
                        {day.headcount}명
                      </span>
                    )}
                  </span>
                  <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                    {day.projects.slice(0, VISIBLE_PROJECTS).map((project) => (
                      <span
                        key={project.projectId}
                        className={cn(
                          'truncate rounded-full px-2 text-[11px] leading-5 font-bold',
                          projectChipClass(projectColors.get(project.projectId) ?? 0),
                        )}
                      >
                        {project.name}
                      </span>
                    ))}
                    {hidden > 0 && (
                      <span className="text-[11px] text-foreground/70">+{hidden}</span>
                    )}
                  </span>
                  <span className="flex gap-0.5 sm:hidden" aria-hidden="true">
                    {day.projects.slice(0, 4).map((project) => (
                      <span
                        key={project.projectId}
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: colorOf(project.projectId) }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selectedDay && (
        <section
          aria-label={`${formatLongDay(selectedDay.date)} 일한 사람`}
          className="flex flex-col gap-2 rounded-2xl bg-surface-nested p-4"
        >
          <h3 className="text-base font-bold">
            {formatLongDay(selectedDay.date)}
            <span className="ml-2 text-sm font-normal text-foreground/75">
              일한 사람 {selectedDay.headcount}명
            </span>
          </h3>
          {selectedDay.projects.length === 0 ? (
            <p className="text-sm text-foreground/75">이 날 저장된 작업 내역이 없습니다</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedDay.projects.map((project) => (
                <li
                  key={project.projectId}
                  className="flex flex-col gap-1 rounded-xl border-l-4 bg-surface-subtle px-3 py-2"
                  style={{ borderLeftColor: colorOf(project.projectId) }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{project.name}</span>
                    <Link
                      to={projectWorkPath(project.projectId, selectedDay.date)}
                      className="inline-flex min-h-touch items-center text-sm font-bold underline decoration-accent decoration-2 underline-offset-4"
                    >
                      그날 하루 기록 보기
                    </Link>
                  </div>
                  <p className="text-sm">
                    {project.people
                      .map((person) => `${person.name} ${hoursText(person.minutes)}`)
                      .join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
