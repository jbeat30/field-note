import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { MOCK_TOTP_CODE } from '../mocks/data';
import { handlers } from '../mocks/handlers';
import { findAccount, getCurrentAccount, saveMockTotp, startClosure } from '../mocks/state';

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

export const WithSocialButtons: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('button', { name: '카카오로 로그인' }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '네이버로 로그인' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '구글로 로그인' })).toBeInTheDocument();
  },
};

// 소셜 로그인 화면에서 돌아온 결과 안내 (주소의 ?social= 값)
export const SocialNotLinked: Story = {
  parameters: { router: { initialEntries: ['/login?social=not-linked'], path: '/login' } },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent(
      '연결된 계정이 없습니다',
    );
  },
};

export const SocialCancelled: Story = {
  parameters: { router: { initialEntries: ['/login?social=cancelled'], path: '/login' } },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('취소했습니다');
  },
};

// 알 수 없는 값은 안내하지 않음
export const UnknownSocialResult: Story = {
  parameters: { router: { initialEntries: ['/login?social=%3Cscript%3E'], path: '/login' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('button', { name: '카카오로 로그인' }, { timeout: 3000 });
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

// 해지 요청 중인 계정은 비밀번호가 맞아도 로그인되지 않고 해지 상태를 안내
export const ClosingAccount: Story = {
  loaders: [() => startClosure(findAccount('hanbit')!, '2026-10-20T00:00:00.000Z')],
  play: async ({ canvasElement }) => {
    const canvas = await fillAndSubmit(canvasElement, 'hanbit', 'Hanbit-demo-2026!');

    await expect(await canvas.findByRole('alert')).toHaveTextContent('해지 요청 중인 계정');
    await expect(getCurrentAccount()).toBeUndefined();
  },
};

export const SocialClosing: Story = {
  parameters: { router: { initialEntries: ['/login?social=closing'], path: '/login' } },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent(
      '해지 요청 중인 계정',
    );
  },
};

// 2단계 인증을 켠 계정: 비밀번호가 맞으면 인증 코드 칸이 열리고, 코드가 맞아야 로그인됨
const withTotp = {
  loaders: [
    () => {
      saveMockTotp(findAccount('hanbit')!, { isEnabled: true, recoveryCodes: ['ABCDE-FGHJK'] });
    },
  ],
};

export const TotpRequired: Story = {
  ...withTotp,
  play: async ({ canvasElement }) => {
    const canvas = await fillAndSubmit(canvasElement, 'hanbit', 'Hanbit-demo-2026!');

    await expect(await canvas.findByLabelText('인증 코드')).toBeInTheDocument();
    await expect(canvas.getByText(/2단계 인증이 켜진 계정입니다/)).toBeInTheDocument();
    // 코드를 받기 전에는 로그인되지 않음
    await expect(getCurrentAccount()).toBeUndefined();
  },
};

export const TotpWrongCode: Story = {
  ...withTotp,
  play: async ({ canvasElement }) => {
    const canvas = await fillAndSubmit(canvasElement, 'hanbit', 'Hanbit-demo-2026!');

    await userEvent.type(await canvas.findByLabelText('인증 코드'), '000000');
    await userEvent.click(canvas.getByRole('button', { name: '로그인' }));
    await expect(await canvas.findByText(/인증 코드가 올바르지 않습니다/)).toBeInTheDocument();
    await expect(getCurrentAccount()).toBeUndefined();
  },
};

export const TotpSuccess: Story = {
  ...withTotp,
  play: async ({ canvasElement }) => {
    const canvas = await fillAndSubmit(canvasElement, 'hanbit', 'Hanbit-demo-2026!');

    await userEvent.type(await canvas.findByLabelText('인증 코드'), MOCK_TOTP_CODE);
    await userEvent.click(canvas.getByRole('button', { name: '로그인' }));
    await waitFor(() => expect(canvas.getByTestId('navigated')).toBeInTheDocument());
  },
};

export const TotpRecoveryCode: Story = {
  ...withTotp,
  play: async ({ canvasElement }) => {
    const canvas = await fillAndSubmit(canvasElement, 'hanbit', 'Hanbit-demo-2026!');

    await userEvent.type(await canvas.findByLabelText('인증 코드'), 'abcde-fghjk');
    await userEvent.click(canvas.getByRole('button', { name: '로그인' }));
    await waitFor(() => expect(canvas.getByTestId('navigated')).toBeInTheDocument());
  },
};

// 서버가 시연 계정 안내를 켠 경우: 가상 데이터 안내와 계정이 보이고 한 번에 채울 수 있음
export const DemoNotice: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/public/demo', () =>
          HttpResponse.json({ enabled: true, loginId: 'tester', password: 'Visit-Demo-2026!' }),
        ),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('시연용 체험 환경입니다')).toBeInTheDocument();
    await expect(canvas.getByText(/모두 가상의 데이터/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '이 계정으로 채우기' }));
    await expect(canvas.getByLabelText('아이디')).toHaveValue('tester');
    await expect(canvas.getByLabelText('비밀번호')).toHaveValue('Visit-Demo-2026!');
  },
};

// 안내가 꺼져 있으면 시연 문구가 보이지 않음
export const NoDemoNoticeByDefault: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('button', { name: '로그인' })).toBeInTheDocument();
    await expect(canvas.queryByText('시연용 체험 환경입니다')).not.toBeInTheDocument();
  },
};
