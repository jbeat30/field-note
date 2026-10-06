import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { signIn } from '../mocks/state';

import { VerifyEmailPage } from './VerifyEmailPage';

const meta = {
  title: 'Pages/이메일 인증',
  component: VerifyEmailPage,
  parameters: { router: { initialEntries: ['/verify-email'], path: '/verify-email' } },
} satisfies Meta<typeof VerifyEmailPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 이메일 인증 전 계정으로 로그인된 상태에서 시작
const loggedIn = { loaders: [() => signIn('newbie')] };

export const Default: Story = {
  ...loggedIn,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('newbie@example.com')).toBeInTheDocument();
    // 재발송은 대기 시간이 지나야 가능
    await expect(canvas.getByRole('button', { name: /코드 다시 받기/ })).toBeDisabled();
  },
};

export const WrongCode: Story = {
  ...loggedIn,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText('인증 코드'), '000000');
    await userEvent.click(canvas.getByRole('button', { name: '인증하고 가입 완료' }));

    await expect(
      await canvas.findByText('인증 코드가 올바르지 않거나 만료되었습니다'),
    ).toBeInTheDocument();
  },
};

export const InvalidFormat: Story = {
  ...loggedIn,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText('인증 코드'), '12ab');
    await userEvent.click(canvas.getByRole('button', { name: '인증하고 가입 완료' }));

    await expect(await canvas.findByText('6자리 숫자를 입력해 주세요')).toBeInTheDocument();
  },
};

export const Verified: Story = {
  ...loggedIn,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText('인증 코드'), '123456');
    await userEvent.click(canvas.getByRole('button', { name: '인증하고 가입 완료' }));

    await waitFor(() => expect(canvas.getByTestId('navigated')).toBeInTheDocument());
  },
};

// 로그인하지 않은 상태로 오면 로그인 화면으로 보냄
export const NotLoggedIn: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(within(canvasElement).getByTestId('navigated')).toBeInTheDocument());
  },
};
