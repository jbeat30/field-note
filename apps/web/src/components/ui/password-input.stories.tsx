import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { PasswordInput } from './password-input';

const meta = {
  title: 'UI/PasswordInput',
  component: PasswordInput,
  args: { 'aria-label': '비밀번호' },
} satisfies Meta<typeof PasswordInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('비밀번호');

    await userEvent.type(input, 'Secret-pass-2026!');
    await expect(input).toHaveAttribute('type', 'password');

    const show = canvas.getByRole('button', { name: '비밀번호 보기' });

    await expect(show).toHaveAttribute('aria-pressed', 'false');
    await expect(show.getBoundingClientRect().height).toBeGreaterThanOrEqual(40);

    // 버튼으로 입력 중인 값을 보고, 다시 눌러 숨김 (입력 값과 포커스 흐름은 그대로)
    await userEvent.click(show);
    await expect(input).toHaveAttribute('type', 'text');
    await expect(input).toHaveValue('Secret-pass-2026!');

    const hide = canvas.getByRole('button', { name: '비밀번호 숨기기' });

    await expect(hide).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(hide);
    await expect(input).toHaveAttribute('type', 'password');
  },
};

export const WithError: Story = {
  args: { 'aria-invalid': true },
};

export const Disabled: Story = {
  args: { disabled: true },
};
