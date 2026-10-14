import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, screen, userEvent, within } from 'storybook/test';

import { PeriodNav } from './period-nav';

const onPick = fn();

const Example = () => {
  const [week, setWeek] = useState(0);

  return (
    <PeriodNav
      label={`2026-10-${12 + week * 7} ~ 2026-10-${18 + week * 7}`}
      prevLabel="이전 주"
      nextLabel="다음 주"
      onPrev={() => setWeek((value) => value - 1)}
      onNext={() => setWeek((value) => value + 1)}
      todayLabel="이번 주"
      onToday={() => setWeek(0)}
      pickValue="2026-10-12"
      onPick={onPick}
    />
  );
};

const meta = {
  title: 'UI/PeriodNav',
  component: PeriodNav,
  args: {
    label: '',
    prevLabel: '',
    nextLabel: '',
    onPrev: () => {},
    onNext: () => {},
    todayLabel: '',
    onToday: () => {},
  },
  render: () => <Example />,
} satisfies Meta<typeof PeriodNav>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MoveAndReturn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '다음 주' }));
    await expect(canvas.getByText('2026-10-19 ~ 2026-10-25')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '이번 주' }));
    await expect(canvas.getByText('2026-10-12 ~ 2026-10-18')).toBeInTheDocument();
  },
};

// 가운데 기간을 누르면 달력이 열리고 날짜를 고르면 그 날짜가 전달됨
export const PickFromCalendar: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /달력에서 이동/ }));
    await userEvent.click(await screen.findByRole('button', { name: /2026년 10월 21일/ }));
    await expect(onPick).toHaveBeenCalledWith('2026-10-21');
  },
};
