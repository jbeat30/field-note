import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Pagination, pageWindow } from './pagination';

const Example = ({ pageCount }: { pageCount: number }) => {
  const [page, setPage] = useState(1);

  return (
    <div>
      <p aria-live="polite">현재 {page}쪽</p>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
};

const meta = {
  title: 'UI/Pagination',
  component: Pagination,
  args: { page: 1, pageCount: 1, onPageChange: () => {} },
  render: () => <Example pageCount={9} />,
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Navigate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('button', { name: '이전 쪽' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: '다음 쪽' }));
    await expect(canvas.getByText('현재 2쪽')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '9쪽' }));
    await expect(canvas.getByRole('button', { name: '다음 쪽' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: '9쪽' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};

// 한 쪽뿐이면 아무것도 그리지 않음
export const SinglePage: Story = {
  render: () => <Example pageCount={1} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('navigation')).toBeNull();
  },
};

export const WindowFunction: Story = {
  render: () => <p>쪽 번호 계산</p>,
  play: async () => {
    await expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    await expect(pageWindow(5, 12)).toEqual([1, null, 4, 5, 6, null, 12]);
    await expect(pageWindow(2, 12)).toEqual([1, 2, 3, null, 12]);
  },
};
