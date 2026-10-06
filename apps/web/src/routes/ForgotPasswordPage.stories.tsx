import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { ForgotPasswordPage } from './ForgotPasswordPage';

const meta = {
  title: 'Pages/비밀번호 재설정 요청',
  component: ForgotPasswordPage,
  parameters: { router: { initialEntries: ['/forgot-password'], path: '/forgot-password' } },
} satisfies Meta<typeof ForgotPasswordPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InvalidEmail: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('이메일'), 'not-an-email');
    await userEvent.click(canvas.getByRole('button', { name: '재설정 링크 받기' }));

    await expect(await canvas.findByText('올바른 이메일 주소를 입력해 주세요')).toBeInTheDocument();
  },
};

// 가입된 주소와 아닌 주소 모두 같은 안내 (계정 존재를 알리지 않음)
export const RegisteredEmail: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('이메일'), 'hanbit@example.com');
    await userEvent.click(canvas.getByRole('button', { name: '재설정 링크 받기' }));

    await expect(await canvas.findByText(/가입된 주소라면/)).toBeInTheDocument();
  },
};

export const UnknownEmail: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('이메일'), 'nobody@example.com');
    await userEvent.click(canvas.getByRole('button', { name: '재설정 링크 받기' }));

    await expect(await canvas.findByText(/가입된 주소라면/)).toBeInTheDocument();
  },
};
