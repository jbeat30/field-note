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

// 되돌리기 버튼이 있는 안내: 누르면 동작이 실행되고 안내가 닫힘
export const WithUndo: Story = {
  render: () => {
    const calls: string[] = [];

    return (
      <>
        <Button
          onClick={() =>
            toast('삭제했습니다', 'info', { label: '되돌리기', onClick: () => calls.push('undo') })
          }
        >
          삭제
        </Button>
        <Toaster />
      </>
    );
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '삭제' }));
    await userEvent.click(await screen.findByRole('button', { name: '되돌리기' }));
    await expect(screen.queryByText('삭제했습니다')).not.toBeInTheDocument();
  },
};
