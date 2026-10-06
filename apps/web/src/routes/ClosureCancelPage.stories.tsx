import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { MOCK_CLOSURE_TOKEN } from '../mocks/data';
import { findAccount, startClosure } from '../mocks/state';

import { ClosureCancelPage } from './ClosureCancelPage';

const meta = {
  title: 'Pages/해지 취소',
  component: ClosureCancelPage,
  parameters: {
    router: {
      initialEntries: [`/closure/cancel/${MOCK_CLOSURE_TOKEN}`],
      path: '/closure/cancel/:token',
    },
  },
  // 해지를 요청한 상태에서 시작 (링크는 해지 요청 뒤부터 유효)
  loaders: [() => startClosure(findAccount('hanbit')!, '2026-10-20T00:00:00.000Z')],
} satisfies Meta<typeof ClosureCancelPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('heading', { name: '해지를 취소할까요' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/2026년 10월 20일/)).toBeInTheDocument();
  },
};

export const InvalidLink: Story = {
  parameters: {
    router: {
      initialEntries: ['/closure/cancel/expired-token-0001'],
      path: '/closure/cancel/:token',
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: '링크를 사용할 수 없습니다' }),
    ).toBeInTheDocument();
  },
};

export const Cancelled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '해지 취소' }));

    await expect(
      await canvas.findByRole('heading', { name: '해지를 취소했습니다' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(findAccount('hanbit')?.closingPurgeAfter).toBeUndefined());
  },
};
