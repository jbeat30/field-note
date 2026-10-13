import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { MaterialUsageList } from './MaterialUsageList';
import { storyMaterial, storyRecord } from './storyData';

const door = storyMaterial(1, { name: '철문', spec: '900×2100 1.6T 백색', unit: '개' });
const cover = storyMaterial(2, { name: '샷시 커버 판금', spec: 'L=3000 0.8T 아연', unit: '개' });
const silicone = storyMaterial(3, { name: '실리콘', unit: '통' });

const meta = {
  title: 'Materials/사용한 자재 목록',
  component: MaterialUsageList,
  args: {
    materials: [door, cover, silicone],
    records: [
      storyRecord(1, { materialId: door.id, quantity: 2, area: '3층 301호' }),
      storyRecord(2, { materialId: cover.id, quantity: 12, memo: '외벽 북측' }),
      storyRecord(3, { materialId: silicone.id, recordDate: '2026-10-06', quantity: 3 }),
      // 예전에 남긴 반입 기록은 구분 표시가 붙는다
      storyRecord(4, { materialId: silicone.id, recordDate: '2026-10-06', kind: 'RECEIVED' }),
    ],
    onDelete: fn(),
  },
} satisfies Meta<typeof MaterialUsageList>;

export default meta;

type Story = StoryObj<typeof meta>;

// 날짜별로 묶이고(최근 먼저) 품명·규격·수량·단위·위치가 한 줄에 보인다
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const day = within(canvas.getByRole('region', { name: '10월 7일 (수) 자재' }));

    await expect(day.getByText('900×2100 1.6T 백색')).toBeInTheDocument();
    await expect(day.getByText('3층 301호')).toBeInTheDocument();
    await expect(canvas.getByText('반입')).toBeInTheDocument();

    await userEvent.click(day.getByRole('button', { name: '철문 기록 지우기' }));
    await expect(args.onDelete).toHaveBeenCalledWith(args.records[0]);
  },
};
