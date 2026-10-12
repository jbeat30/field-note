import {
  buildStaffingGrid,
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
