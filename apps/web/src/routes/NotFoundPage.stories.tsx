import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { NotFoundPage } from './NotFoundPage';

const meta = {
  title: 'Pages/없는 페이지',
  component: NotFoundPage,
  parameters: { router: { initialEntries: ['/없는-주소'], path: '*' } },
} satisfies Meta<typeof NotFoundPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 안내 문구와 대시보드로 가는 링크, 이전 화면 버튼
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: '찾는 페이지가 없어요' })).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: '대시보드로' })).toHaveAttribute('href', '/');
    await expect(canvas.getByRole('button', { name: '이전 화면' })).toBeInTheDocument();
  },
};
