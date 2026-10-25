import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { useThemeStore } from '../stores/themeStore';

import { ThemeSwitch } from './ThemeSwitch';

const meta = {
  title: 'Layout/ThemeSwitch',
  component: ThemeSwitch,
  beforeEach: () => useThemeStore.getState().setMode('light'),
} satisfies Meta<typeof ThemeSwitch>;

export default meta;

type Story = StoryObj<typeof meta>;

// 달 칸을 누르면 어두운 화면, 해 칸을 누르면 다시 밝은 화면
export const Switching: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('radio', { name: '밝은 화면' })).toBeChecked();
    await userEvent.click(canvas.getByRole('radio', { name: '어두운 화면' }));
    await expect(canvas.getByRole('radio', { name: '어두운 화면' })).toBeChecked();
    await userEvent.click(canvas.getByRole('radio', { name: '밝은 화면' }));
    await expect(canvas.getByRole('radio', { name: '밝은 화면' })).toBeChecked();
  },
};
