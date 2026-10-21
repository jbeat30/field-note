import {
  buildStaffingGrid,
  buildStaffingMonthCalendar,
  buildStaffingTimeline,
  summarizeStaffingTimeline,
  countDays,
  findFreeEmployees,
  findStaffingConflicts,
  listDates,
  shiftDate,
  staffingCalendarQuerySchema,
  type StaffingCalendar,
} from './staffing';

const E1 = '0198d000-0000-7000-8000-000000000001';
const E2 = '0198d000-0000-7000-8000-000000000002';
const E3 = '0198d000-0000-7000-8000-000000000003';
const E4 = '0198d000-0000-7000-8000-000000000004';
const P1 = '0198d000-0000-7000-8000-0000000000a1';
const P2 = '0198d000-0000-7000-8000-0000000000a2';

const employee = (id: string, name: string, status: 'ACTIVE' | 'ON_LEAVE' | 'LEFT' = 'ACTIVE') => ({
  id,
  name,
  title: null,
  status,
  leftOn: null,
});

const assignment = (
  id: string,
  employeeId: string,
  projectId: string,
  from: string,
  to: string,
) => ({
  id,
  employeeId,
  projectId,
  projectCode: projectId === P1 ? '2026-001' : '2026-002',
  projectName: projectId === P1 ? '한빛 1공장' : '새론 2공장',
  projectStatus: 'IN_PROGRESS' as const,
  startDate: from,
  endDate: to,
});

// 2026-10-05(월) ~ 10-11(일)
const week = { from: '2026-10-05', to: '2026-10-11' };

describe('날짜 계산', () => {
  it('일수와 날짜 목록은 양 끝을 포함한다', () => {
    expect(countDays('2026-10-05', '2026-10-05')).toBe(1);
    expect(countDays('2026-10-30', '2026-11-02')).toBe(4);
    expect(listDates('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
    expect(listDates('2026-10-05', '2026-10-04')).toEqual([]);
  });
});

describe('staffingCalendarQuerySchema', () => {
  it('거꾸로인 기간과 42일을 넘는 기간을 거부한다', () => {
    expect(
      staffingCalendarQuerySchema.safeParse({ from: '2026-10-05', to: '2026-10-11' }).success,
    ).toBe(true);
    expect(
      staffingCalendarQuerySchema.safeParse({ from: '2026-10-05', to: '2026-11-15' }).success,
    ).toBe(true);
    expect(
      staffingCalendarQuerySchema.safeParse({ from: '2026-10-05', to: '2026-11-16' }).success,
    ).toBe(false);
    expect(
      staffingCalendarQuerySchema.safeParse({ from: '2026-10-11', to: '2026-10-05' }).success,
    ).toBe(false);
  });
});

describe('buildStaffingGrid', () => {
  const calendar: StaffingCalendar = {
    ...week,
    employees: [employee(E1, '김철수'), employee(E2, '이영희', 'ON_LEAVE')],
    workDays: [],
    assignments: [
      assignment('0198d000-0000-7000-8000-0000000000b1', E1, P1, '2026-10-05', '2026-10-08'),
      assignment('0198d000-0000-7000-8000-0000000000b2', E1, P2, '2026-10-07', '2026-10-09'),
    ],
  };

  it('투입된 날은 프로젝트를, 두 곳이 겹치는 날은 겹침을 표시한다', () => {
    const [row] = buildStaffingGrid(calendar);
    const states = row!.cells.map((cell) => cell.state);

    expect(states).toEqual([
      'ASSIGNED',
      'ASSIGNED',
      'CONFLICT',
      'CONFLICT',
      'ASSIGNED',
      'FREE',
      'FREE',
    ]);
    expect(row!.cells[2]!.projects.map((project) => project.code)).toEqual([
      '2026-001',
      '2026-002',
    ]);
  });

  it('휴직 직원은 기간 전체가 근무 불가다', () => {
    const rows = buildStaffingGrid(calendar);

    expect(rows[1]!.cells.every((cell) => cell.state === 'UNAVAILABLE')).toBe(true);
    expect(rows[1]!.cells[0]!.unavailable).toBe('ON_LEAVE');
  });

  it('퇴사 직원은 퇴사일 다음 날부터 근무 불가이고 투입이 있으면 투입을 보여 준다', () => {
    const rows = buildStaffingGrid({
      ...week,
      employees: [{ ...employee(E3, '박퇴사', 'LEFT'), leftOn: '2026-10-07' }],
      workDays: [],
      assignments: [
        assignment('0198d000-0000-7000-8000-0000000000b3', E3, P1, '2026-10-05', '2026-10-09'),
      ],
    });

    expect(rows[0]!.cells.map((cell) => cell.state)).toEqual([
      'ASSIGNED',
      'ASSIGNED',
      'ASSIGNED',
      'ASSIGNED',
      'ASSIGNED',
      'UNAVAILABLE',
      'UNAVAILABLE',
    ]);
  });

  it('같은 프로젝트의 투입 두 건이 날짜가 겹쳐도 한 곳으로 센다', () => {
    const rows = buildStaffingGrid({
      ...week,
      employees: [employee(E1, '김철수')],
      workDays: [],
      assignments: [
        assignment('0198d000-0000-7000-8000-0000000000b1', E1, P1, '2026-10-05', '2026-10-07'),
        assignment('0198d000-0000-7000-8000-0000000000b2', E1, P1, '2026-10-06', '2026-10-08'),
      ],
    });

    expect(rows[0]!.cells[1]!.state).toBe('ASSIGNED');
  });
});

describe('findFreeEmployees / findStaffingConflicts', () => {
  const rows = buildStaffingGrid({
    ...week,
    employees: [employee(E1, '김철수'), employee(E2, '이영희'), employee(E4, '정휴직', 'ON_LEAVE')],
    workDays: [],
    assignments: [
      assignment('0198d000-0000-7000-8000-0000000000b1', E1, P1, '2026-10-05', '2026-10-05'),
      assignment('0198d000-0000-7000-8000-0000000000b2', E1, P2, '2026-10-05', '2026-10-05'),
    ],
  });

  it('기간 내내 비어 있는 직원만 비는 사람이다 (일요일은 보지 않음)', () => {
    expect(findFreeEmployees(rows).map((item) => item.name)).toEqual(['이영희']);
  });

  it('겹치는 날을 직원별로 모은다', () => {
    expect(findStaffingConflicts(rows)).toEqual([
      { employee: expect.objectContaining({ name: '김철수' }), dates: ['2026-10-05'] },
    ]);
  });
});

describe('shiftDate', () => {
  it('월 경계를 넘어 일 단위로 옮긴다', () => {
    expect(shiftDate('2026-10-30', 3)).toBe('2026-11-02');
    expect(shiftDate('2026-10-05', -7)).toBe('2026-09-28');
  });
});

describe('buildStaffingTimeline', () => {
  const day = (employeeId: string, workDate: string, projectId: string, minutes: number) => ({
    employeeId,
    workDate,
    projectId,
    projectCode: projectId === P1 ? '2026-001' : '2026-002',
    projectName: projectId === P1 ? '한빛 1공장' : '새론 2공장',
    projectStatus: 'IN_PROGRESS' as const,
    minutes,
  });
  const calendar: StaffingCalendar = {
    ...week,
    employees: [employee(E1, '김철수'), employee(E2, '이영희'), employee(E3, '박휴직', 'ON_LEAVE')],
    assignments: [],
    workDays: [
      // 10/5~10/7 한빛, 10/9 한빛 (10/8은 쉼 → 막대 둘), 10/7에 새론도 일해 겹침
      day(E1, '2026-10-05', P1, 480),
      day(E1, '2026-10-06', P1, 480),
      day(E1, '2026-10-07', P1, 240),
      day(E1, '2026-10-07', P2, 240),
      day(E1, '2026-10-09', P1, 480),
      day(E1, '2026-10-09', P1, 0),
    ],
  };

  it('이어진 날은 막대 하나로 묶고 쉰 날 뒤는 새 막대, 프로젝트마다 한 줄이다', () => {
    const [row] = buildStaffingTimeline(calendar);

    expect(row!.group).toBe('WORKING');
    expect(row!.lanes.map((lane) => lane.name)).toEqual(['한빛 1공장', '새론 2공장']);

    const [first, second] = row!.lanes;

    expect(first!.segments.map((segment) => [segment.startIndex, segment.days.length])).toEqual([
      [0, 3],
      [4, 1],
    ]);
    expect(first!.segments[0]!.days.map((item) => item.minutes)).toEqual([480, 480, 240]);
    expect(second!.segments.map((segment) => [segment.startIndex, segment.days.length])).toEqual([
      [2, 1],
    ]);
    expect(row).toMatchObject({ totalMinutes: 1920, workedDays: 4 });
  });

  it('같은 날 두 프로젝트에서 일했으면 두 막대 모두 그 날이 겹침이다', () => {
    const [row] = buildStaffingTimeline(calendar);

    expect(row!.conflictDates).toEqual(['2026-10-07']);
    expect(row!.lanes[0]!.segments[0]!.days.map((item) => item.conflict)).toEqual([
      false,
      false,
      true,
    ]);
    expect(row!.lanes[1]!.segments[0]!.days[0]!.conflict).toBe(true);
  });

  it('일한 기록이 없으면 재직은 비는 사람, 휴직·퇴사는 쉬는 사람으로 묶고 요약한다', () => {
    const rows = buildStaffingTimeline(calendar);

    expect(rows.map((row) => row.group)).toEqual(['WORKING', 'IDLE', 'AWAY']);
    expect(summarizeStaffingTimeline(rows)).toEqual({
      working: 1,
      idle: 1,
      away: 1,
      conflicts: 1,
    });
  });

  it('이어진 겹침 날은 한 건으로 센다', () => {
    const rows = buildStaffingTimeline({
      ...calendar,
      workDays: [
        day(E1, '2026-10-06', P1, 240),
        day(E1, '2026-10-06', P2, 240),
        day(E1, '2026-10-07', P1, 240),
        day(E1, '2026-10-07', P2, 240),
        day(E1, '2026-10-10', P1, 240),
        day(E1, '2026-10-10', P2, 240),
      ],
    });

    expect(summarizeStaffingTimeline(rows).conflicts).toBe(2);
  });
});

describe('buildStaffingMonthCalendar', () => {
  const day = (employeeId: string, workDate: string, projectId: string, minutes: number) => ({
    employeeId,
    workDate,
    projectId,
    projectCode: projectId === P1 ? '2026-001' : '2026-002',
    projectName: projectId === P1 ? '한빛 1공장' : '새론 2공장',
    projectStatus: 'IN_PROGRESS' as const,
    minutes,
  });
  // 2026-10은 목요일(1일)에 시작해 토요일(31일)에 끝남
  const calendar: StaffingCalendar = {
    from: '2026-10-01',
    to: '2026-10-31',
    employees: [employee(E1, '김철수'), employee(E2, '이영희')],
    assignments: [],
    workDays: [
      day(E1, '2026-10-07', P1, 240),
      day(E1, '2026-10-07', P2, 240),
      day(E2, '2026-10-07', P1, 480),
      day(E2, '2026-10-08', P1, 0),
    ],
  };

  it('월요일 시작 주 단위로 묶고 앞뒤 빈 칸으로 한 주를 7칸 채운다', () => {
    const weeks = buildStaffingMonthCalendar(calendar);

    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    // 첫 주: 9/28(월)~10/4(일), 1일은 목요일이라 앞 세 칸이 빈 칸
    expect(weeks[0]!.map((item) => [item.date, item.inMonth])).toEqual([
      ['2026-09-28', false],
      ['2026-09-29', false],
      ['2026-09-30', false],
      ['2026-10-01', true],
      ['2026-10-02', true],
      ['2026-10-03', true],
      ['2026-10-04', true],
    ]);
    expect(weeks[4]!.at(-1)).toMatchObject({ date: '2026-11-01', inMonth: false });
  });

  it('날짜 칸에 일한 사람 수와 프로젝트별 사람, 겹친 사람 수를 담고 0분 기록은 뺀다', () => {
    const weeks = buildStaffingMonthCalendar(calendar);
    const seventh = weeks.flat().find((item) => item.date === '2026-10-07')!;

    expect(seventh.headcount).toBe(2);
    expect(seventh.conflictCount).toBe(1);
    expect(
      seventh.projects.map((project) => [project.name, project.people.map((p) => p.name)]),
    ).toEqual([
      ['새론 2공장', ['김철수']],
      ['한빛 1공장', ['김철수', '이영희']],
    ]);
    expect(weeks.flat().find((item) => item.date === '2026-10-08')).toMatchObject({
      headcount: 0,
      projects: [],
      conflictCount: 0,
    });
  });
});
