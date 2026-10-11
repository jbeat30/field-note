import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { signIn } from '../mocks/state';

import { StaffingCalendarPage } from './StaffingCalendarPage';

const meta = {
  title: 'Pages/인력 배치 캘린더',
  component: StaffingCalendarPage,
  // 더미 투입(2026-07~11월)이 있는 주로 고정
  parameters: { router: { initialEntries: ['/staffing?from=2026-10-05'], path: '/staffing' } },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof StaffingCalendarPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('2026-10-05 ~ 2026-10-11')).toBeInTheDocument();
    // 정판금은 이 주 내내 2026-001에 투입되어 있다
    await expect(await canvas.findByLabelText(/정판금 2026-10-05 2026-001/)).toHaveAttribute(
      'data-state',
      'ASSIGNED',
    );
    await expect(canvas.getByRole('heading', { name: '같은 날 겹침' })).toBeInTheDocument();
  },
};

export const MoveWeek: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('2026-10-05 ~ 2026-10-11');
    await userEvent.click(canvas.getByRole('button', { name: '다음 주' }));
    await expect(await canvas.findByText('2026-10-12 ~ 2026-10-18')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '이전 주' }));
    await expect(await canvas.findByText('2026-10-05 ~ 2026-10-11')).toBeInTheDocument();
  },
};
