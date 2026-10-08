import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BeforeAfterView } from './BeforeAfterView';
import { groupBeforeAfter } from './photoCompare';
import { storyPhoto } from './storyData';

const meta = {
  title: 'Photos/작업 전후 비교',
  component: BeforeAfterView,
  args: {
    onSelect: fn(),
    groups: groupBeforeAfter([
      storyPhoto(1, 'BEFORE', '3층 301호'),
      storyPhoto(2, 'AFTER', '3층 301호'),
      storyPhoto(3, 'BEFORE', '3층 302호'),
      storyPhoto(4, 'BEFORE', null),
    ]),
  },
} satisfies Meta<typeof BeforeAfterView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: '3층 301호' })).toBeInTheDocument();
    // 아직 찍지 않은 쪽(302호의 작업 후)은 안내 문구
    await expect(canvas.getAllByText('아직 사진이 없습니다').length).toBeGreaterThanOrEqual(2);
    await expect(canvas.getByRole('heading', { name: '구역 없음' })).toBeInTheDocument();

    await userEvent.click(canvas.getAllByRole('button', { name: /작업 전/ })[0]!);
    await expect(args.onSelect).toHaveBeenCalled();
  },
};

export const Empty: Story = {
  args: { groups: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/작업 전·작업 후 사진이 아직 없습니다/),
    ).toBeInTheDocument();
  },
};
