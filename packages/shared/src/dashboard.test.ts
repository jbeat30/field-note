import {
  ALERT_KINDS,
  alertSettingsUpdateSchema,
  assembleDashboard,
  dashboardAlertKey,
  dashboardAlertMessage,
  dashboardAlertPath,
  isUrgentAlert,
  previousMonth,
  weekRange,
  type AlertKind,
  type Dashboard,
  type DashboardAlert,
  type DashboardInput,
} from './dashboard';

const P1 = '0198d000-0000-7000-8000-0000000000a1';
const P2 = '0198d000-0000-7000-8000-0000000000a2';
const P3 = '0198d000-0000-7000-8000-0000000000a3';
const E1 = '0198d000-0000-7000-8000-000000000001';
const E2 = '0198d000-0000-7000-8000-000000000002';
const E3 = '0198d000-0000-7000-8000-000000000003';
const C1 = '0198d000-0000-7000-8000-0000000000c1';

// 2026-10-11(일): 이번 주는 10/5(월) ~ 10/11(일)
const TODAY = '2026-10-11';

const project = (id: string, code: string, patch: object = {}) => ({
  id,
  code,
  name: `프로젝트 ${code}`,
  siteName: `현장 ${code}`,
  status: 'IN_PROGRESS' as const,
  plannedStart: '2026-09-01',
  plannedEnd: '2026-12-31',
  plannedMinutes: 80 * 480,
  usedMinutes: 0,
  progressPercent: null,
  progressRecordedOn: null,
  ...patch,
});

const base = (patch: Partial<DashboardInput> = {}): DashboardInput => ({
  today: TODAY,
  projects: [project(P1, '2026-001')],
  todayAssignments: [],
  todayLogProjectIds: [],
  todayLoggedEmployeeIds: [],
  draftLogCount: 0,
  calendar: { from: '2026-10-05', to: '2026-10-11', employees: [], assignments: [], workDays: [] },
  negotiatingChanges: [],
  warrantyProjects: [],
  openRepairs: [],
  certificates: [],
  credentials: [],
  unclosedMonth: null,
  enabled: new Set<AlertKind>(ALERT_KINDS),
  dismissedKeys: new Set<string>(),
  ...patch,
});

const inner = (dashboard: Dashboard): DashboardAlert[] =>
  dashboard.alerts.map((item) => item.alert);

describe('weekRange', () => {
  it('월요일부터 일요일까지', () => {
    expect(weekRange('2026-10-11')).toEqual({ from: '2026-10-05', to: '2026-10-11' });
    expect(weekRange('2026-10-05')).toEqual({ from: '2026-10-05', to: '2026-10-11' });
    expect(weekRange('2026-10-07')).toEqual({ from: '2026-10-05', to: '2026-10-11' });
  });
});

describe('assembleDashboard: 오늘 투입', () => {
  it('프로젝트마다 오늘 나가는 인원을 한 번씩만 세고 작업 내역이 없는 프로젝트를 먼저 보여 준다', () => {
    const dashboard = assembleDashboard(
      base({
        projects: [project(P1, '2026-001'), project(P2, '2026-002')],
        todayAssignments: [
          { projectId: P1, employeeId: E1 },
          { projectId: P1, employeeId: E1 },
          { projectId: P1, employeeId: E2 },
          { projectId: P2, employeeId: E1 },
        ],
        todayLogProjectIds: [P1],
      }),
    );

    expect(dashboard.todayAssignments.headcount).toBe(2);
    expect(dashboard.todayAssignments.projects).toEqual([
      expect.objectContaining({ projectId: P2, headcount: 1, hasLog: false }),
      expect.objectContaining({ projectId: P1, headcount: 2, hasLog: true }),
    ]);
  });

  it('작업 내역이 없는 프로젝트마다 알림이 나온다', () => {
    const dashboard = assembleDashboard(
      base({ todayAssignments: [{ projectId: P1, employeeId: E1 }] }),
    );

    expect(inner(dashboard)).toEqual([
      { kind: 'NO_LOG_TODAY', projectId: P1, projectName: '프로젝트 2026-001' },
    ]);
  });
});

describe('assembleDashboard: 프로젝트와 위험', () => {
  it('상태별 건수를 세고 경고가 있는 프로젝트를 먼저 보여 준다', () => {
    const dashboard = assembleDashboard(
      base({
        projects: [
          project(P1, '2026-001'),
          project(P2, '2026-002', { usedMinutes: 70 * 480, progressPercent: 30 }),
          project(P3, '2026-003', { status: 'PLANNED' }),
        ],
      }),
    );

    expect(dashboard.projectCounts).toEqual({ planned: 1, inProgress: 2, suspended: 0 });
    expect(dashboard.activeProjects.map((item) => item.id)).toEqual([P2, P1, P3]);
    expect(dashboard.risks.map((item) => item.id)).toEqual([P2]);
    expect(dashboard.risks[0]!.warnings).toEqual(
      expect.arrayContaining(['BURN_WARN', 'BURN_AHEAD']),
    );
  });

  it('소진율 도달·진행률 대비 과다·종료 예정일 경과 알림을 만든다 (기획서 §10.4 예시: 70%·진행률 45%)', () => {
    const dashboard = assembleDashboard(
      base({
        projects: [
          project(P1, '2026-001', { usedMinutes: 56 * 480, progressPercent: 45 }),
          project(P2, '2026-002', { usedMinutes: 80 * 480, progressPercent: 90 }),
          project(P3, '2026-003', { plannedEnd: '2026-10-05', progressPercent: 90 }),
        ],
      }),
    );
    const byKind = (kind: string) => inner(dashboard).filter((alert) => alert.kind === kind);

    expect(byKind('BURN_AHEAD')).toEqual([
      expect.objectContaining({ projectId: P1, burnPercent: 70, progressPercent: 45 }),
    ]);
    expect(byKind('BURN_REACHED')).toEqual([
      expect.objectContaining({ projectId: P2, level: 'LIMIT' }),
    ]);
    expect(byKind('PROJECT_OVERDUE')).toEqual([
      expect.objectContaining({ projectId: P3, plannedEnd: '2026-10-05', daysLate: 6 }),
    ]);
  });
});

describe('assembleDashboard: 이번 주 인력', () => {
  const workDay = (
    employeeId: string,
    workDate: string,
    projectId: string,
    projectName: string,
    minutes = 480,
  ) => ({
    employeeId,
    workDate,
    projectId,
    projectCode: projectId === P1 ? '2026-001' : '2026-002',
    projectName,
    projectStatus: 'IN_PROGRESS' as const,
    minutes,
  });
  const calendar = {
    from: '2026-10-05',
    to: '2026-10-11',
    employees: [
      { id: E1, name: '김겹침', title: null, status: 'ACTIVE' as const, leftOn: null },
      { id: E2, name: '이한가', title: null, status: 'ACTIVE' as const, leftOn: null },
      { id: E3, name: '박휴직', title: null, status: 'ON_LEAVE' as const, leftOn: null },
    ],
    assignments: [],
    workDays: [
      workDay(E1, '2026-10-05', P1, 'A', 480),
      workDay(E1, '2026-10-06', P1, 'A', 240),
      workDay(E1, '2026-10-06', P2, 'B', 240),
      workDay(E1, '2026-10-07', P1, 'A', 240),
      workDay(E1, '2026-10-07', P2, 'B', 240),
    ],
  };

  it('같은 날 두 프로젝트에서 일한 직원을 이름·기간과 함께 알리고, 일한 사람·기록 없는 사람을 센다 (휴직은 기록 없는 사람이 아님)', () => {
    const dashboard = assembleDashboard(base({ calendar }));

    expect(dashboard.week).toMatchObject({
      from: '2026-10-05',
      to: '2026-10-11',
      conflicts: [{ employeeId: E1, name: '김겹침', dateCount: 2 }],
      workingCount: 1,
      idleCount: 1,
    });
    expect(dashboard.stats.weekMinutes).toBe(480 + 480 + 480);
    expect(inner(dashboard)).toEqual([
      {
        kind: 'DOUBLE_ASSIGNED',
        employeeId: E1,
        employeeName: '김겹침',
        dateCount: 2,
        firstDate: '2026-10-06',
        lastDate: '2026-10-07',
        projectNames: ['A', 'B'],
      },
    ]);
    expect(dashboardAlertMessage(inner(dashboard)[0]!)).toBe(
      '김겹침이(가) 10월 6일~10월 7일 A와 B에 함께 들어가 있습니다',
    );
    expect(dashboardAlertPath(inner(dashboard)[0]!, TODAY)).toBe(
      `/staffing?from=2026-10-06&employee=${E1}`,
    );
  });
});

describe('알림 키·급함·숨기기', () => {
  it('종류·대상·조건 값으로 키를 만들고, 조건이 바뀌면 키도 달라진다', () => {
    const wide: DashboardAlert = {
      kind: 'DOUBLE_ASSIGNED',
      employeeId: E1,
      employeeName: '김',
      dateCount: 2,
      firstDate: '2026-10-06',
      lastDate: '2026-10-07',
      projectNames: ['A', 'B'],
    };

    expect(dashboardAlertKey(wide, TODAY)).toBe(`DOUBLE_ASSIGNED|${E1}|2026-10-06|2026-10-07`);
    expect(dashboardAlertKey({ ...wide, lastDate: '2026-10-08' }, TODAY)).not.toBe(
      dashboardAlertKey(wide, TODAY),
    );
    // 오늘 기록 없음은 날마다 다시 표시
    const noLog: DashboardAlert = { kind: 'NO_LOG_TODAY', projectId: P1, projectName: 'A' };

    expect(dashboardAlertKey(noLog, TODAY)).not.toBe(dashboardAlertKey(noLog, '2026-10-12'));
  });

  it('오늘 처리해야 하는 알림(오늘 기록 없음, 이미 만료)만 급하다', () => {
    expect(isUrgentAlert({ kind: 'NO_LOG_TODAY', projectId: P1, projectName: 'A' })).toBe(true);
    expect(
      isUrgentAlert({
        kind: 'CREDENTIAL_EXPIRING',
        employeeId: E1,
        employeeName: '김',
        typeName: '검진',
        expiresOn: '2026-10-01',
        daysLeft: -10,
      }),
    ).toBe(true);
    expect(
      isUrgentAlert({
        kind: 'CREDENTIAL_EXPIRING',
        employeeId: E1,
        employeeName: '김',
        typeName: '검진',
        expiresOn: '2026-10-20',
        daysLeft: 9,
      }),
    ).toBe(false);
    expect(isUrgentAlert({ kind: 'MONTH_UNCLOSED', month: '2026-09' })).toBe(false);
  });

  it('급한 알림이 먼저 나오고, 숨긴 키는 빠지며 숨긴 개수를 알려 준다', () => {
    const input = base({
      todayAssignments: [{ projectId: P1, employeeId: E1 }],
      unclosedMonth: '2026-09',
    });
    const all = assembleDashboard(input);

    expect(all.alerts.map((item) => [item.alert.kind, item.urgent])).toEqual([
      ['NO_LOG_TODAY', true],
      ['MONTH_UNCLOSED', false],
    ]);
    expect(all.hiddenAlertCount).toBe(0);

    const hidden = assembleDashboard({
      ...input,
      dismissedKeys: new Set([all.alerts[0]!.key, 'NOT|A|CURRENT|ALERT']),
    });

    expect(inner(hidden).map((alert) => alert.kind)).toEqual(['MONTH_UNCLOSED']);
    // 현재 해당하지 않는 키는 숨긴 개수에서 제외
    expect(hidden.hiddenAlertCount).toBe(1);
  });
});

describe('assembleDashboard: 변경 작업·할 일', () => {
  it('협의 중 변경 작업 7일 경과를 알린다', () => {
    const dashboard = assembleDashboard(
      base({
        draftLogCount: 2,
        negotiatingChanges: [
          { id: C1, projectId: P1, seq: 2, statusChangedOn: '2026-10-04' },
          { id: C1, projectId: P1, seq: 3, statusChangedOn: '2026-10-05' },
        ],
      }),
    );

    expect(dashboard.todos).toEqual({
      draftLogCount: 2,
      unclosedMonth: null,
    });
    expect(inner(dashboard)).toEqual([
      expect.objectContaining({ kind: 'CHANGE_STALE', seq: 2, days: 7 }),
    ]);
  });
});

describe('알림 켜고 끄기', () => {
  it('꺼 둔 종류는 알림에서 빠지지만 위젯은 그대로 나온다', () => {
    const input = base({
      todayAssignments: [{ projectId: P1, employeeId: E1 }],
      projects: [project(P1, '2026-001', { usedMinutes: 80 * 480, progressPercent: 90 })],
    });
    const on = assembleDashboard(input);
    const off = assembleDashboard({
      ...input,
      enabled: new Set<AlertKind>(['BURN_REACHED']),
    });

    expect(
      inner(on)
        .map((alert) => alert.kind)
        .sort(),
    ).toEqual(['BURN_REACHED', 'NO_LOG_TODAY'].sort());
    expect(inner(off).map((alert) => alert.kind)).toEqual(['BURN_REACHED']);
    expect(off.todayAssignments).toEqual(on.todayAssignments);
    expect(off.risks).toEqual(on.risks);
    expect(inner(assembleDashboard({ ...input, enabled: new Set() }))).toEqual([]);
  });
});

describe('알림 문장·이동 주소', () => {
  it('모든 종류가 문장과 주소를 갖는다', () => {
    const alerts: DashboardAlert[] = [
      { kind: 'NO_LOG_TODAY', projectId: P1, projectName: 'A' },
      { kind: 'BURN_REACHED', projectId: P1, projectName: 'A', level: 'WARN', burnPercent: 82 },
      { kind: 'BURN_AHEAD', projectId: P1, projectName: 'A', burnPercent: 70, progressPercent: 45 },
      {
        kind: 'PROJECT_OVERDUE',
        projectId: P1,
        projectName: 'A',
        plannedEnd: '2026-10-05',
        daysLate: 6,
      },
      {
        kind: 'DOUBLE_ASSIGNED',
        employeeId: E1,
        employeeName: '김',
        dateCount: 2,
        firstDate: '2026-10-06',
        lastDate: '2026-10-07',
        projectNames: ['A', 'B'],
      },
      { kind: 'CHANGE_STALE', projectId: P1, projectName: 'A', changeWorkId: C1, seq: 2, days: 8 },
    ];

    for (const alert of alerts) {
      expect(dashboardAlertMessage(alert).length).toBeGreaterThan(5);
      expect(dashboardAlertPath(alert, TODAY).startsWith('/')).toBe(true);
    }

    expect(dashboardAlertPath(alerts[5]!, TODAY)).toBe(`/projects/${P1}/change-works`);
    expect(dashboardAlertMessage(alerts[1]!)).toContain('82%에 도달');
    // 오늘 기록 없음은 그 프로젝트의 오늘 하루 기록으로 이동
    expect(dashboardAlertPath(alerts[0]!, TODAY)).toBe(`/projects/${P1}/work/${TODAY}`);
  });
});

describe('alertSettingsUpdateSchema', () => {
  it('바꿀 알림이 하나는 있어야 하고 같은 종류를 두 번 보낼 수 없다', () => {
    expect(alertSettingsUpdateSchema.safeParse({ items: [] }).success).toBe(false);
    expect(
      alertSettingsUpdateSchema.safeParse({
        items: [
          { kind: 'WARRANTY_ENDING', enabled: false },
          { kind: 'WARRANTY_ENDING', enabled: true },
        ],
      }).success,
    ).toBe(false);
    expect(
      alertSettingsUpdateSchema.safeParse({ items: [{ kind: 'NOPE', enabled: false }] }).success,
    ).toBe(false);
    expect(
      alertSettingsUpdateSchema.safeParse({ items: [{ kind: 'WARRANTY_ENDING', enabled: false }] })
        .success,
    ).toBe(true);
  });
});

describe('assembleDashboard: 4단계 알림', () => {
  const alertsOf = (patch: Partial<DashboardInput>) => inner(assembleDashboard(base(patch)));

  it('보증 종료가 60일 안이면 알리고 가까운 순으로 보여 주며 지난 것도 계속 알린다', () => {
    const dashboard = assembleDashboard(
      base({
        warrantyProjects: [
          { id: P1, code: '2026-001', name: 'A', endOn: '2026-12-10' },
          { id: P2, code: '2026-002', name: 'B', endOn: '2026-10-09' },
          { id: P3, code: '2026-003', name: 'C', endOn: '2026-12-11' },
          { id: C1, code: '2026-004', name: 'D', endOn: '2026-10-11' },
        ],
      }),
    );

    expect(dashboard.warranty.ending.map((item) => [item.name, item.daysLeft])).toEqual([
      ['B', -2],
      ['D', 0],
      ['A', 60],
    ]);
    expect(inner(dashboard).map((alert) => dashboardAlertMessage(alert))).toEqual([
      'B: 보증 종료 예정일(2026-10-09)이 2일 지났습니다',
      'D: 오늘 보증이 끝납니다',
      'A: 보증 종료까지 60일 남았습니다 (2026-12-10)',
    ]);
  });

  it('접수 상태로 3일 넘게 둔 보수 요청만 알리고 처리 중인 건은 건수에만 센다', () => {
    const repair = (
      id: string,
      seq: number,
      receivedOn: string,
      status: 'RECEIVED' | 'IN_PROGRESS',
    ) => ({
      id,
      projectId: P1,
      projectName: 'A',
      seq,
      receivedOn,
      status,
    });
    const dashboard = assembleDashboard(
      base({
        openRepairs: [
          repair(E1, 1, '2026-10-08', 'RECEIVED'),
          repair(E2, 2, '2026-10-09', 'RECEIVED'),
          repair(E3, 3, '2026-09-01', 'IN_PROGRESS'),
        ],
      }),
    );

    expect(inner(dashboard)).toEqual([
      { kind: 'REPAIR_UNHANDLED', projectId: P1, projectName: 'A', repairId: E1, seq: 1, days: 3 },
    ]);
    expect(dashboard.warranty.openRepairCount).toBe(3);
  });

  it('보증서는 30일, 직원 서류는 30일 안(지난 것 포함)에서 만료가 빠른 순으로 알린다', () => {
    const dashboard = assembleDashboard(
      base({
        certificates: [
          { projectId: P1, projectName: 'A', title: '보증증권', expiresOn: '2026-11-10' },
          { projectId: P1, projectName: 'A', title: '하자보증', expiresOn: '2026-11-11' },
        ],
        credentials: [
          { employeeId: E1, employeeName: '정판금', typeName: '건강검진', expiresOn: '2026-09-30' },
          {
            employeeId: E2,
            employeeName: '한용접',
            typeName: '용접 기능사',
            expiresOn: '2026-11-10',
          },
          { employeeId: E3, employeeName: '오전기', typeName: '안전교육', expiresOn: '2026-11-11' },
        ],
      }),
    );

    expect(dashboard.expiring.certificates.map((item) => item.title)).toEqual(['보증증권']);
    expect(
      dashboard.expiring.credentials.map((item) => [item.employeeName, item.daysLeft]),
    ).toEqual([
      ['정판금', -11],
      ['한용접', 30],
    ]);
    expect(inner(dashboard).map((alert) => alert.kind)).toEqual([
      // 이미 만료된 것이 급하므로 먼저 표시
      'CREDENTIAL_EXPIRING',
      'CERTIFICATE_EXPIRING',
      'CREDENTIAL_EXPIRING',
    ]);
    expect(dashboardAlertMessage(inner(dashboard)[0]!)).toContain('11일 전에 만료됐습니다');
  });

  it('지난달 월 공수가 확정되지 않았으면 알림과 할 일에 보이고 알림을 끄면 알림만 빠진다', () => {
    const on = assembleDashboard(base({ unclosedMonth: '2026-09' }));

    expect(on.todos.unclosedMonth).toBe('2026-09');
    expect(inner(on)).toEqual([{ kind: 'MONTH_UNCLOSED', month: '2026-09' }]);
    expect(dashboardAlertPath(inner(on)[0]!, TODAY)).toBe('/monthly-hours?month=2026-09');

    const off = assembleDashboard(
      base({
        unclosedMonth: '2026-09',
        enabled: new Set<AlertKind>(ALERT_KINDS.filter((kind) => kind !== 'MONTH_UNCLOSED')),
      }),
    );

    expect(inner(off)).toEqual([]);
    expect(off.todos.unclosedMonth).toBe('2026-09');
  });

  it('알림을 끄면 위젯 목록은 그대로이고 알림만 빠진다', () => {
    const dashboard = assembleDashboard(
      base({
        warrantyProjects: [{ id: P1, code: '2026-001', name: 'A', endOn: '2026-10-20' }],
        enabled: new Set<AlertKind>(),
      }),
    );

    expect(inner(dashboard)).toEqual([]);
    expect(dashboard.warranty.ending).toHaveLength(1);
    expect(alertsOf({})).toEqual([]);
  });
});

describe('previousMonth', () => {
  it('지난달을 구하고 1월이면 전년 12월', () => {
    expect(previousMonth('2026-10-11')).toBe('2026-09');
    expect(previousMonth('2026-01-05')).toBe('2025-12');
  });
});
