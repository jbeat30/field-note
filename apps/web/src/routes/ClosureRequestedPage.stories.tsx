import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ClosureRequestedPage } from './ClosureRequestedPage';

const meta = {
  title: 'Pages/해지 요청 완료',
  component: ClosureRequestedPage,
  parameters: {
    router: {
      initialEntries: [
        { pathname: '/closure/requested', state: { purgeAfter: '2026-10-20T00:00:00.000Z' } },
      ],
      path: '/closure/requested',
    },
  },
} satisfies Meta<typeof ClosureRequestedPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('heading', { name: '해지를 요청했습니다' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/2026년 10월 20일/)).toBeInTheDocument();
  },
};

// 새로고침 등으로 날짜 정보가 없어도 안내는 보임
export const WithoutDate: Story = {
  parameters: { router: { initialEntries: ['/closure/requested'], path: '/closure/requested' } },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: '해지를 요청했습니다' }),
    ).toBeInTheDocument();
  },
};
