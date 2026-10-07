import { z } from 'zod';

// 공수 집계 (서비스 기획서 §9.6). 집계에는 저장된 일지만 반영하고 임시 저장은 건수만 따로 알린다 (§9.4)
// 값은 모두 분 단위이며 MD·MM·소진율은 보여 줄 때 회사 설정으로 환산한다

const dateSchema = z.iso.date();

export const WORK_SUMMARY_UNITS = ['week', 'month'] as const;

export const workSummaryUnitSchema = z.enum(WORK_SUMMARY_UNITS);

export type WorkSummaryUnit = z.infer<typeof workSummaryUnitSchema>;

export const WORK_SUMMARY_UNIT_LABELS: Record<WorkSummaryUnit, string> = {
  week: '주별',
  month: '월별',
};

export const workSummaryQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  // 기간별 추이의 묶음 단위 (기본 주)
  unit: workSummaryUnitSchema.optional(),
});

export type WorkSummaryQuery = z.infer<typeof workSummaryQuerySchema>;

export const workSummarySchema = z.object({
  // 기간 필터를 건 경우 그 기간만, 아니면 전체
  totalMinutes: z.number().int(),
  // 투입별 계획 공수의 합 (취소한 투입 제외, 계획이 없으면 null). 기간 필터와 무관한 전체 값
  plannedMinutes: z.number().int().nullable(),
  // 공수가 있는 날 수 (프로젝트 기준)
  workedDays: z.number().int(),
  savedLogCount: z.number().int(),
  // 집계에서 빠진 임시 저장 일지 수
  draftLogCount: z.number().int(),
  byEmployee: z.array(
    z.object({
      employeeId: z.uuid(),
      workedDays: z.number().int(),
      totalMinutes: z.number().int(),
      plannedMinutes: z.number().int().nullable(),
    }),
  ),
  byCategory: z.array(z.object({ categoryId: z.uuid(), totalMinutes: z.number().int() })),
  // 주별은 월요일, 월별은 1일이 기간의 시작일
  byPeriod: z.array(z.object({ periodStart: dateSchema, totalMinutes: z.number().int() })),
});

export type WorkSummary = z.infer<typeof workSummarySchema>;

export const employeeWorkHistorySchema = z.object({
  thisMonthMinutes: z.number().int(),
  thisYearMinutes: z.number().int(),
  totalMinutes: z.number().int(),
  projects: z.array(
    z.object({
      projectId: z.uuid(),
      projectCode: z.string(),
      projectName: z.string(),
      // 취소하지 않은 투입 기간의 처음과 끝 (투입이 없으면 null)
      assignedFrom: dateSchema.nullable(),
      assignedTo: dateSchema.nullable(),
      workedDays: z.number().int(),
      totalMinutes: z.number().int(),
      lastWorkDate: dateSchema.nullable(),
    }),
  ),
});

export type EmployeeWorkHistory = z.infer<typeof employeeWorkHistorySchema>;

export type SummaryEntry = {
  workDate: string;
  employeeId: string;
  categoryId: string;
  minutes: number;
};

const addUtcDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00.000Z`);

  value.setUTCDate(value.getUTCDate() + days);

  return value.toISOString().slice(0, 10);
};

/**
 * @description 기간 묶음의 시작일: 주별은 그 주 월요일, 월별은 그 달 1일
 * @param workDate 작업일 (YYYY-MM-DD)
 * @param unit 묶음 단위
 */
export const periodStart = (workDate: string, unit: WorkSummaryUnit) => {
  if (unit === 'month') {
    return `${workDate.slice(0, 8)}01`;
  }

  const weekday = new Date(`${workDate}T00:00:00.000Z`).getUTCDay();

  return addUtcDays(workDate, -((weekday + 6) % 7));
};

const sum = (items: readonly { minutes: number }[]) =>
  items.reduce((total, item) => total + item.minutes, 0);

const groupBy = <T>(items: readonly T[], keyOf: (item: T) => string) => {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = keyOf(item);

    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return groups;
};

/**
 * @description 프로젝트의 공수 집계 (직원별·작업 구분별·기간별). 저장된 일지의 항목만 넘겨야 한다
 * @param input 저장된 일지 항목, 임시 저장 건수, 투입 계획
 * @returns 분 단위 집계 (직원은 공수가 큰 순, 기간은 오래된 순)
 */
export const summarizeProjectWork = (input: {
  entries: readonly SummaryEntry[];
  savedLogCount: number;
  draftLogCount: number;
  assignments: readonly { employeeId: string; plannedMinutes: number | null }[];
  unit: WorkSummaryUnit;
}): WorkSummary => {
  const { entries, assignments, unit } = input;
  const planned = new Map<string, number | null>();

  for (const assignment of assignments) {
    if (assignment.plannedMinutes === null) {
      planned.set(assignment.employeeId, planned.get(assignment.employeeId) ?? null);
      continue;
    }

    planned.set(
      assignment.employeeId,
      (planned.get(assignment.employeeId) ?? 0) + assignment.plannedMinutes,
    );
  }

  const employeeIds = new Set([...planned.keys(), ...entries.map((entry) => entry.employeeId)]);
  const byEmployeeGroups = groupBy(entries, (entry) => entry.employeeId);
  const byEmployee = [...employeeIds]
    .map((employeeId) => {
      const own = byEmployeeGroups.get(employeeId) ?? [];

      return {
        employeeId,
        workedDays: new Set(own.map((entry) => entry.workDate)).size,
        totalMinutes: sum(own),
        plannedMinutes: planned.get(employeeId) ?? null,
      };
    })
    .sort((a, b) => b.totalMinutes - a.totalMinutes || a.employeeId.localeCompare(b.employeeId));
  const byCategory = [...groupBy(entries, (entry) => entry.categoryId)]
    .map(([categoryId, own]) => ({ categoryId, totalMinutes: sum(own) }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes || a.categoryId.localeCompare(b.categoryId));
  const byPeriod = [...groupBy(entries, (entry) => periodStart(entry.workDate, unit))]
    .map(([start, own]) => ({ periodStart: start, totalMinutes: sum(own) }))
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const plannedValues = [...planned.values()].filter((value): value is number => value !== null);

  return {
    totalMinutes: sum(entries),
    plannedMinutes: plannedValues.length > 0 ? plannedValues.reduce((a, b) => a + b, 0) : null,
    workedDays: new Set(entries.map((entry) => entry.workDate)).size,
    savedLogCount: input.savedLogCount,
    draftLogCount: input.draftLogCount,
    byEmployee,
    byCategory,
    byPeriod,
  };
};

/**
 * @description 직원의 프로젝트별 투입 이력과 이번 달·올해 공수. 저장된 일지의 항목만 넘겨야 한다
 * @param input 직원의 저장된 항목(프로젝트별), 취소하지 않은 투입, 프로젝트 이름, 오늘(서울)
 * @returns 프로젝트별 이력 (최근 작업한 순, 작업 기록이 없는 투입은 뒤)
 */
export const summarizeEmployeeWork = (input: {
  entries: readonly { projectId: string; workDate: string; minutes: number }[];
  assignments: readonly { projectId: string; startDate: string; endDate: string }[];
  projects: ReadonlyMap<string, { code: string; name: string }>;
  today: string;
}): EmployeeWorkHistory => {
  const { entries, assignments, projects, today } = input;
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const entriesByProject = groupBy(entries, (entry) => entry.projectId);
  const assignmentsByProject = groupBy(assignments, (assignment) => assignment.projectId);
  const projectIds = new Set([...entriesByProject.keys(), ...assignmentsByProject.keys()]);
  const rows = [...projectIds].map((projectId) => {
    const own = entriesByProject.get(projectId) ?? [];
    const periods = assignmentsByProject.get(projectId) ?? [];
    const dates = own.map((entry) => entry.workDate).sort();
    const project = projects.get(projectId);

    return {
      projectId,
      projectCode: project?.code ?? '',
      projectName: project?.name ?? '',
      assignedFrom: periods.length > 0 ? periods.map((p) => p.startDate).sort()[0]! : null,
      assignedTo:
        periods.length > 0
          ? periods
              .map((p) => p.endDate)
              .sort()
              .at(-1)!
          : null,
      workedDays: new Set(dates).size,
      totalMinutes: sum(own),
      lastWorkDate: dates.at(-1) ?? null,
    };
  });

  rows.sort(
    (a, b) =>
      (b.lastWorkDate ?? '').localeCompare(a.lastWorkDate ?? '') ||
      a.projectCode.localeCompare(b.projectCode),
  );

  return {
    thisMonthMinutes: sum(entries.filter((entry) => entry.workDate.startsWith(month))),
    thisYearMinutes: sum(entries.filter((entry) => entry.workDate.startsWith(year))),
    totalMinutes: sum(entries),
    projects: rows,
  };
};
