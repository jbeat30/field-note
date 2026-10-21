import { roundTo, type StaffingMonthDay } from '@field-note/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { cn } from '../lib/cn';
import { formatLongDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';

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
      <div
        role="group"
        aria-label="이번 달 인력 달력"
        className="overflow-hidden rounded-xl border border-line bg-surface"
      >
        <div className="grid grid-cols-7 border-b border-line bg-surface-nested text-center text-xs font-semibold">
          {WEEKDAY_LABELS.map((label, index) => (
            <div
              key={label}
              className={cn('py-1.5', index === 5 && 'text-primary', index === 6 && 'text-danger')}
            >
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div
            key={week[0]!.date}
            className="grid grid-cols-7 border-b border-line last:border-b-0"
          >
            {week.map((day, index) => {
              const isToday = day.date === today;
              const isSelected = day.date === selectedDay?.date;
              const hidden = day.projects.length - VISIBLE_PROJECTS;
              const label = `${formatLongDay(day.date)} 일한 사람 ${day.headcount}명${
                day.conflictCount > 0 ? `, 같은 날 겹침 ${day.conflictCount}명` : ''
              }`;

              if (!day.inMonth) {
                return (
                  <div
                    key={day.date}
                    aria-hidden="true"
                    className="min-h-14 border-r border-line bg-surface-subtle/60 last:border-r-0 sm:min-h-24"
                  />
                );
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
                    'flex min-h-14 min-w-0 flex-col gap-1 border-r border-line p-1 text-left last:border-r-0 sm:min-h-24 sm:p-1.5',
                    isSelected ? 'bg-primary-subtle' : 'hover:bg-surface-nested',
                    day.conflictCount > 0 && 'ring-2 ring-inset ring-danger',
                  )}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'inline-flex min-w-6 justify-center rounded-full px-1 text-sm font-semibold',
                        isToday && 'bg-primary text-primary-foreground',
                        !isToday && index === 5 && 'text-primary',
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
                        className="truncate rounded border-l-4 px-1 text-[11px] leading-tight"
                        style={{
                          borderLeftColor: colorOf(project.projectId),
                          backgroundColor: `color-mix(in srgb, ${colorOf(project.projectId)} 16%, var(--surface))`,
                        }}
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
          className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4"
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
                  className="flex flex-col gap-1 rounded-lg border-l-4 bg-surface-subtle px-3 py-2"
                  style={{ borderLeftColor: colorOf(project.projectId) }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{project.name}</span>
                    <Link
                      to={projectWorkPath(project.projectId, selectedDay.date)}
                      className="inline-flex min-h-touch items-center text-sm text-primary underline"
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
