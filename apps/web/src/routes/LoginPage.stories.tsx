import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { LoginPage } from './LoginPage';

const meta = {
  title: 'Pages/로그인',
  component: LoginPage,
  parameters: { router: { initialEntries: ['/login'], path: '/login' } },
} satisfies Meta<typeof LoginPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const fillAndSubmit = async (canvasElement: HTMLElement, loginId: string, password: string) => {
  const canvas = within(canvasElement);

  await userEvent.type(canvas.getByLabelText('아이디'), loginId);
  await userEvent.type(canvas.getByLabelText('비밀번호'), password);
  await userEvent.click(canvas.getByRole('button', { name: '로그인' }));

  return canvas;
};

export const Default: Story = {};

export const EmptySubmit: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '로그인' }));
    await expect(await canvas.findByText('아이디를 입력해 주세요')).toBeInTheDocument();
    await expect(canvas.getByText('비밀번호를 입력해 주세요')).toBeInTheDocument();
  },
};

export const WrongPassword: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await fillAndSubmit(canvasElement, 'hanbit', 'wrong-password-1');

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      '아이디 또는 비밀번호가 올바르지 않습니다',
    );
  },
};

export const Locked: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await fillAndSubmit(canvasElement, 'locked', 'whatever-password');

    await expect(await canvas.findByRole('alert')).toHaveTextContent('잠시 잠겼습니다');
  },
};

// 성공하면 홈으로 이동 (스토리에서는 이동 후 안내 문구가 보임)
export const Success: Story = {
  play: async ({ canvasElement }) => {
    await fillAndSubmit(canvasElement, 'hanbit', 'Hanbit-demo-2026!');

    await waitFor(() => expect(within(canvasElement).getByTestId('navigated')).toBeInTheDocument());
  },
};

export const LongInput: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('아이디'), 'a'.repeat(60));
    await expect(canvas.getByLabelText('아이디')).toHaveValue('a'.repeat(60));
  },
};
