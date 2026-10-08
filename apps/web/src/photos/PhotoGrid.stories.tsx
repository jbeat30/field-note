import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { PhotoGrid } from './PhotoGrid';
import { storyPhoto } from './storyData';

const meta = {
  title: 'Photos/사진 그리드',
  component: PhotoGrid,
  args: {
    onSelect: fn(),
    photos: [
      storyPhoto(1, 'BEFORE', '3층 301호', { isCover: true }),
      storyPhoto(2, 'AFTER', '3층 301호'),
      storyPhoto(3, 'DURING', null),
      storyPhoto(4, 'SAFETY', '옥상'),
    ],
  },
} satisfies Meta<typeof PhotoGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 구분·구역 표시와 대표 표시
    await expect(canvas.getByText('작업 전 · 3층 301호')).toBeInTheDocument();
    await expect(canvas.getByText('대표')).toBeInTheDocument();

    await userEvent.click(canvas.getAllByRole('button')[1]!);
    await expect(args.onSelect).toHaveBeenCalledWith(args.photos[1]);
  },
};

// 검사 중·거부된 사진은 썸네일 대신 안내 문구
export const ProcessingAndRejected: Story = {
  args: {
    photos: [
      storyPhoto(1, 'OTHER', null, {
        thumbnailUrl: null,
        file: { status: 'PROCESSING', rejectReason: null, size: 1 },
      }),
      storyPhoto(2, 'OTHER', null, {
        thumbnailUrl: null,
        file: { status: 'REJECTED', rejectReason: 'CONTENT_MISMATCH', size: 1 },
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('처리 중')).toBeInTheDocument();
    await expect(canvas.getByText('검사에서 거부됨')).toBeInTheDocument();
  },
};

// 사진이 많아도 격자가 깨지지 않음 + 긴 구역 이름은 한 줄로 줄임
export const ManyPhotos: Story = {
  args: {
    photos: Array.from({ length: 60 }, (_, index) =>
      storyPhoto(
        index + 1,
        'DURING',
        index % 5 === 0 ? '아주아주아주 긴 구역 이름이 들어간 사진 구역입니다' : '301호',
      ),
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('button')).toHaveLength(60);
  },
};
