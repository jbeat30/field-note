import type { DashboardAlertItem } from '@field-note/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AlertList } from './AlertList';

const ID = '0198d000-0000-7000-8000-0000000000a1';
const TODAY = '2026-10-11';

const noLog = (count: number): DashboardAlertItem[] =>
  Array.from({ length: count }, (_, index) => ({
    key: `NO_LOG_TODAY|${ID}${index}|${TODAY}`,
    urgent: true,
    alert: { kind: 'NO_LOG_TODAY', projectId: ID, projectName: `프로젝트 ${index + 1}` },
  }));

const month: DashboardAlertItem = {
  key: 'MONTH_UNCLOSED|2026-09',
  urgent: false,
  alert: { kind: 'MONTH_UNCLOSED', month: '2026-09' },
};

const meta = {
  title: 'Dashboard/알림 목록',
  component: AlertList,
  args: { today: TODAY, onDismiss: fn() },
} satisfies Meta<typeof AlertList>;

export default meta;

type Story = StoryObj<typeof meta>;

// 단독 줄은 제목과 설명 두 줄, 이동은 프로젝트 작업 화면으로
export const UrgentAndNormal: Story = {
  args: { alerts: [...noLog(1), month] },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('프로젝트 1')).toBeInTheDocument();
    await expect(canvas.getByText('오늘 투입됐는데 작업 내역이 아직 없습니다')).toBeInTheDocument();
    await expect(canvas.getByText(/2026-09.*확정/)).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: /프로젝트 1.*이동/ })).toHaveAttribute(
      'href',
      `/projects/${ID}/work/${TODAY}`,
    );

    await userEvent.click(canvas.getByRole('button', { name: /프로젝트 1.*숨기기/ }));
    await expect(args.onDismiss).toHaveBeenCalledWith([`NO_LOG_TODAY|${ID}0|${TODAY}`]);
  },
};

// 같은 종류가 3건을 넘으면 한 줄로 묶고 펼치면 하나씩 표시, 묶음 숨기기는 키 전체 전송
export const Grouped: Story = {
  args: { alerts: noLog(5) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('오늘 작업 내역이 없는 프로젝트 5건')).toBeInTheDocument();
    await expect(
      canvas.queryByText(/프로젝트 1.*작업 내역이 아직 없습니다/),
    ).not.toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: /펼치기/ }));
    await expect(canvas.getAllByText(/작업 내역이 아직 없습니다/)).toHaveLength(5);

    await userEvent.click(canvas.getByRole('button', { name: /5건 숨기기/ }));
    await expect(args.onDismiss).toHaveBeenCalledWith(noLog(5).map((item) => item.key));
  },
};

export const LimitedToFive: Story = {
  args: { alerts: noLog(8), limit: 5 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText(/작업 내역이 아직 없습니다/)).toHaveLength(5);
  },
};
