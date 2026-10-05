import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button } from './button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: '저장', onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '저장' }));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Danger: Story = { args: { variant: 'danger', children: '삭제' } };

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button')).toBeDisabled();
  },
};

// 터치 영역 최소 44px 확인
export const TouchTarget: Story = {
  play: async ({ canvasElement }) => {
    const { height } = within(canvasElement).getByRole('button').getBoundingClientRect();

    await expect(height).toBeGreaterThanOrEqual(44);
  },
};

export const LongText: Story = {
  args: { children: '아주 긴 이름의 프로젝트 현장 작업일지를 한 번에 저장하기' },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
};
