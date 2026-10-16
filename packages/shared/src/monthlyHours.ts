import { z } from 'zod';

import { workUnitModeSchema } from './account';
import { minutesToManDays, roundTo, toManMonths } from './workUnits';

import { VALIDATION_MESSAGES } from './errorMessages';
// 월 공수 확정과 월 공수표: 공수 기록이 급여·정산의 근거로 쓰이므로 월 단위로 확정(잠금)
// 확정은 선택 기능이며 확정하면 그달의 작업 내역 수정 불가, 재오픈(사유 기록)으로만 정정
// 확정 시점의 하루 기준시간과 월 기준일수를 그 시점 값으로 고정
export const MONTH_REASON_MAX_LENGTH = 500;

export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, VALIDATION_MESSAGES.MONTH_FORMAT_INVALID);

export const monthlyHoursQuerySchema = z.object({ month: monthSchema });

export type MonthlyHoursQuery = z.infer<typeof monthlyHoursQuerySchema>;

export const monthlyCloseSchema = z.object({
  month: monthSchema,
  // 임시 저장된 작업 내역이 남아 있어도 확정하겠다는 확인 (남아 있으면 필수)
  confirmDrafts: z.boolean().optional(),
});

export type MonthlyClose = z.infer<typeof monthlyCloseSchema>;

export const monthlyReopenSchema = z.object({
  month: monthSchema,
  reason: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.required('재오픈 사유'))
    .max(MONTH_REASON_MAX_LENGTH, VALIDATION_MESSAGES.tooLong('사유', MONTH_REASON_MAX_LENGTH)),
});

export type MonthlyReopen = z.infer<typeof monthlyReopenSchema>;

export const monthlyHoursRowSchema = z.object({
  projectId: z.uuid(),
  projectCode: z.string(),
  projectName: z.string(),
  employeeId: z.uuid(),
  employeeName: z.string(),
  // 그달 저장된 작업 내역의 공수 합(분)
  minutes: z.number().int(),
});

export type MonthlyHoursRow = z.infer<typeof monthlyHoursRowSchema>;

export const monthlyDraftSchema = z.object({
  projectId: z.uuid(),
  projectName: z.string(),
  workDate: z.iso.date(),
});

export type MonthlyDraft = z.infer<typeof monthlyDraftSchema>;

export const monthlyCloseEventSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['CLOSED', 'REOPENED']),
  reason: z.string().nullable(),
  // 그때의 임시 저장 작업 내역 건수 (확정 시 확인한 건수)
  draftLogCount: z.number().int(),
  standardWorkMinutes: z.number().int(),
  monthlyWorkDays: z.number(),
  createdAt: z.iso.datetime(),
});

export type MonthlyCloseEvent = z.infer<typeof monthlyCloseEventSchema>;

export const monthlyHoursSchema = z.object({
  month: monthSchema,
  isClosed: z.boolean(),
  closedAt: z.iso.datetime().nullable(),
  // 확정된 달은 확정 당시의 값, 아니면 현재 회사 설정 값
  standardWorkMinutes: z.number().int(),
  monthlyWorkDays: z.number(),
  workUnitMode: workUnitModeSchema,
  // 그달의 임시 저장 작업 내역 (집계에는 저장된 작업 내역만 반영되므로 확정 전에 정리), 최대 50건까지 표시하고 전체 건수는 별도 제공
  draftLogCount: z.number().int(),
  drafts: z.array(monthlyDraftSchema),
  // 프로젝트 코드·직원 이름순
  rows: z.array(monthlyHoursRowSchema),
  // 최근 이력이 맨 앞
  events: z.array(monthlyCloseEventSchema),
});

export type MonthlyHours = z.infer<typeof monthlyHoursSchema>;

export const MONTHLY_DRAFT_LIMIT = 50;

/**
 * @description 월(YYYY-MM)의 첫날과 마지막 날
 * @param month YYYY-MM
 * @returns 시작일·종료일(YYYY-MM-DD)
 */
export const monthRange = (month: string) => {
  const [year, mon] = month.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(year, mon, 0)).getUTCDate();

  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
};

/**
 * @description 날짜가 속한 월 (YYYY-MM)
 * @param date YYYY-MM-DD
 * @returns YYYY-MM
 */
export const monthOf = (date: string) => date.slice(0, 7);

/**
 * @description 월 공수 확정 검사: 이번 달까지만 가능, 이미 확정한 달은 재확정 불가, 임시 저장 작업 내역이 남아 있으면 확인 필요
 * @param input 월, 오늘(서울 기준), 확정 여부, 임시 저장 작업 내역 건수, 확인 여부
 * @returns 통과 여부와 어느 입력이 왜 안 되는지
 */
export const validateMonthClose = (input: {
  month: string;
  today: string;
  isClosed: boolean;
  draftLogCount: number;
  confirmDrafts: boolean;
}): { ok: true } | { ok: false; path: 'month' | 'confirmDrafts'; message: string } => {
  if (input.month > monthOf(input.today)) {
    return { ok: false, path: 'month', message: VALIDATION_MESSAGES.MONTH_NOT_ARRIVED };
  }

  if (input.isClosed) {
    return { ok: false, path: 'month', message: VALIDATION_MESSAGES.MONTH_ALREADY_CONFIRMED };
  }

  if (input.draftLogCount > 0 && !input.confirmDrafts) {
    return {
      ok: false,
      path: 'confirmDrafts',
      message: VALIDATION_MESSAGES.MONTH_DRAFT_LOGS_REMAIN(input.draftLogCount),
    };
  }

  return { ok: true };
};

/**
 * @description 이 날짜의 작업 내역를 고칠 수 있는지: 확정된 달은 재오픈해야 함
 * @param workDate 작업 일자
 * @param closedMonths 확정된 달 목록
 * @returns 통과 여부와 거부 사유
 */
export const monthLockCheck = (
  workDate: string,
  closedMonths: readonly string[],
): { ok: true } | { ok: false; path: 'workDate'; message: string } =>
  closedMonths.includes(monthOf(workDate))
    ? {
        ok: false,
        path: 'workDate',
        message: VALIDATION_MESSAGES.MONTH_CONFIRMED_LOCK(monthOf(workDate)),
      }
    : { ok: true };

type Settings = { standardWorkMinutes: number; monthlyWorkDays: number };

/**
 * @description 분을 월 공수표 값(MD·MM)으로 환산: MD는 소수 둘째 자리, MM은 소수 셋째 자리까지
 * @param minutes 공수(분)
 * @param settings 하루 기준시간과 월 기준일수 (확정된 달은 확정 당시 값)
 * @returns MD와 MM
 */
export const monthlyWorkValue = (minutes: number, settings: Settings) => {
  const manDays = minutesToManDays(minutes, settings.standardWorkMinutes);

  return {
    manDays: roundTo(manDays, 2),
    manMonths: roundTo(toManMonths(manDays, settings.monthlyWorkDays), 3),
  };
};

export type MonthlyTotal = { id: string; name: string; minutes: number };

/**
 * @description 월 공수표 행을 직원별·프로젝트별로 합산 (분을 먼저 더한 뒤 환산해 오차가 쌓이지 않게 함)
 * @param rows 월 공수표 행
 * @returns 직원별 합계, 프로젝트별 합계, 전체 합계(분)
 */
export const summarizeMonthlyHours = (rows: readonly MonthlyHoursRow[]) => {
  const byEmployee = new Map<string, MonthlyTotal>();
  const byProject = new Map<string, MonthlyTotal>();
  let total = 0;

  for (const row of rows) {
    const employee = byEmployee.get(row.employeeId);
    const project = byProject.get(row.projectId);

    byEmployee.set(row.employeeId, {
      id: row.employeeId,
      name: row.employeeName,
      minutes: (employee?.minutes ?? 0) + row.minutes,
    });
    byProject.set(row.projectId, {
      id: row.projectId,
      name: `${row.projectCode} ${row.projectName}`,
      minutes: (project?.minutes ?? 0) + row.minutes,
    });
    total += row.minutes;
  }

  const sorted = (map: Map<string, MonthlyTotal>) =>
    [...map.values()].sort(
      (a, b) => a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id),
    );

  return { byEmployee: sorted(byEmployee), byProject: sorted(byProject), total };
};

export type MonthlyMatrixAxis = 'EMPLOYEE' | 'PROJECT';

export type MonthlyMatrix = {
  // 열 (직원별이면 프로젝트, 프로젝트별이면 직원), 합계가 큰 것이 먼저
  columns: { id: string; label: string }[];
  // 행 (직원별이면 직원, 프로젝트별이면 프로젝트), 합계가 큰 것이 먼저
  rows: {
    id: string;
    label: string;
    // 열 id → 분 (그 칸에 공수가 없으면 키 없음)
    cells: Record<string, number>;
    total: number;
  }[];
  columnTotals: Record<string, number>;
  total: number;
};

/**
 * @description 월 공수표 행을 "행 × 열" 표로 바꿈 (직원별: 행 직원·열 프로젝트, 프로젝트별: 행 프로젝트·열 직원)
 * 합계는 분을 먼저 더하므로 표시 시 환산해도 오차가 누적되지 않음
 * @param rows 월 공수표 행
 * @param axis 행으로 삼을 것
 * @returns 표 (행·열은 합계가 큰 순, 같으면 이름순)
 */
export const pivotMonthlyHours = (
  rows: readonly MonthlyHoursRow[],
  axis: MonthlyMatrixAxis,
): MonthlyMatrix => {
  const rowOf = (item: MonthlyHoursRow) =>
    axis === 'EMPLOYEE'
      ? { id: item.employeeId, label: item.employeeName }
      : { id: item.projectId, label: `${item.projectCode} ${item.projectName}` };
  const columnOf = (item: MonthlyHoursRow) =>
    axis === 'EMPLOYEE'
      ? { id: item.projectId, label: `${item.projectCode} ${item.projectName}` }
      : { id: item.employeeId, label: item.employeeName };
  const rowMap = new Map<string, MonthlyMatrix['rows'][number]>();
  const columnMap = new Map<string, { id: string; label: string; total: number }>();
  let total = 0;

  for (const item of rows) {
    const row = rowOf(item);
    const column = columnOf(item);
    const current = rowMap.get(row.id) ?? { ...row, cells: {}, total: 0 };
    const col = columnMap.get(column.id) ?? { ...column, total: 0 };

    current.cells[column.id] = (current.cells[column.id] ?? 0) + item.minutes;
    current.total += item.minutes;
    col.total += item.minutes;
    total += item.minutes;
    rowMap.set(row.id, current);
    columnMap.set(column.id, col);
  }

  const bySize = <T extends { label: string; total: number }>(a: T, b: T) =>
    b.total - a.total || a.label.localeCompare(b.label, 'ko');

  return {
    columns: [...columnMap.values()].sort(bySize).map(({ id, label }) => ({ id, label })),
    rows: [...rowMap.values()].sort(bySize),
    columnTotals: Object.fromEntries([...columnMap.values()].map((item) => [item.id, item.total])),
    total,
  };
};
