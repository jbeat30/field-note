import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { MaterialUsageForm } from './MaterialUsageForm';

const meta = {
  title: 'Materials/사용한 자재 기록',
  component: MaterialUsageForm,
  args: {
    projectId: DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id,
    defaultDate: '2026-09-10',
    minDate: '2026-07-15',
    maxDate: '2026-10-14',
  },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof MaterialUsageForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// 빈 줄을 늘리고 지울 수 있고, 한 줄만 남으면 지우기가 꺼진다
export const AddAndRemoveRows: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('button', { name: '1번 줄 지우기' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: /줄 추가/ }));
    await expect(canvas.getByLabelText('2번 줄 품명')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '2번 줄 지우기' }));
    await expect(canvas.queryByLabelText('2번 줄 품명')).not.toBeInTheDocument();
  },
};

// 하루 기록 화면처럼 날짜가 정해진 곳에서는 날짜 칸이 없다
export const FixedDate: Story = {
  args: { fixedDate: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByLabelText('자재 쓴 날')).not.toBeInTheDocument();
  },
};
