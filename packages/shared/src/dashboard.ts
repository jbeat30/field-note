import { z } from 'zod';

import {
  buildStaffingGrid,
  findFreeEmployees,
  findStaffingConflicts,
  shiftDate,
  type StaffingCalendar,
} from './staffing';
import {
  PROJECT_WARNING_TYPES,
  evaluateProjectHealth,
  projectWarningTypeSchema,
  type ProjectWarningType,
} from './projectHealth';
import { CREDENTIAL_EXPIRING_DAYS, credentialDaysLeft } from './credentials';
import { projectStatusSchema, type ProjectStatus } from './projects';
import { warrantyDaysLeft } from './warranty';
import { periodStart } from './workSummary';

// 홈 대시보드와 알림 (서비스 기획서 §15.2, §15.3). 알림은 저장하지 않고 대시보드를 열 때 기록을 보고 계산한다
// (초기: 화면 표시). 4단계에서 보증 종료 임박·미처리 보수·보증서·직원 서류 만료·월 공수 미확정이 더해졌다
const dateSchema = z.iso.date();

export const ALERT_KINDS = [
  'NO_LOG_TODAY',
  'INBOX_STALE',
  'BURN_REACHED',
  'BURN_AHEAD',
  'PROJECT_OVERDUE',
  'DOUBLE_ASSIGNED',
  'CHANGE_STALE',
  'WARRANTY_ENDING',
  'REPAIR_UNHANDLED',
  'CERTIFICATE_EXPIRING',
  'CREDENTIAL_EXPIRING',
  'MONTH_UNCLOSED',
] as const;

export const alertKindSchema = z.enum(ALERT_KINDS);

export type AlertKind = z.infer<typeof alertKindSchema>;

export const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  NO_LOG_TODAY: '오늘 투입된 프로젝트에 작업 내역이 없을 때',
  INBOX_STALE: '메모함에 메모가 3일 넘게 쌓여 있을 때',
  BURN_REACHED: '공수 소진율이 80%·100%에 도달했을 때',
  BURN_AHEAD: '진행률보다 공수가 빨리 소진될 때',
  PROJECT_OVERDUE: '종료 예정일이 지났는데 끝나지 않았을 때',
  DOUBLE_ASSIGNED: '이번 주에 같은 날 두 프로젝트에 겹쳐 투입됐을 때',
  CHANGE_STALE: '협의 중인 변경·추가 작업이 7일 넘게 남았을 때',
  WARRANTY_ENDING: '보증 종료가 60일 안으로 다가왔을 때',
  REPAIR_UNHANDLED: '접수한 보수 요청이 3일 넘게 처리되지 않을 때',
  CERTIFICATE_EXPIRING: '보증서 만료가 30일 안으로 다가왔을 때',
  CREDENTIAL_EXPIRING: '직원 서류·자격 만료가 30일 안으로 다가왔을 때',
  MONTH_UNCLOSED: '지난달에 저장한 작업 내역이 있는데 월 공수를 확정하지 않았을 때',
};

// 메모함·협의 중 변경 작업을 오래 방치된 것으로 보는 기준 (§15.3)
export const INBOX_STALE_DAYS = 3;

export const CHANGE_STALE_DAYS = 7;

// 보증 종료 임박(60일), 접수 후 방치된 보수 요청(3일), 보증서 만료 임박(30일) 기준 (§15.3). 직원 서류는 CREDENTIAL_EXPIRING_DAYS
export const WARRANTY_ENDING_DAYS = 60;

export const REPAIR_UNHANDLED_DAYS = 3;

export const CERTIFICATE_EXPIRING_DAYS = 30;

// 만료 임박 위젯에 보여 줄 최대 개수
export const EXPIRING_LIMIT = 20;

export const alertSettingsSchema = z.object({
  items: z.array(z.object({ kind: alertKindSchema, enabled: z.boolean() })),
});

export type AlertSettings = z.infer<typeof alertSettingsSchema>;

// 보낸 종류만 바꾼다 (같은 종류가 두 번 있으면 거부)
export const alertSettingsUpdateSchema = z
  .object({ items: alertSettingsSchema.shape.items.min(1, '바꿀 알림을 선택해 주세요') })
  .refine((value) => new Set(value.items.map((item) => item.kind)).size === value.items.length, {
    message: '같은 알림이 두 번 들어 있습니다',
    path: ['items'],
  });

export type AlertSettingsUpdate = z.infer<typeof alertSettingsUpdateSchema>;

export const dashboardAlertSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('NO_LOG_TODAY'), projectId: z.uuid(), projectName: z.string() }),
  z.object({
    kind: z.literal('INBOX_STALE'),
    count: z.number().int(),
    oldestDays: z.number().int(),
  }),
  z.object({
    kind: z.literal('BURN_REACHED'),
    projectId: z.uuid(),
    projectName: z.string(),
    level: z.enum(['WARN', 'LIMIT']),
    burnPercent: z.number(),
  }),
  z.object({
    kind: z.literal('BURN_AHEAD'),
    projectId: z.uuid(),
    projectName: z.string(),
    burnPercent: z.number(),
    progressPercent: z.number().int(),
  }),
  z.object({
    kind: z.literal('PROJECT_OVERDUE'),
    projectId: z.uuid(),
    projectName: z.string(),
    plannedEnd: dateSchema,
    daysLate: z.number().int(),
  }),
  z.object({
    kind: z.literal('DOUBLE_ASSIGNED'),
    employeeId: z.uuid(),
    employeeName: z.string(),
    dateCount: z.number().int(),
    firstDate: dateSchema,
  }),
  z.object({
    kind: z.literal('CHANGE_STALE'),
    projectId: z.uuid(),
    projectName: z.string(),
    changeWorkId: z.uuid(),
    seq: z.number().int(),
    days: z.number().int(),
  }),
  z.object({
    kind: z.literal('WARRANTY_ENDING'),
    projectId: z.uuid(),
    projectName: z.string(),
    endOn: dateSchema,
    // 종료 예정일까지 남은 일수 (지났으면 음수)
    daysLeft: z.number().int(),
  }),
  z.object({
    kind: z.literal('REPAIR_UNHANDLED'),
    projectId: z.uuid(),
    projectName: z.string(),
    repairId: z.uuid(),
    seq: z.number().int(),
    days: z.number().int(),
  }),
  z.object({
    kind: z.literal('CERTIFICATE_EXPIRING'),
    projectId: z.uuid(),
    projectName: z.string(),
    title: z.string(),
    expiresOn: dateSchema,
    daysLeft: z.number().int(),
  }),
  z.object({
    kind: z.literal('CREDENTIAL_EXPIRING'),
    employeeId: z.uuid(),
    employeeName: z.string(),
    typeName: z.string(),
    expiresOn: dateSchema,
    daysLeft: z.number().int(),
  }),
  z.object({ kind: z.literal('MONTH_UNCLOSED'), month: z.string() }),
]);

export type DashboardAlert = z.infer<typeof dashboardAlertSchema>;

const dashboardProjectSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  status: projectStatusSchema,
  progressPercent: z.number().int().nullable(),
  // 공수 소진율(%): 계획이 없으면 null
  burnPercent: z.number().nullable(),
  warnings: z.array(projectWarningTypeSchema),
});

export type DashboardProject = z.infer<typeof dashboardProjectSchema>;

export const dashboardSchema = z.object({
  today: dateSchema,
  alerts: z.array(dashboardAlertSchema),
  // 오늘 투입: 진행 중 프로젝트에 오늘 나가는 사람과 작업 내역 입력 여부
  todayAssignments: z.object({
    headcount: z.number().int(),
    projects: z.array(
      z.object({
        projectId: z.uuid(),
        code: z.string(),
        name: z.string(),
        headcount: z.number().int(),
        hasLog: z.boolean(),
      }),
    ),
  }),
  projectCounts: z.object({
    planned: z.number().int(),
    inProgress: z.number().int(),
    suspended: z.number().int(),
  }),
  // 예정·진행·중단 프로젝트 (경고가 있는 것이 먼저)
  activeProjects: z.array(dashboardProjectSchema),
  // 위험 프로젝트: 공수 소진·일정 경고가 있는 프로젝트
  risks: z.array(dashboardProjectSchema),
  week: z.object({
    from: dateSchema,
    to: dateSchema,
    conflicts: z.array(
      z.object({ employeeId: z.uuid(), name: z.string(), dateCount: z.number().int() }),
    ),
    freeCount: z.number().int(),
    freeNames: z.array(z.string()),
  }),
  todos: z.object({
    draftLogCount: z.number().int(),
    staleInboxCount: z.number().int(),
    // 저장한 작업 내역이 있는데 확정하지 않은 지난달 (없으면 null)
    unclosedMonth: z.string().nullable(),
  }),
  // 보증 종료 임박: 보증 중 프로젝트 (종료 예정일이 가까운 순)와 처리하지 않은(접수·처리 중) 보수 요청 건수
  warranty: z.object({
    ending: z.array(
      z.object({
        projectId: z.uuid(),
        code: z.string(),
        name: z.string(),
        endOn: dateSchema,
        daysLeft: z.number().int(),
      }),
    ),
    openRepairCount: z.number().int(),
  }),
  // 만료 임박: 보증서와 직원 서류 (이미 만료된 것 포함, 만료가 빠른 순)
  expiring: z.object({
    certificates: z.array(
      z.object({
        projectId: z.uuid(),
        projectName: z.string(),
        title: z.string(),
        expiresOn: dateSchema,
        daysLeft: z.number().int(),
      }),
    ),
    credentials: z.array(
      z.object({
        employeeId: z.uuid(),
        employeeName: z.string(),
        typeName: z.string(),
        expiresOn: dateSchema,
        daysLeft: z.number().int(),
      }),
    ),
  }),
});

export type Dashboard = z.infer<typeof dashboardSchema>;

export const dashboardResponseSchema = z.object({
  dashboard: dashboardSchema,
  // 알림 설정에서 켜 둔 종류만 alerts에 들어 있다
  settings: alertSettingsSchema,
});

export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;

export const FREE_NAMES_LIMIT = 5;

export const DASHBOARD_PROJECT_LIMIT = 30;

type RawProject = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  plannedStart: string;
  plannedEnd: string;
  // 계획 공수(분): 계획이 하나도 없으면 null. 투입 공수(분): 저장된 작업 내역의 공수 합
  plannedMinutes: number | null;
  usedMinutes: number;
  progressPercent: number | null;
  progressRecordedOn: string | null;
};

export type DashboardInput = {
  today: string;
  // 예정·진행·중단 프로젝트
  projects: readonly RawProject[];
  // 진행 중 프로젝트에 오늘 투입되는 재직 직원 (프로젝트·직원)
  todayAssignments: readonly { projectId: string; employeeId: string }[];
  // 오늘 저장된 작업 내역이 있는 프로젝트
  todayLogProjectIds: readonly string[];
  // 메모함에서 3일 넘게 방치된 메모: 건수와 가장 오래된 것의 경과일
  staleInbox: { count: number; oldestDays: number };
  draftLogCount: number;
  // 이번 주(월~일) 인력 배치
  calendar: StaffingCalendar;
  // 협의 중인 변경·추가 작업
  negotiatingChanges: readonly {
    id: string;
    projectId: string;
    seq: number;
    statusChangedOn: string;
  }[];
  // 보증 중 프로젝트 (종료 예정일이 있는 것만)
  warrantyProjects: readonly { id: string; code: string; name: string; endOn: string }[];
  // 접수·처리 중인 보수 요청 (접수 상태만 방치 알림 대상)
  openRepairs: readonly {
    id: string;
    projectId: string;
    projectName: string;
    seq: number;
    receivedOn: string;
    status: 'RECEIVED' | 'IN_PROGRESS';
  }[];
  // 지우지 않은 보증서와 재직 직원의 서류 중 만료일이 있는 것
  certificates: readonly {
    projectId: string;
    projectName: string;
    title: string;
    expiresOn: string;
  }[];
  credentials: readonly {
    employeeId: string;
    employeeName: string;
    typeName: string;
    expiresOn: string;
  }[];
  // 저장한 작업 내역이 있는데 확정하지 않은 지난달 (없으면 null)
  unclosedMonth: string | null;
  // 켜 둔 알림 종류
  enabled: ReadonlySet<AlertKind>;
};

/**
 * @description 오늘이 속한 달의 전달 (YYYY-MM)
 * @param today 오늘(서울 기준)
 * @returns 지난달
 */
export const previousMonth = (today: string) => {
  const [year, month] = today.split('-').map(Number) as [number, number];

  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
};

const daysBetween = (from: string, to: string) =>
  Math.max(
    0,
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000),
  );

// 위험 프로젝트로 보는 경고
const RISK_WARNINGS: ProjectWarningType[] = [...PROJECT_WARNING_TYPES];

/**
 * @description 이번 주의 월요일~일요일
 * @param today 오늘(서울 기준)
 * @returns 이번 주 시작·끝 날짜
 */
export const weekRange = (today: string) => {
  const from = periodStart(today, 'week');

  return { from, to: shiftDate(from, 6) };
};

/**
 * @description 모아 온 기록으로 홈 대시보드를 만든다 (서버와 목업이 같은 규칙을 쓰도록 순수 함수로 둠)
 * 위젯은 지금 기록으로 만들 수 있는 것만 담고, 알림은 켜 둔 종류만 담는다
 * @param input 프로젝트·투입·작업 내역·메모함·배치·변경 작업 현황과 켜 둔 알림 종류
 * @returns 대시보드
 */
export const assembleDashboard = (input: DashboardInput): Dashboard => {
  const names = new Map(input.projects.map((project) => [project.id, project]));
  const health = new Map(
    input.projects.map((project) => [
      project.id,
      evaluateProjectHealth({
        status: project.status,
        plannedMinutes: project.plannedMinutes,
        usedMinutes: project.usedMinutes,
        progressPercent: project.progressPercent,
        progressRecordedOn: project.progressRecordedOn,
        plannedStart: project.plannedStart,
        plannedEnd: project.plannedEnd,
        today: input.today,
      }),
    ]),
  );
  const toDashboardProject = (project: RawProject): DashboardProject => {
    const item = health.get(project.id)!;

    return {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      progressPercent: project.progressPercent,
      burnPercent: item.burnPercent,
      warnings: item.warnings,
    };
  };
  const projects = input.projects
    .map(toDashboardProject)
    .sort((a, b) => b.warnings.length - a.warnings.length || a.code.localeCompare(b.code));
  const risks = projects.filter((project) =>
    project.warnings.some((warning) => RISK_WARNINGS.includes(warning)),
  );

  // 오늘 투입
  const perProject = new Map<string, Set<string>>();

  for (const item of input.todayAssignments) {
    if (names.has(item.projectId)) {
      (
        perProject.get(item.projectId) ??
        perProject.set(item.projectId, new Set()).get(item.projectId)!
      ).add(item.employeeId);
    }
  }

  const logged = new Set(input.todayLogProjectIds);
  const todayProjects = [...perProject.entries()]
    .map(([projectId, employees]) => {
      const project = names.get(projectId)!;

      return {
        projectId,
        code: project.code,
        name: project.name,
        headcount: employees.size,
        hasLog: logged.has(projectId),
      };
    })
    .sort((a, b) => Number(a.hasLog) - Number(b.hasLog) || a.code.localeCompare(b.code));

  // 이번 주 인력
  const rows = buildStaffingGrid(input.calendar);
  const conflicts = findStaffingConflicts(rows);
  const free = findFreeEmployees(rows);

  // 알림 (켜 둔 종류만)
  const alerts: DashboardAlert[] = [];
  const on = (kind: AlertKind) => input.enabled.has(kind);

  if (on('NO_LOG_TODAY')) {
    for (const project of todayProjects.filter((item) => !item.hasLog)) {
      alerts.push({
        kind: 'NO_LOG_TODAY',
        projectId: project.projectId,
        projectName: project.name,
      });
    }
  }

  if (on('INBOX_STALE') && input.staleInbox.count > 0) {
    alerts.push({
      kind: 'INBOX_STALE',
      count: input.staleInbox.count,
      oldestDays: input.staleInbox.oldestDays,
    });
  }

  for (const project of projects) {
    const raw = names.get(project.id)!;
    const item = health.get(project.id)!;

    if (on('BURN_REACHED') && item.burnPercent !== null) {
      if (item.warnings.includes('BURN_LIMIT')) {
        alerts.push({
          kind: 'BURN_REACHED',
          projectId: project.id,
          projectName: project.name,
          level: 'LIMIT',
          burnPercent: item.burnPercent,
        });
      } else if (item.warnings.includes('BURN_WARN')) {
        alerts.push({
          kind: 'BURN_REACHED',
          projectId: project.id,
          projectName: project.name,
          level: 'WARN',
          burnPercent: item.burnPercent,
        });
      }
    }

    if (
      on('BURN_AHEAD') &&
      item.warnings.includes('BURN_AHEAD') &&
      item.burnPercent !== null &&
      item.progressPercent !== null
    ) {
      alerts.push({
        kind: 'BURN_AHEAD',
        projectId: project.id,
        projectName: project.name,
        burnPercent: item.burnPercent,
        progressPercent: item.progressPercent,
      });
    }

    if (on('PROJECT_OVERDUE') && item.warnings.includes('OVERDUE')) {
      alerts.push({
        kind: 'PROJECT_OVERDUE',
        projectId: project.id,
        projectName: project.name,
        plannedEnd: raw.plannedEnd,
        daysLate: daysBetween(raw.plannedEnd, input.today),
      });
    }
  }

  if (on('DOUBLE_ASSIGNED')) {
    for (const conflict of conflicts) {
      alerts.push({
        kind: 'DOUBLE_ASSIGNED',
        employeeId: conflict.employee.id,
        employeeName: conflict.employee.name,
        dateCount: conflict.dates.length,
        firstDate: conflict.dates[0]!,
      });
    }
  }

  if (on('CHANGE_STALE')) {
    for (const change of input.negotiatingChanges) {
      const days = daysBetween(change.statusChangedOn, input.today);
      const project = names.get(change.projectId);

      if (days >= CHANGE_STALE_DAYS && project) {
        alerts.push({
          kind: 'CHANGE_STALE',
          projectId: project.id,
          projectName: project.name,
          changeWorkId: change.id,
          seq: change.seq,
          days,
        });
      }
    }
  }

  // 보증·보수·만료 임박 (지난 것은 음수 일수로 남겨 계속 알림)
  const warrantyEnding = input.warrantyProjects
    .map((project) => ({
      projectId: project.id,
      code: project.code,
      name: project.name,
      endOn: project.endOn,
      daysLeft: warrantyDaysLeft(project.endOn, input.today),
    }))
    .filter((item) => item.daysLeft <= WARRANTY_ENDING_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft || a.code.localeCompare(b.code));
  const unhandled = input.openRepairs
    .filter((repair) => repair.status === 'RECEIVED')
    .map((repair) => ({ ...repair, days: daysBetween(repair.receivedOn, input.today) }))
    .filter((repair) => repair.days >= REPAIR_UNHANDLED_DAYS)
    .sort((a, b) => b.days - a.days || a.seq - b.seq);
  const expiringCertificates = input.certificates
    .map((item) => ({ ...item, daysLeft: warrantyDaysLeft(item.expiresOn, input.today) }))
    .filter((item) => item.daysLeft <= CERTIFICATE_EXPIRING_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft || a.title.localeCompare(b.title));
  const expiringCredentials = input.credentials
    .map((item) => ({
      ...item,
      daysLeft: credentialDaysLeft(item.expiresOn, input.today)!,
    }))
    .filter((item) => item.daysLeft <= CREDENTIAL_EXPIRING_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft || a.employeeName.localeCompare(b.employeeName));

  if (on('WARRANTY_ENDING')) {
    for (const item of warrantyEnding) {
      alerts.push({
        kind: 'WARRANTY_ENDING',
        projectId: item.projectId,
        projectName: item.name,
        endOn: item.endOn,
        daysLeft: item.daysLeft,
      });
    }
  }

  if (on('REPAIR_UNHANDLED')) {
    for (const repair of unhandled) {
      alerts.push({
        kind: 'REPAIR_UNHANDLED',
        projectId: repair.projectId,
        projectName: repair.projectName,
        repairId: repair.id,
        seq: repair.seq,
        days: repair.days,
      });
    }
  }

  if (on('CERTIFICATE_EXPIRING')) {
    for (const item of expiringCertificates) {
      alerts.push({
        kind: 'CERTIFICATE_EXPIRING',
        projectId: item.projectId,
        projectName: item.projectName,
        title: item.title,
        expiresOn: item.expiresOn,
        daysLeft: item.daysLeft,
      });
    }
  }

  if (on('CREDENTIAL_EXPIRING')) {
    for (const item of expiringCredentials) {
      alerts.push({
        kind: 'CREDENTIAL_EXPIRING',
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        typeName: item.typeName,
        expiresOn: item.expiresOn,
        daysLeft: item.daysLeft,
      });
    }
  }

  if (on('MONTH_UNCLOSED') && input.unclosedMonth) {
    alerts.push({ kind: 'MONTH_UNCLOSED', month: input.unclosedMonth });
  }

  const week = weekRange(input.today);

  return {
    today: input.today,
    alerts,
    todayAssignments: {
      headcount: new Set(
        input.todayAssignments
          .filter((item) => names.has(item.projectId))
          .map((item) => item.employeeId),
      ).size,
      projects: todayProjects,
    },
    projectCounts: {
      planned: input.projects.filter((project) => project.status === 'PLANNED').length,
      inProgress: input.projects.filter((project) => project.status === 'IN_PROGRESS').length,
      suspended: input.projects.filter((project) => project.status === 'SUSPENDED').length,
    },
    activeProjects: projects.slice(0, DASHBOARD_PROJECT_LIMIT),
    risks: risks.slice(0, DASHBOARD_PROJECT_LIMIT),
    week: {
      ...week,
      conflicts: conflicts.map((item) => ({
        employeeId: item.employee.id,
        name: item.employee.name,
        dateCount: item.dates.length,
      })),
      freeCount: free.length,
      freeNames: free.slice(0, FREE_NAMES_LIMIT).map((employee) => employee.name),
    },
    todos: {
      draftLogCount: input.draftLogCount,
      staleInboxCount: input.staleInbox.count,
      unclosedMonth: input.unclosedMonth,
    },
    warranty: {
      ending: warrantyEnding.slice(0, EXPIRING_LIMIT),
      openRepairCount: input.openRepairs.length,
    },
    expiring: {
      certificates: expiringCertificates.slice(0, EXPIRING_LIMIT).map((item) => ({
        projectId: item.projectId,
        projectName: item.projectName,
        title: item.title,
        expiresOn: item.expiresOn,
        daysLeft: item.daysLeft,
      })),
      credentials: expiringCredentials.slice(0, EXPIRING_LIMIT),
    },
  };
};

/**
 * @description 알림을 화면에 보여 줄 문장으로 바꾼다
 * @param alert 알림
 * @returns 안내 문장
 */
export const dashboardAlertMessage = (alert: DashboardAlert): string => {
  switch (alert.kind) {
    case 'NO_LOG_TODAY':
      return `${alert.projectName}: 오늘 투입됐는데 작업 내역이 아직 없습니다`;
    case 'INBOX_STALE':
      return `${INBOX_STALE_DAYS}일 넘게 쌓인 메모가 ${alert.count}건 있습니다 (가장 오래된 것 ${alert.oldestDays}일째)`;
    case 'BURN_REACHED':
      return alert.level === 'LIMIT'
        ? `${alert.projectName}: 공수 소진율이 ${Math.round(alert.burnPercent)}%로 계획을 넘었습니다`
        : `${alert.projectName}: 공수 소진율이 ${Math.round(alert.burnPercent)}%에 도달했습니다`;
    case 'BURN_AHEAD':
      return `${alert.projectName}: 공수 소진율 ${Math.round(alert.burnPercent)}%가 진행률 ${alert.progressPercent}%보다 빠릅니다`;
    case 'PROJECT_OVERDUE':
      return `${alert.projectName}: 종료 예정일(${alert.plannedEnd})이 ${alert.daysLate}일 지났는데 끝나지 않았습니다`;
    case 'DOUBLE_ASSIGNED':
      return `${alert.employeeName}: 이번 주 ${alert.dateCount}일이 두 프로젝트에 겹쳐 투입됐습니다 (${alert.firstDate}부터)`;
    case 'CHANGE_STALE':
      return `${alert.projectName}: 변경·추가 작업 #${alert.seq}이 ${alert.days}일째 협의 중입니다`;
    case 'WARRANTY_ENDING':
      return alert.daysLeft < 0
        ? `${alert.projectName}: 보증 종료 예정일(${alert.endOn})이 ${-alert.daysLeft}일 지났습니다`
        : alert.daysLeft === 0
          ? `${alert.projectName}: 오늘 보증이 끝납니다`
          : `${alert.projectName}: 보증 종료까지 ${alert.daysLeft}일 남았습니다 (${alert.endOn})`;
    case 'REPAIR_UNHANDLED':
      return `${alert.projectName}: 보수 요청 #${alert.seq}이 접수 후 ${alert.days}일째 처리되지 않았습니다`;
    case 'CERTIFICATE_EXPIRING':
      return alert.daysLeft < 0
        ? `${alert.projectName}: 보증서 '${alert.title}'이 ${-alert.daysLeft}일 전에 만료됐습니다`
        : `${alert.projectName}: 보증서 '${alert.title}' 만료가 ${alert.daysLeft}일 남았습니다 (${alert.expiresOn})`;
    case 'CREDENTIAL_EXPIRING':
      return alert.daysLeft < 0
        ? `${alert.employeeName}: ${alert.typeName}이(가) ${-alert.daysLeft}일 전에 만료됐습니다`
        : `${alert.employeeName}: ${alert.typeName} 만료가 ${alert.daysLeft}일 남았습니다 (${alert.expiresOn})`;
    case 'MONTH_UNCLOSED':
      return `${alert.month} 월 공수가 아직 확정되지 않았습니다`;
  }
};

/**
 * @description 알림에서 이동할 화면 주소
 * @param alert 알림
 * @returns 앱 안의 경로
 */
export const dashboardAlertPath = (alert: DashboardAlert): string => {
  switch (alert.kind) {
    case 'NO_LOG_TODAY':
      // 프로젝트의 작업 내역 목록(맨 위에 오늘 작업 입력)
      return `/projects/${alert.projectId}`;
    case 'INBOX_STALE':
      return '/inbox';
    case 'BURN_REACHED':
    case 'BURN_AHEAD':
    case 'PROJECT_OVERDUE':
      return `/projects/${alert.projectId}/overview`;
    case 'DOUBLE_ASSIGNED':
      return '/staffing';
    case 'CHANGE_STALE':
      return `/projects/${alert.projectId}/change-works`;
    case 'WARRANTY_ENDING':
    case 'CERTIFICATE_EXPIRING':
      return `/projects/${alert.projectId}/warranty`;
    case 'REPAIR_UNHANDLED':
      return `/projects/${alert.projectId}/repairs`;
    case 'CREDENTIAL_EXPIRING':
      return `/employees/${alert.employeeId}`;
    case 'MONTH_UNCLOSED':
      return `/monthly-hours?month=${alert.month}`;
  }
};
