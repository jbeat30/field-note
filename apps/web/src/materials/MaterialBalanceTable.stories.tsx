import type { MaterialBalanceItem } from '@field-note/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { MaterialBalanceTable } from './MaterialBalanceTable';

const item = (patch: Partial<MaterialBalanceItem>): MaterialBalanceItem => ({
  materialId: '0198d000-0000-7000-8000-000000000501',
  name: '아연도강판',
  spec: '1.0T',
  unit: '장',
  received: 100,
  used: 72,
  returned: 10,
  discarded: 3,
  remaining: 15,
  isNegative: false,
  usedForChange: 0,
  usedForAfterService: 0,
  ...patch,
});

const meta = {
  title: 'Materials/자재 현황',
  component: MaterialBalanceTable,
  args: { items: [item({})] },
} satisfies Meta<typeof MaterialBalanceTable>;

export default meta;

type Story = StoryObj<typeof meta>;

// 서비스 기획서 예시: 반입 100, 사용 72, 반출 10, 폐기 3 → 잔량 15장
export const Example: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText('아연도강판 잔량')).toHaveTextContent('잔량 15장');
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const NegativeWarns: Story = {
  args: {
    items: [
      item({
        name: '실리콘 코킹',
        spec: null,
        unit: '개',
        received: 5,
        used: 8,
        returned: 0,
        discarded: 0,
        remaining: -3,
        isNegative: true,
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('alert')).toHaveTextContent('반입 기록이 빠졌는지 확인');
    await expect(canvas.getByLabelText('실리콘 코킹 잔량')).toHaveTextContent('잔량 -3개');
  },
};

export const ChangeAndAfterService: Story = {
  args: { items: [item({ usedForChange: 32, usedForAfterService: 4 })] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/변경·추가 작업에 32장 · 사후 작업에 4장/),
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { items: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('아직 자재 기록이 없습니다')).toBeInTheDocument();
  },
};
