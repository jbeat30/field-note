import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { BackLink } from './back-link';

const meta = {
  title: 'UI/BackLink',
  component: BackLink,
  args: { to: '/projects', children: '프로젝트 목록' },
} satisfies Meta<typeof BackLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: '프로젝트 목록' });

    await expect(link).toHaveAttribute('href', '/projects');
    await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

export const LongLabel: Story = {
  args: { children: '2026-001 A동 외장 판금 공사 현장 프로젝트 이름이 아주 긴 경우' },
};
