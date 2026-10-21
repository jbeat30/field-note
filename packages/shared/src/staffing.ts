import { z } from 'zod';

import { employeeStatusSchema, type EmployeeStatus } from './employees';
import { projectStatusSchema } from './projects';

import { VALIDATION_MESSAGES } from './errorMessages';
// 인력 배치 캘린더, 직원 × 날짜 표에 어느 프로젝트에 투입되는지 보여 주고
// 같은 날 두 프로젝트에 겹치면 경고, 휴직·퇴사 표시와 비는 사람 안내
export const STAFFING_MAX_DAYS = 42;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

const DAY_MS = 86_400_000;

/**
 * @description 두 날짜(포함) 사이의 일수
 * @param from 시작일
 * @param to 종료일
 * @returns 일수 (같은 날이면 1)
 */
export const countDays = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;

/**
 * @description 시작일부터 종료일까지 모든 날짜
 * @param from 시작일
 * @param to 종료일
 * @returns 날짜 목록 (시작일 > 종료일이면 빈 목록)
 */
export const listDates = (from: string, to: string) => {
  const dates: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);

  for (let time = Date.parse(`${from}T00:00:00Z`); time <= end; time += DAY_MS) {
    dates.push(new Date(time).toISOString().slice(0, 10));
  }

  return dates;
};

export const staffingCalendarQuerySchema = z
  .object({ from: dateSchema, to: dateSchema })
  .refine((value) => value.from <= value.to, {
    message: VALIDATION_MESSAGES.END_BEFORE_START,
    path: ['to'],
  })
  .refine((value) => countDays(value.from, value.to) <= STAFFING_MAX_DAYS, {
    message: VALIDATION_MESSAGES.STAFFING_RANGE_LIMIT(STAFFING_MAX_DAYS),
    path: ['to'],
  });

export type StaffingCalendarQuery = z.infer<typeof staffingCalendarQuerySchema>;

const staffingEmployeeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  title: z.string().nullable(),
  status: employeeStatusSchema,
  // 퇴사일 (퇴사 직원만, 없을 수 있음)
  leftOn: dateSchema.nullable(),
});

const staffingAssignmentSchema = z.object({
  id: z.uuid(),
  employeeId: z.uuid(),
  projectId: z.uuid(),
  projectCode: z.string(),
  projectName: z.string(),
  projectStatus: projectStatusSchema,
  startDate: dateSchema,
  endDate: dateSchema,
});

// 저장된 작업 내역에 들어간 사람·날짜·프로젝트별 시간 (취소된 프로젝트 제외)
const staffingWorkDaySchema = z.object({
  employeeId: z.uuid(),
  workDate: dateSchema,
  projectId: z.uuid(),
  projectCode: z.string(),
  projectName: z.string(),
  projectStatus: projectStatusSchema,
  minutes: z.number().int(),
});

// 취소한 투입과 취소된 프로젝트의 투입은 제외, 퇴사 직원은 기간 안에 투입이나 일한 기록이 있을 때만 포함
export const staffingCalendarSchema = z.object({
  from: dateSchema,
  to: dateSchema,
  employees: z.array(staffingEmployeeSchema),
  assignments: z.array(staffingAssignmentSchema),
  workDays: z.array(staffingWorkDaySchema),
});

export type StaffingCalendar = z.infer<typeof staffingCalendarSchema>;

export type StaffingEmployee = z.infer<typeof staffingEmployeeSchema>;

export type StaffingAssignment = z.infer<typeof staffingAssignmentSchema>;

export type StaffingWorkDay = z.infer<typeof staffingWorkDaySchema>;

// 그날의 상태: 비어 있음 / 투입 한 곳 / 겹침(두 프로젝트 이상) / 근무 불가(휴직·퇴사)
export type StaffingCellState = 'FREE' | 'ASSIGNED' | 'CONFLICT' | 'UNAVAILABLE';

export type StaffingCell = {
  date: string;
  state: StaffingCellState;
  projects: { id: string; code: string; name: string }[];
  // 근무 불가일 때 이유
  unavailable: Extract<EmployeeStatus, 'ON_LEAVE' | 'LEFT'> | null;
};

export type StaffingRow = { employee: StaffingEmployee; cells: StaffingCell[] };

const unavailableOn = (employee: StaffingEmployee, date: string) => {
  if (employee.status === 'ON_LEAVE') return 'ON_LEAVE' as const;

  // 퇴사일을 모르면 기간 전체를 근무 불가로 간주
  if (employee.status === 'LEFT' && (!employee.leftOn || date > employee.leftOn)) {
    return 'LEFT' as const;
  }

  return null;
};

/**
 * @description 캘린더 응답을 직원 × 날짜 표로 변환, 같은 프로젝트의 투입이 겹쳐도 한 곳으로 집계
 * 휴직 직원은 기간 전체, 퇴사 직원은 퇴사일 다음 날부터 근무 불가로 표시하되 투입이 있으면 투입 표시
 * @param calendar 캘린더 응답
 * @returns 직원별 날짜 칸 (직원 순서는 응답 그대로)
 */
export const buildStaffingGrid = (calendar: StaffingCalendar): StaffingRow[] => {
  const dates = listDates(calendar.from, calendar.to);

  return calendar.employees.map((employee) => {
    const mine = calendar.assignments.filter((item) => item.employeeId === employee.id);

    const cells = dates.map((date): StaffingCell => {
      const projects = new Map<string, { id: string; code: string; name: string }>();

      for (const item of mine) {
        if (item.startDate <= date && date <= item.endDate) {
          projects.set(item.projectId, {
            id: item.projectId,
            code: item.projectCode,
            name: item.projectName,
          });
        }
      }

      const unavailable = unavailableOn(employee, date);
      const list = [...projects.values()];
      const state: StaffingCellState =
        list.length > 1
          ? 'CONFLICT'
          : list.length === 1
            ? 'ASSIGNED'
            : unavailable
              ? 'UNAVAILABLE'
              : 'FREE';

      return { date, state, projects: list, unavailable };
    });

    return { employee, cells };
  });
};

const isSunday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0;

/**
 * @description 기간 동안 비는 사람: 일요일을 뺀 모든 날이 투입도 휴직·퇴사도 아닌 직원 ("이번 주 비는 사람")
 * @param rows 직원 × 날짜 표
 * @returns 비는 직원 목록 (표 순서)
 */
export const findFreeEmployees = (rows: StaffingRow[]) =>
  rows
    .filter((row) => {
      const days = row.cells.filter((cell) => !isSunday(cell.date));

      return days.length > 0 && days.every((cell) => cell.state === 'FREE');
    })
    .map((row) => row.employee);

/**
 * @description 겹침이 있는 날을 직원별로 수집
 * @param rows 직원 × 날짜 표
 * @returns 겹치는 날이 있는 직원과 그 날짜
 */
export const findStaffingConflicts = (rows: StaffingRow[]) =>
  rows.flatMap((row) => {
    const dates = row.cells.filter((cell) => cell.state === 'CONFLICT').map((cell) => cell.date);

    return dates.length > 0 ? [{ employee: row.employee, dates }] : [];
  });

/**
 * @description 날짜를 일 단위로 옮김 (주 이동에 사용)
 * @param date 기준일
 * @param days 옮길 일수 (음수면 과거)
 * @returns 옮긴 날짜
 */
export const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

// ── 사람 행 × 날짜 열 타임라인 ──
// 투입 계획은 두지 않고, 저장된 작업 내역에 그 사람이 들어간 날만 막대로 보임 (같은 프로젝트에 이어진 날은 막대 하나)

export type StaffingTimelineDay = { date: string; minutes: number; conflict: boolean };

// 한 프로젝트에서 이어서 일한 날 묶음 (startIndex는 표 날짜 열의 0부터 센 위치)
export type StaffingTimelineSegment = { startIndex: number; days: StaffingTimelineDay[] };

export type StaffingTimelineLane = {
  projectId: string;
  code: string;
  name: string;
  status: z.infer<typeof projectStatusSchema>;
  segments: StaffingTimelineSegment[];
};

// WORKING: 기간 안에 일한 기록이 있음 / IDLE: 일한 기록이 없는 재직 직원 / AWAY: 일한 기록이 없는 휴직·퇴사 직원
export type StaffingTimelineGroup = 'WORKING' | 'IDLE' | 'AWAY';

export type StaffingTimelineRow = {
  employee: StaffingEmployee;
  group: StaffingTimelineGroup;
  // 프로젝트마다 한 줄 (먼저 일한 프로젝트가 위)
  lanes: StaffingTimelineLane[];
  totalMinutes: number;
  workedDays: number;
  // 같은 날 두 프로젝트 이상에서 일한 날
  conflictDates: string[];
};

/**
 * @description 캘린더 응답을 사람 행 × 날짜 타임라인으로 만듦, 같은 프로젝트에 이어진 날은 막대 하나(segment)로 묶고,
 * 같은 날 두 프로젝트 이상에서 일했으면 그 날을 겹침으로 표시
 * @param calendar 캘린더 응답 (workDays는 저장된 작업 내역의 사람·날짜·프로젝트별 시간)
 * @returns 직원 행 (직원 순서는 응답 그대로)
 */
export const buildStaffingTimeline = (calendar: StaffingCalendar): StaffingTimelineRow[] => {
  const dates = listDates(calendar.from, calendar.to);

  return calendar.employees.map((employee) => {
    const mine = calendar.workDays.filter(
      (item) => item.employeeId === employee.id && item.minutes > 0,
    );
    const projectsByDate = new Map<string, Set<string>>();

    for (const item of mine) {
      projectsByDate.set(
        item.workDate,
        (projectsByDate.get(item.workDate) ?? new Set()).add(item.projectId),
      );
    }

    const conflictDates = dates.filter((date) => (projectsByDate.get(date)?.size ?? 0) > 1);
    const lanes = [...new Set(mine.map((item) => item.projectId))]
      .map((projectId): StaffingTimelineLane => {
        const own = mine.filter((item) => item.projectId === projectId);
        const first = own[0]!;
        const minutesOf = new Map<string, number>();

        for (const item of own) {
          minutesOf.set(item.workDate, (minutesOf.get(item.workDate) ?? 0) + item.minutes);
        }

        const segments: StaffingTimelineSegment[] = [];

        dates.forEach((date, index) => {
          const minutes = minutesOf.get(date);

          if (!minutes) return;

          const day = { date, minutes, conflict: conflictDates.includes(date) };
          const last = segments.at(-1);

          if (last && last.startIndex + last.days.length === index) last.days.push(day);
          else segments.push({ startIndex: index, days: [day] });
        });

        return {
          projectId,
          code: first.projectCode,
          name: first.projectName,
          status: first.projectStatus,
          segments,
        };
      })
      .sort(
        (a, b) =>
          (a.segments[0]?.startIndex ?? 0) - (b.segments[0]?.startIndex ?? 0) ||
          a.code.localeCompare(b.code),
      );
    const workedDates = new Set(mine.map((item) => item.workDate));

    return {
      employee,
      group: lanes.length > 0 ? 'WORKING' : employee.status === 'ACTIVE' ? 'IDLE' : 'AWAY',
      lanes,
      totalMinutes: mine.reduce((sum, item) => sum + item.minutes, 0),
      workedDays: workedDates.size,
      conflictDates,
    };
  });
};

/**
 * @description 타임라인의 요약: 일한 사람·일한 기록이 없는 사람·휴직/퇴사 수와 겹침 건수 (한 사람의 이어진 겹침 날은 1건)
 * @param rows 타임라인 행
 */
export const summarizeStaffingTimeline = (rows: readonly StaffingTimelineRow[]) => ({
  working: rows.filter((row) => row.group === 'WORKING').length,
  idle: rows.filter((row) => row.group === 'IDLE').length,
  away: rows.filter((row) => row.group === 'AWAY').length,
  conflicts: rows.reduce(
    (sum, row) =>
      sum +
      row.conflictDates.filter(
        (date, index) => index === 0 || shiftDate(row.conflictDates[index - 1]!, 1) !== date,
      ).length,
    0,
  ),
});

// ── 달력(월간) 보기 ──
// 날짜 칸마다 그날 저장된 작업 내역에 들어간 사람과 프로젝트를 모아 보여 줌

export type StaffingMonthPerson = { employeeId: string; name: string; minutes: number };

export type StaffingMonthProject = {
  projectId: string;
  name: string;
  people: StaffingMonthPerson[];
};

export type StaffingMonthDay = {
  date: string;
  // 기간 밖 칸(앞뒤 주를 채우는 빈 칸)이면 false
  inMonth: boolean;
  // 그날 일한 사람 수 (두 프로젝트에 들어간 사람도 한 명)
  headcount: number;
  projects: StaffingMonthProject[];
  // 같은 날 두 프로젝트 이상에 들어간 사람 수
  conflictCount: number;
};

/**
 * @description 인력 캘린더를 월요일 시작 주 단위 달력으로 변환 (0분 기록은 제외, 인력 타임라인과 같은 기준)
 * 기간 앞뒤는 빈 칸으로 채워 한 주가 항상 7칸이 되게 함
 * @param calendar 캘린더 응답 (보통 한 달)
 * @returns 주 단위 날짜 칸 (프로젝트는 이름순, 사람은 이름순)
 */
export const buildStaffingMonthCalendar = (calendar: StaffingCalendar): StaffingMonthDay[][] => {
  const names = new Map(calendar.employees.map((employee) => [employee.id, employee.name]));
  const byDate = new Map<string, StaffingWorkDay[]>();

  for (const item of calendar.workDays) {
    if (item.minutes <= 0) continue;

    byDate.set(item.workDate, [...(byDate.get(item.workDate) ?? []), item]);
  }

  const dayOf = (date: string, inMonth: boolean): StaffingMonthDay => {
    const items = byDate.get(date) ?? [];
    const projects = new Map<string, StaffingMonthProject>();
    const projectCountByPerson = new Map<string, number>();

    for (const item of items) {
      const project = projects.get(item.projectId) ?? {
        projectId: item.projectId,
        name: item.projectName,
        people: [],
      };

      project.people.push({
        employeeId: item.employeeId,
        name: names.get(item.employeeId) ?? '',
        minutes: item.minutes,
      });
      projects.set(item.projectId, project);
      projectCountByPerson.set(
        item.employeeId,
        (projectCountByPerson.get(item.employeeId) ?? 0) + 1,
      );
    }

    return {
      date,
      inMonth,
      headcount: projectCountByPerson.size,
      projects: [...projects.values()]
        .map((project) => ({
          ...project,
          people: project.people.sort((a, b) => a.name.localeCompare(b.name, 'ko')),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
      conflictCount: [...projectCountByPerson.values()].filter((count) => count > 1).length,
    };
  };

  // 월요일 시작: 일요일(0)은 6칸 앞, 그 밖은 요일 - 1칸 앞
  const weekdayIndex = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const start = shiftDate(calendar.from, -weekdayIndex(calendar.from));
  const end = shiftDate(calendar.to, 6 - weekdayIndex(calendar.to));
  const days = listDates(start, end).map((date) =>
    dayOf(date, date >= calendar.from && date <= calendar.to),
  );

  return Array.from({ length: days.length / 7 }, (_, week) => days.slice(week * 7, week * 7 + 7));
};
