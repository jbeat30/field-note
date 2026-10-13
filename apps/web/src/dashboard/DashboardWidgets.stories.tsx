import type { Dashboard } from '@field-note/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { DashboardWidgets } from './DashboardWidgets';

const ID = '0198d000-0000-7000-8000-0000000000a1';

const dashboard = (alertCount: number): Dashboard => ({
  today: '2026-10-11',
  alerts: Array.from({ length: alertCount }, (_, index) => ({
    kind: 'NO_LOG_TODAY' as const,
    projectId: ID,
    projectName: `프로젝트 ${index + 1}`,
  })),
  todayAssignments: { headcount: 0, projects: [] },
  projectCounts: { planned: 0, inProgress: 0, suspended: 0 },
  activeProjects: [],
  risks: [],
  week: { from: '2026-10-05', to: '2026-10-11', conflicts: [], freeCount: 0, freeNames: [] },
  todos: { draftLogCount: 0, staleInboxCount: 0, unclosedMonth: null },
  warranty: { ending: [], openRepairCount: 0 },
  expiring: { certificates: [], credentials: [] },
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
    await expect(canvas.getByText('오늘 투입된 프로젝트가 없습니다')).toBeInTheDocument();
    await expect(
      canvas.getByText('공수 소진이나 일정이 걱정되는 프로젝트가 없습니다'),
    ).toBeInTheDocument();
  },
};

// 알림이 많으면 처음 5건만 보여 주고 나머지는 펼쳐서 본다
export const ManyAlertsCollapsed: Story = {
  args: { dashboard: dashboard(12) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alerts = within(canvas.getByRole('region', { name: '알림' }));

    await expect(alerts.getAllByText(/작업 내역이 아직 없습니다/)).toHaveLength(5);
    await userEvent.click(alerts.getByRole('button', { name: '알림 7건 더 보기' }));
    await expect(alerts.getAllByText(/작업 내역이 아직 없습니다/)).toHaveLength(12);
    await userEvent.click(alerts.getByRole('button', { name: '알림 접기' }));
    await expect(alerts.getAllByText(/작업 내역이 아직 없습니다/)).toHaveLength(5);
  },
};

export const FewAlertsNoToggle: Story = {
  args: { dashboard: dashboard(3) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getAllByText(/작업 내역이 아직 없습니다/)).toHaveLength(3);
    await expect(canvas.queryByRole('button', { name: /더 보기/ })).not.toBeInTheDocument();
  },
};

export const WarrantyAndExpiring: Story = {
  args: {
    dashboard: {
      ...dashboard(0),
      todos: { draftLogCount: 0, staleInboxCount: 0, unclosedMonth: '2026-09' },
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
    await expect(canvas.getByRole('link', { name: '2026-09 월 공수 확정 전' })).toHaveAttribute(
      'href',
      '/monthly-hours?month=2026-09',
    );
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
    await expect(canvas.getByText('확정하지 않은 지난달 월 공수 없음')).toBeInTheDocument();
  },
};
