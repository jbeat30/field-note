import { minutesToManDays, roundTo, sumManDays, toManMonths } from './workUnits';
import { periodStart, summarizeEmployeeWork, summarizeProjectWork } from './workSummary';

const E1 = '0198d000-0000-7000-8000-000000000001';
const E2 = '0198d000-0000-7000-8000-000000000002';
const C1 = '0198d000-0000-7000-8000-0000000000c1';
const C2 = '0198d000-0000-7000-8000-0000000000c2';
const P1 = '0198d000-0000-7000-8000-0000000000a1';
const P2 = '0198d000-0000-7000-8000-0000000000a2';

describe('periodStart', () => {
  it('주별은 월요일, 월별은 1일로 묶는다', () => {
    expect(periodStart('2026-10-07', 'week')).toBe('2026-10-05');
    expect(periodStart('2026-10-04', 'week')).toBe('2026-09-28');
    expect(periodStart('2026-10-05', 'week')).toBe('2026-10-05');
    expect(periodStart('2026-10-31', 'month')).toBe('2026-10-01');
  });
});

describe('summarizeProjectWork', () => {
  it('기획서 §9.5 예시: 20일 투입 중 연장 2일(1.5)이면 21.0 MD, 0.95 MM', () => {
    const entries = Array.from({ length: 20 }, (_, index) => ({
      workDate: `2026-03-${String(index + 1).padStart(2, '0')}`,
      employeeId: E1,
      categoryId: C1,
      minutes: index < 2 ? 720 : 480,
    }));
    const summary = summarizeProjectWork({
      entries,
      savedLogCount: 20,
      draftLogCount: 0,
      assignments: [{ employeeId: E1, plannedMinutes: 480 * 30 }],
      unit: 'month',
    });
    const manDays = sumManDays([summary.totalMinutes], 480);

    expect(manDays).toBe(21);
    expect(roundTo(toManMonths(manDays, 22), 2)).toBe(0.95);
    expect(summary.byEmployee[0]).toMatchObject({ workedDays: 20, plannedMinutes: 14400 });
    expect(minutesToManDays(summary.byEmployee[0]!.totalMinutes, 480)).toBe(21);
    expect(summary.byPeriod).toEqual([{ periodStart: '2026-03-01', totalMinutes: 10080 }]);
  });

  it('작업 구분을 나누고 직원·구분·주별로 합산한다', () => {
    const summary = summarizeProjectWork({
      entries: [
        { workDate: '2026-10-05', employeeId: E1, categoryId: C1, minutes: 240 },
        { workDate: '2026-10-05', employeeId: E1, categoryId: C2, minutes: 240 },
        { workDate: '2026-10-07', employeeId: E2, categoryId: C2, minutes: 480 },
        { workDate: '2026-10-13', employeeId: E2, categoryId: C2, minutes: 480 },
      ],
      savedLogCount: 3,
      draftLogCount: 1,
      assignments: [],
      unit: 'week',
    });

    expect(summary.totalMinutes).toBe(1440);
    expect(summary.workedDays).toBe(3);
    expect(summary.draftLogCount).toBe(1);
    expect(summary.plannedMinutes).toBeNull();
    expect(summary.byEmployee).toEqual([
      { employeeId: E2, workedDays: 2, totalMinutes: 960, plannedMinutes: null },
      { employeeId: E1, workedDays: 1, totalMinutes: 480, plannedMinutes: null },
    ]);
    expect(summary.byCategory).toEqual([
      { categoryId: C2, totalMinutes: 1200 },
      { categoryId: C1, totalMinutes: 240 },
    ]);
    expect(summary.byPeriod).toEqual([
      { periodStart: '2026-10-05', totalMinutes: 960 },
      { periodStart: '2026-10-12', totalMinutes: 480 },
    ]);
  });

  it('공수가 없는 투입 직원도 계획과 함께 나오고, 계획이 일부만 있으면 있는 값만 합친다', () => {
    const summary = summarizeProjectWork({
      entries: [],
      savedLogCount: 0,
      draftLogCount: 2,
      assignments: [
        { employeeId: E1, plannedMinutes: 480 },
        { employeeId: E1, plannedMinutes: 960 },
        { employeeId: E2, plannedMinutes: null },
      ],
      unit: 'week',
    });

    expect(summary.plannedMinutes).toBe(1440);
    expect(summary.byEmployee).toEqual([
      { employeeId: E1, workedDays: 0, totalMinutes: 0, plannedMinutes: 1440 },
      { employeeId: E2, workedDays: 0, totalMinutes: 0, plannedMinutes: null },
    ]);
  });
});

describe('summarizeEmployeeWork', () => {
  it('프로젝트별 투입 기간·일수·공수와 이번 달·올해 합계를 만든다', () => {
    const history = summarizeEmployeeWork({
      entries: [
        { projectId: P1, workDate: '2026-10-01', minutes: 480 },
        { projectId: P1, workDate: '2026-10-01', minutes: 60 },
        { projectId: P1, workDate: '2026-09-30', minutes: 480 },
        { projectId: P2, workDate: '2026-02-03', minutes: 480 },
        { projectId: P2, workDate: '2025-12-30', minutes: 480 },
      ],
      assignments: [
        { projectId: P1, startDate: '2026-09-01', endDate: '2026-09-30' },
        { projectId: P1, startDate: '2026-10-01', endDate: '2026-10-15' },
      ],
      projects: new Map([
        [P1, { code: '2026-001', name: 'A동' }],
        [P2, { code: '2025-009', name: 'B동' }],
      ]),
      today: '2026-10-07',
    });

    expect(history.thisMonthMinutes).toBe(540);
    expect(history.thisYearMinutes).toBe(1500);
    expect(history.totalMinutes).toBe(1980);
    expect(history.projects.map((project) => project.projectId)).toEqual([P1, P2]);
    expect(history.projects[0]).toMatchObject({
      assignedFrom: '2026-09-01',
      assignedTo: '2026-10-15',
      workedDays: 2,
      totalMinutes: 1020,
      lastWorkDate: '2026-10-01',
    });
    expect(history.projects[1]).toMatchObject({ assignedFrom: null, workedDays: 2 });
  });
});
