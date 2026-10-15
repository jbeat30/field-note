import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { addAccount, signIn } from '../mocks/state';

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

// 소셜 로그인으로 가입해 이메일이 아직 없는 계정은 먼저 이메일을 입력
export const EmailEntryForSocialSignup: Story = {
  loaders: [
    () => {
      addAccount({
        loginId: 'naver-new',
        password: '',
        hasPassword: false,
        socialProfiles: { naver: 'new-verified' },
        displayName: '소셜 가입자',
        email: '',
        isEmailVerified: false,
        companyName: '새회사',
        settings: { standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
      });
      signIn('naver-new');
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', { name: '이메일 등록' })).toBeInTheDocument();
    await userEvent.type(canvas.getByLabelText('이메일'), 'new-owner@example.com');
    await userEvent.click(canvas.getByRole('button', { name: '인증 코드 받기' }));

    await expect(await canvas.findByText('new-owner@example.com')).toBeInTheDocument();
    await expect(canvas.getByLabelText('인증 코드')).toBeInTheDocument();
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
