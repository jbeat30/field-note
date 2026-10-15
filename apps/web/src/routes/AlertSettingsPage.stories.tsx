import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { signIn } from '../mocks/state';

import { AlertSettingsPage } from './AlertSettingsPage';

const meta = {
  title: 'Pages/알림 설정',
  component: AlertSettingsPage,
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof AlertSettingsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const LABEL = '협의 중인 변경·추가 작업이 7일 넘게 남았을 때';

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 설정하지 않은 알림은 모두 켜짐
    await expect(await canvas.findByRole('switch', { name: LABEL })).toBeChecked();
    await expect(canvas.getAllByRole('switch')).toHaveLength(11);
    await expect(
      canvas.getAllByRole('switch').every((box) => box.getAttribute('data-state') === 'checked'),
    ).toBe(true);
  },
};

export const TurnOffOne: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('switch', { name: LABEL }));
    await waitFor(() => expect(canvas.getByRole('switch', { name: LABEL })).not.toBeChecked());
    // 다른 알림은 그대로 켜짐
    await expect(
      canvas.getAllByRole('switch').filter((box) => box.getAttribute('data-state') === 'checked'),
    ).toHaveLength(10);

    // 다시 켬
    await userEvent.click(canvas.getByRole('switch', { name: LABEL }));
    await waitFor(() => expect(canvas.getByRole('switch', { name: LABEL })).toBeChecked());
  },
};
