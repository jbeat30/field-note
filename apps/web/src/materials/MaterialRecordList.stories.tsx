import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { MaterialRecordList } from './MaterialRecordList';
import { storyMaterial, storyRecord } from './storyData';

const zinc = storyMaterial(1, { name: '아연도강판', spec: '1.0T' });

const meta = {
  title: 'Materials/자재 기록 목록',
  component: MaterialRecordList,
  args: {
    materials: [zinc],
    onChangeQuantity: fn(),
    onDelete: fn(),
    records: [
      storyRecord(1, { quantity: 12.5, area: '3층 301호', isChange: true }),
      storyRecord(2, {
        kind: 'RECEIVED',
        quantity: 100,
        recordDate: '2026-10-05',
        memo: '1차 반입',
      }),
    ],
  },
} satisfies Meta<typeof MaterialRecordList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('사용 12.5장')).toBeInTheDocument();
    await expect(canvas.getByText('3층 301호 · 변경·추가 작업')).toBeInTheDocument();
  },
};

export const WithDates: Story = {
  args: { showDates: true },
  play: async ({ canvasElement }) => {
    const headings = within(canvasElement)
      .getAllByRole('heading', { level: 3 })
      .map((item) => item.textContent);

    await expect(headings).toEqual(['10월 7일 (수)', '10월 5일 (월)']);
  },
};

export const EditQuantity: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getAllByRole('button', { name: '수량 수정' })[0]!);
    await userEvent.clear(canvas.getByLabelText('수량 수정'));
    await userEvent.type(canvas.getByLabelText('수량 수정'), '8');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(args.onChangeQuantity).toHaveBeenCalledWith(args.records[0], 8);
  },
};

export const InvalidEditDisablesSave: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getAllByRole('button', { name: '수량 수정' })[0]!);
    await userEvent.clear(canvas.getByLabelText('수량 수정'));
    await userEvent.type(canvas.getByLabelText('수량 수정'), '0');

    await expect(canvas.getByRole('button', { name: '저장' })).toBeDisabled();
  },
};

export const DeleteNeedsConfirm: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getAllByRole('button', { name: '삭제' })[0]!);
    await expect(args.onDelete).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: '정말 삭제' }));
    await expect(args.onDelete).toHaveBeenCalledWith(args.records[0]);
  },
};

// 목록에서 사라진 자재의 기록도 보임
export const UnknownMaterial: Story = {
  args: { materials: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText('(삭제된 자재)')).toHaveLength(2);
  },
};
