import { z } from 'zod';

import { employeeStatusSchema, type EmployeeStatus } from './employees';
import { projectStatusSchema } from './projects';

// 인력 배치 캘린더 (서비스 기획서 §9.7). 직원 × 날짜 표에 어느 프로젝트에 투입되는지 보여 주고,
// 같은 날 두 프로젝트에 겹치면 경고하며 휴직·퇴사 표시와 비는 사람을 알려 준다
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
    message: '종료일은 시작일보다 빠를 수 없습니다',
    path: ['to'],
  })
  .refine((value) => countDays(value.from, value.to) <= STAFFING_MAX_DAYS, {
    message: `한 번에 ${STAFFING_MAX_DAYS}일까지 볼 수 있습니다`,
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

// 취소한 투입과 취소된 프로젝트의 투입은 담지 않는다. 퇴사 직원은 기간 안에 투입이 있을 때만 담는다
export const staffingCalendarSchema = z.object({
  from: dateSchema,
  to: dateSchema,
  employees: z.array(staffingEmployeeSchema),
  assignments: z.array(staffingAssignmentSchema),
});

export type StaffingCalendar = z.infer<typeof staffingCalendarSchema>;

export type StaffingEmployee = z.infer<typeof staffingEmployeeSchema>;

export type StaffingAssignment = z.infer<typeof staffingAssignmentSchema>;

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

  // 퇴사일을 모르면 기간 전체를 근무 불가로 본다
  if (employee.status === 'LEFT' && (!employee.leftOn || date > employee.leftOn)) {
    return 'LEFT' as const;
  }

  return null;
};

/**
 * @description 캘린더 응답을 직원 × 날짜 표로 만든다. 같은 프로젝트의 투입이 겹쳐도 한 곳으로 센다
 * 휴직 직원은 기간 전체, 퇴사 직원은 퇴사일 다음 날부터 근무 불가로 표시하되 투입이 있으면 투입을 보여 준다
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
 * @description 기간 동안 비는 사람: 일요일을 뺀 모든 날이 투입도 휴직·퇴사도 아닌 직원 ("이번 주 비는 사람", §9.7)
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
 * @description 겹침이 있는 날을 직원별로 모은다
 * @param rows 직원 × 날짜 표
 * @returns 겹치는 날이 있는 직원과 그 날짜
 */
export const findStaffingConflicts = (rows: StaffingRow[]) =>
  rows.flatMap((row) => {
    const dates = row.cells.filter((cell) => cell.state === 'CONFLICT').map((cell) => cell.date);

    return dates.length > 0 ? [{ employee: row.employee, dates }] : [];
  });

/**
 * @description 날짜를 일 단위로 옮긴다 (주 이동에 사용)
 * @param date 기준일
 * @param days 옮길 일수 (음수면 과거)
 * @returns 옮긴 날짜
 */
export const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
