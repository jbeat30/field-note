import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { LoadingBlock } from './loading-block';

const meta = { title: 'UI/LoadingBlock', component: LoadingBlock } satisfies Meta<
  typeof LoadingBlock
>;

export default meta;

type Story = StoryObj<typeof meta>;

// 눈에는 막대만 보이고 스크린 리더에는 안내 글이 전달됨
export const Default: Story = {
  args: { label: '프로젝트를 불러오는 중' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('status')).toHaveTextContent('프로젝트를 불러오는 중');
  },
};

export const ManyLines: Story = {
  args: { label: '명부를 불러오는 중', lines: 6 },
};
