import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';

import { resetToastStore, toast } from '../../stores/toastStore';

import { Button } from './button';
import { Toaster } from './toaster';

const meta = {
  title: 'UI/Toast',
  component: Toaster,
  beforeEach: () => resetToastStore(),
  render: () => (
    <>
      <Button onClick={() => toast('저장했습니다', 'success')}>저장</Button>
      <Toaster />
    </>
  ),
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '저장' }));
    await expect(await screen.findByText('저장했습니다')).toBeVisible();
  },
};
