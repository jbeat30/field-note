import type { StaffingMonthDay } from '@field-note/shared';
import { useMemo } from 'react';

import { cn } from '../lib/cn';
import { projectChipClass } from '../lib/projectTone';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 시안의 칩 색 순서: 주황, 라임, 청록 회색, 외곽선, 잉크, 진주황
const CHIP_ORDER = [0, 2, 4, 3, 1, 5];

// 칸 안에 칩으로 보여 줄 프로젝트 수 (넘치면 "+N")
const VISIBLE_PROJECTS = 3;

export type HomeMonthCalendarProps = {
  // 일요일 시작 주 단위 날짜 칸
  weeks: readonly (readonly StaffingMonthDay[])[];
  today: string;
};

// 대시보드 달력: 날짜 칸마다 프로젝트 이름과 투입 인원 칩, 오늘은 잉크 칸, 같은 날 겹침은 붉은 테두리
export const HomeMonthCalendar = ({ weeks, today }: HomeMonthCalendarProps) => {
  const projects = useMemo(() => {
    const found = new Map<string, string>();

    for (const day of weeks.flat()) {
      for (const project of day.projects) found.set(project.projectId, project.name);
    }

    return [...found.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [weeks]);
  const colorOf = (projectId: string) => {
    const index = projects.findIndex(([id]) => id === projectId);

    return CHIP_ORDER[(index < 0 ? 0 : index) % CHIP_ORDER.length] ?? 0;
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="인력 달력" className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="pb-1 text-center text-[13px] font-bold text-sub">
            {label}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const isToday = day.date === today;
          const hidden = day.projects.length - VISIBLE_PROJECTS;

          if (!day.inMonth) {
            return (
              <div
                key={day.date}
                aria-hidden="true"
                className="flex min-h-14 flex-col p-2 text-[13px] font-bold text-sub sm:min-h-[92px] sm:px-2.5"
              >
                <span className="font-emphasis">{Number(day.date.slice(8))}</span>
              </div>
            );
          }

          return (
            <div
              key={day.date}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${Number(day.date.slice(5, 7))}월 ${Number(day.date.slice(8))}일 투입 ${day.headcount}명${
                day.conflictCount > 0 ? `, 같은 날 겹침 ${day.conflictCount}명` : ''
              }`}
              className={cn(
                'flex min-h-14 min-w-0 flex-col gap-1 overflow-hidden rounded-[18px] p-2 text-[13px] font-bold sm:min-h-[92px] sm:px-2.5',
                isToday ? 'bg-[#14110d] text-[#fcf9f2]' : 'bg-surface-nested',
                day.conflictCount > 0 && 'outline-2 -outline-offset-2 outline-danger',
              )}
            >
              <span className="font-emphasis">{Number(day.date.slice(8))}</span>
              <span className="hidden min-w-0 flex-col gap-1 sm:flex">
                {day.projects.slice(0, VISIBLE_PROJECTS).map((project) => (
                  <span
                    key={project.projectId}
                    className={cn(
                      'truncate rounded-lg px-2 py-0.5 text-[11.5px] font-bold',
                      projectChipClass(colorOf(project.projectId)),
                    )}
                  >
                    {project.name} {project.people.length}
                  </span>
                ))}
                {hidden > 0 && <span className="text-[11px] font-bold">+{hidden}</span>}
              </span>
              <span className="mt-auto flex justify-center gap-1 sm:hidden" aria-hidden="true">
                {day.projects.slice(0, 4).map((project) => (
                  <span
                    key={project.projectId}
                    className="size-[7px] rounded-full"
                    style={{ backgroundColor: `var(--proj-${colorOf(project.projectId)})` }}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-bold text-sub">
        {projects.map(([id, name]) => (
          <li key={id} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-3.5 rounded-[5px] border border-foreground/30"
              style={{ backgroundColor: `var(--proj-${colorOf(id)})` }}
            />
            {name}
          </li>
        ))}
        <li className="ml-auto">칩 숫자는 투입 인원</li>
      </ul>
    </div>
  );
};
