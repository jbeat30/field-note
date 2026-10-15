import {
  monthLockCheck,
  monthOf,
  monthRange,
  monthlyCloseSchema,
  monthlyReopenSchema,
  pivotMonthlyHours,
  monthlyWorkValue,
  summarizeMonthlyHours,
  validateMonthClose,
  type MonthlyHoursRow,
} from './monthlyHours';

const U = (n: number) => `0198d000-0000-7000-8000-00000000000${n}`;

describe('월 계산', () => {
  it('월의 첫날·마지막 날을 구한다 (윤년 포함)', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthOf('2026-10-11')).toBe('2026-10');
  });

  it('월 형식은 YYYY-MM만 받는다', () => {
    expect(monthlyCloseSchema.safeParse({ month: '2026-10' }).success).toBe(true);
    for (const month of ['2026-13', '2026-1', '2026-00', '26-10', '2026-10-01']) {
      expect(monthlyCloseSchema.safeParse({ month }).success).toBe(false);
    }
  });

  it('재오픈은 사유가 필수이다', () => {
    expect(monthlyReopenSchema.safeParse({ month: '2026-09', reason: ' ' }).success).toBe(false);
    expect(monthlyReopenSchema.safeParse({ month: '2026-09', reason: '정정' }).success).toBe(true);
  });
});

describe('validateMonthClose', () => {
  const base = {
    month: '2026-09',
    today: '2026-10-11',
    isClosed: false,
    draftLogCount: 0,
    confirmDrafts: false,
  };

  it('지난 달과 이번 달은 확정할 수 있고 오지 않은 달은 안 된다', () => {
    expect(validateMonthClose(base).ok).toBe(true);
    expect(validateMonthClose({ ...base, month: '2026-10' }).ok).toBe(true);
    expect(validateMonthClose({ ...base, month: '2026-11' })).toMatchObject({
      ok: false,
      path: 'month',
    });
  });

  it('이미 확정한 달은 다시 확정할 수 없다', () => {
    expect(validateMonthClose({ ...base, isClosed: true })).toMatchObject({
      ok: false,
      path: 'month',
    });
  });

  it('임시 저장 작업 내역이 있으면 확인해야 확정할 수 있다', () => {
    expect(validateMonthClose({ ...base, draftLogCount: 2 })).toMatchObject({
      ok: false,
      path: 'confirmDrafts',
    });
    expect(validateMonthClose({ ...base, draftLogCount: 2, confirmDrafts: true }).ok).toBe(true);
  });
});

describe('monthLockCheck', () => {
  it('확정된 달의 날짜는 막고 다른 달은 허용한다', () => {
    expect(monthLockCheck('2026-09-15', ['2026-09'])).toMatchObject({
      ok: false,
      path: 'workDate',
    });
    expect(monthLockCheck('2026-10-01', ['2026-09']).ok).toBe(true);
    expect(monthLockCheck('2026-09-15', []).ok).toBe(true);
  });
});

describe('monthlyWorkValue·summarizeMonthlyHours', () => {
  const settings = { standardWorkMinutes: 480, monthlyWorkDays: 22 };

  it('MD는 둘째 자리, MM은 셋째 자리로 환산한다', () => {
    expect(monthlyWorkValue(480, settings)).toEqual({ manDays: 1, manMonths: 0.045 });
    expect(monthlyWorkValue(4_800, settings)).toEqual({ manDays: 10, manMonths: 0.455 });
    expect(monthlyWorkValue(0, settings)).toEqual({ manDays: 0, manMonths: 0 });
  });

  it('확정 당시 기준값으로 환산하면 이후 설정이 바뀌어도 숫자가 같다', () => {
    const snapshot = { standardWorkMinutes: 480, monthlyWorkDays: 22 };
    const changed = { standardWorkMinutes: 420, monthlyWorkDays: 20 };

    expect(monthlyWorkValue(960, snapshot).manDays).toBe(2);
    expect(monthlyWorkValue(960, changed).manDays).not.toBe(2);
  });

  it('직원별·프로젝트별로 분을 먼저 합산한다', () => {
    const rows: MonthlyHoursRow[] = [
      {
        projectId: U(1),
        projectCode: '2026-001',
        projectName: 'A동',
        employeeId: U(2),
        employeeName: '정판금',
        minutes: 480,
      },
      {
        projectId: U(3),
        projectCode: '2026-002',
        projectName: 'B동',
        employeeId: U(2),
        employeeName: '정판금',
        minutes: 240,
      },
      {
        projectId: U(1),
        projectCode: '2026-001',
        projectName: 'A동',
        employeeId: U(4),
        employeeName: '최설치',
        minutes: 480,
      },
    ];
    const summary = summarizeMonthlyHours(rows);

    expect(summary.total).toBe(1200);
    expect(summary.byEmployee.map((item) => [item.name, item.minutes])).toEqual([
      ['정판금', 720],
      ['최설치', 480],
    ]);
    expect(summary.byProject.map((item) => [item.name, item.minutes])).toEqual([
      ['2026-001 A동', 960],
      ['2026-002 B동', 240],
    ]);
  });
});

describe('pivotMonthlyHours', () => {
  const row = (
    projectId: string,
    code: string,
    employeeId: string,
    name: string,
    minutes: number,
  ) => ({
    projectId,
    projectCode: code,
    projectName: `${code} 공사`,
    employeeId,
    employeeName: name,
    minutes,
  });
  const rows = [
    row('p1', '2026-001', 'e1', '정판금', 960),
    row('p2', '2026-002', 'e1', '정판금', 480),
    row('p1', '2026-001', 'e2', '최설치', 480),
  ];

  it('직원별: 행 직원·열 프로젝트, 합계가 큰 순으로 합산한다', () => {
    const matrix = pivotMonthlyHours(rows, 'EMPLOYEE');

    expect(matrix.rows.map((item) => [item.label, item.total])).toEqual([
      ['정판금', 1440],
      ['최설치', 480],
    ]);
    expect(matrix.columns.map((item) => item.id)).toEqual(['p1', 'p2']);
    expect(matrix.rows[0]!.cells).toEqual({ p1: 960, p2: 480 });
    // 일하지 않은 칸은 값 없음
    expect(matrix.rows[1]!.cells).toEqual({ p1: 480 });
    expect(matrix.columnTotals).toEqual({ p1: 1440, p2: 480 });
    expect(matrix.total).toBe(1920);
  });

  it('프로젝트별: 행 프로젝트·열 직원', () => {
    const matrix = pivotMonthlyHours(rows, 'PROJECT');

    expect(matrix.rows.map((item) => [item.id, item.total])).toEqual([
      ['p1', 1440],
      ['p2', 480],
    ]);
    expect(matrix.columns.map((item) => item.label)).toEqual(['정판금', '최설치']);
    expect(matrix.columnTotals).toEqual({ e1: 1440, e2: 480 });
  });

  it('행이 없으면 빈 표', () => {
    expect(pivotMonthlyHours([], 'EMPLOYEE')).toEqual({
      columns: [],
      rows: [],
      columnTotals: {},
      total: 0,
    });
  });
});
