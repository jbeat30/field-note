import type { Dashboard } from '@field-note/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { DashboardWidgets } from './DashboardWidgets';

const ID = '0198d000-0000-7000-8000-0000000000a1';

const noLog = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    key: `NO_LOG_TODAY|${ID}-${index}|2026-10-11`,
    urgent: true,
    alert: {
      kind: 'NO_LOG_TODAY' as const,
      projectId: ID,
      projectName: `프로젝트 ${index + 1}`,
    },
  }));

const dashboard = (alertCount: number): Dashboard => ({
  today: '2026-10-11',
  alerts: noLog(alertCount),
  hiddenAlertCount: 0,
  stats: { inProgress: 0, todayLoggedHeadcount: 0, todayHeadcount: 0, weekMinutes: 0 },
  todayAssignments: { headcount: 0, projects: [] },
  projectCounts: { planned: 0, inProgress: 0, suspended: 0 },
  activeProjects: [],
  risks: [],
  week: { from: '2026-10-05', to: '2026-10-11', conflicts: [], workingCount: 0, idleCount: 0 },
  todos: { draftLogCount: 0, unclosedMonth: null },
  warranty: { ending: [], openRepairCount: 0 },
  expiring: { certificates: [], credentials: [] },
});

const project = (index: number, patch: Partial<Dashboard['activeProjects'][number]> = {}) => ({
  id: `0198d000-0000-7000-8000-00000000010${index}`,
  code: `2026-00${index}`,
  name: `${String.fromCharCode(64 + index)}동 판금 공사`,
  siteName: `${index}번 현장`,
  status: 'IN_PROGRESS' as const,
  plannedEnd: '2026-10-31',
  hasLogToday: false,
  weekMinutes: 960,
  progressPercent: 40 + index * 10,
  burnPercent: 50,
  warnings: [],
  ...patch,
});

const meta = {
  title: 'Dashboard/위젯',
  component: DashboardWidgets,
} satisfies Meta<typeof DashboardWidgets>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoAlerts: Story = {
  args: { dashboard: dashboard(0) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('지금 확인할 알림이 없습니다')).toBeInTheDocument();
    await expect(canvas.getByText('진행·예정·중단 중인 프로젝트가 없습니다')).toBeInTheDocument();
  },
};

// 수치 줄과 진행 중 프로젝트 표: 오늘 기록이 없으면 기록하기, 지난 종료일은 붉게
export const StatsAndProjects: Story = {
  args: {
    dashboard: {
      ...dashboard(1),
      stats: { inProgress: 2, todayLoggedHeadcount: 1, todayHeadcount: 3, weekMinutes: 2430 },
      activeProjects: [
        project(1, { hasLogToday: true }),
        project(2, { plannedEnd: '2026-10-08', warnings: ['OVERDUE'] }),
        project(3, { status: 'PLANNED', progressPercent: null }),
      ],
      todos: { draftLogCount: 2, unclosedMonth: null },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('1 / 3')).toBeInTheDocument();
    await expect(canvas.getByText('40.5')).toBeInTheDocument();
    await expect(canvas.getByText('임시 저장 작업 내역 2건')).toBeInTheDocument();

    const table = within(canvas.getByRole('table', { name: '진행 중 프로젝트' }));

    await expect(table.getByText('3일 지남')).toBeInTheDocument();
    await expect(table.getByText('기록함')).toBeInTheDocument();
    await expect(table.getByRole('link', { name: 'B동 판금 공사 오늘 기록하기' })).toHaveAttribute(
      'href',
      '/projects/0198d000-0000-7000-8000-000000000102/work/2026-10-11',
    );
  },
};

// 홈에는 알림 5건만 표시하고 나머지는 알림 창으로 안내
export const ManyAlertsCollapsed: Story = {
  args: { dashboard: dashboard(12) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alerts = within(canvas.getByRole('region', { name: '확인할 일' }));

    await expect(alerts.getAllByText(/작업 내역이 아직 없습니다/)).toHaveLength(5);
    await expect(alerts.getByText(/알림 7건이 더 있습니다/)).toBeInTheDocument();
  },
};

export const FewAlerts: Story = {
  args: { dashboard: dashboard(3) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getAllByText(/작업 내역이 아직 없습니다/)).toHaveLength(3);
    await expect(canvas.getAllByRole('link', { name: /이동/ })).toHaveLength(3);
    await expect(canvas.getAllByRole('button', { name: /숨기기/ })).toHaveLength(3);
  },
};

export const WarrantyAndExpiring: Story = {
  args: {
    dashboard: {
      ...dashboard(0),
      warranty: {
        ending: [
          {
            projectId: ID,
            code: '2026-001',
            name: 'A동 판금 공사',
            endOn: '2026-10-15',
            daysLeft: 4,
          },
          { projectId: ID, code: '2026-002', name: 'B동 덕트', endOn: '2026-12-01', daysLeft: 51 },
        ],
        openRepairCount: 2,
      },
      expiring: {
        certificates: [
          {
            projectId: ID,
            projectName: 'A동 판금 공사',
            title: '보증증권',
            expiresOn: '2026-10-25',
            daysLeft: 14,
          },
        ],
        credentials: [
          {
            employeeId: ID,
            employeeName: '정판금',
            typeName: '건강검진',
            expiresOn: '2026-09-30',
            daysLeft: -11,
          },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const warranty = within(canvas.getByRole('region', { name: '보증 종료 임박' }));

    await expect(warranty.getByText('처리하지 않은 보수 요청 2건')).toBeInTheDocument();
    await expect(warranty.getByText(/4일 남음 \(2026-10-15\)/)).toBeInTheDocument();

    const expiring = within(canvas.getByRole('region', { name: '만료 임박' }));

    await expect(expiring.getByText(/보증서 보증증권 · A동 판금 공사/)).toBeInTheDocument();
    await expect(expiring.getByText(/11일 지남 \(2026-09-30\)/)).toBeInTheDocument();
  },
};

export const NothingExpiring: Story = {
  args: { dashboard: dashboard(0) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText('60일 안에 보증이 끝나는 프로젝트가 없습니다'),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText('30일 안에 만료되는 보증서·직원 서류가 없습니다'),
    ).toBeInTheDocument();
  },
};
