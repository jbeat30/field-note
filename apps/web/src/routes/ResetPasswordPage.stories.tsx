import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { MOCK_TOTP_CODE } from '../mocks/data';
import { findAccount, requestMockReset, saveMockTotp } from '../mocks/state';

import { ResetPasswordPage } from './ResetPasswordPage';

const meta = {
  title: 'Pages/새 비밀번호 설정',
  component: ResetPasswordPage,
  parameters: {
    router: {
      initialEntries: ['/reset-password/demo-reset-token-0001'],
      path: '/reset-password/:token',
    },
  },
} satisfies Meta<typeof ResetPasswordPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: '새 비밀번호 설정' }),
    ).toBeInTheDocument();
  },
};

export const InvalidLink: Story = {
  parameters: {
    router: {
      initialEntries: ['/reset-password/expired-reset-0001'],
      path: '/reset-password/:token',
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: '링크를 사용할 수 없습니다' }),
    ).toBeInTheDocument();
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      await canvas.findByLabelText('새 비밀번호', { selector: 'input' }),
      'short',
    );
    await userEvent.type(canvas.getByLabelText('새 비밀번호 확인'), 'different');
    await userEvent.click(canvas.getByRole('button', { name: '비밀번호 바꾸기' }));

    await expect(await canvas.findByText('비밀번호가 일치하지 않습니다')).toBeInTheDocument();
    await expect(canvas.getByText('10자 이상')).toBeInTheDocument();
  },
};

export const Completed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      await canvas.findByLabelText('새 비밀번호', { selector: 'input' }),
      'Brand-new-2026!',
    );
    await userEvent.type(canvas.getByLabelText('새 비밀번호 확인'), 'Brand-new-2026!');
    await userEvent.click(canvas.getByRole('button', { name: '비밀번호 바꾸기' }));

    await expect(
      await canvas.findByRole('heading', { name: '비밀번호를 바꿨습니다' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/모든 기기에서 로그아웃/)).toBeInTheDocument();
  },
};

// 2단계 인증을 켠 계정의 링크: 인증 코드가 있어야 비밀번호를 바꿀 수 있음
export const RequiresTotp: Story = {
  loaders: [
    () => {
      saveMockTotp(findAccount('hanbit')!, { isEnabled: true, recoveryCodes: [] });
      requestMockReset('hanbit');
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [password, confirm] = await canvas.findAllByLabelText(/새 비밀번호/, {
      selector: 'input',
    });

    await userEvent.type(password!, 'Brand-new-2026!');
    await userEvent.type(confirm!, 'Brand-new-2026!');
    await userEvent.type(await canvas.findByLabelText('인증 코드'), '000000');
    await userEvent.click(canvas.getByRole('button', { name: '비밀번호 바꾸기' }));
    await expect(await canvas.findByText(/인증 코드가 올바르지 않습니다/)).toBeInTheDocument();

    await userEvent.clear(canvas.getByLabelText('인증 코드'));
    await userEvent.type(canvas.getByLabelText('인증 코드'), MOCK_TOTP_CODE);
    await userEvent.click(canvas.getByRole('button', { name: '비밀번호 바꾸기' }));
    await expect(
      await canvas.findByRole('heading', { name: '비밀번호를 바꿨습니다' }),
    ).toBeInTheDocument();
  },
};
