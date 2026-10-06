import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { InviteSignupPage } from './InviteSignupPage';

const meta = {
  title: 'Pages/초대 가입',
  component: InviteSignupPage,
  parameters: { router: { initialEntries: ['/invite/demo-invite-0001'], path: '/invite/:token' } },
} satisfies Meta<typeof InviteSignupPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const goToAccountStep = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);

  await userEvent.click(await canvas.findByRole('checkbox', { name: '전체 동의' }));
  await userEvent.click(canvas.getByRole('button', { name: '다음' }));
  await canvas.findByRole('heading', { name: '계정 만들기' });

  return canvas;
};

export const Consent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', { name: '미래설비' })).toBeInTheDocument();
    // 필수 약관과 만 14세 확인 전에는 다음 단계로 갈 수 없음
    await expect(canvas.getByRole('button', { name: '다음' })).toBeDisabled();
  },
};

export const OnlyRequiredAgreed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('checkbox', { name: /이용약관/ }));
    await userEvent.click(canvas.getByRole('checkbox', { name: /개인정보 수집·이용 동의/ }));
    await userEvent.click(canvas.getByRole('checkbox', { name: /만 14세 이상/ }));

    // 선택 약관(마케팅)은 동의하지 않아도 진행 가능
    await expect(canvas.getByRole('button', { name: '다음' })).toBeEnabled();
  },
};

export const InvalidLink: Story = {
  parameters: {
    router: { initialEntries: ['/invite/expired-invite-0001'], path: '/invite/:token' },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: '초대 링크를 사용할 수 없습니다' }),
    ).toBeInTheDocument();
  },
};

export const AccountStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await goToAccountStep(canvasElement);

    await expect(canvas.getByLabelText('아이디')).toBeInTheDocument();
  },
};

export const InvalidAccountInput: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await goToAccountStep(canvasElement);

    await userEvent.type(canvas.getByLabelText('아이디'), 'AB');
    await userEvent.type(canvas.getByLabelText('비밀번호'), 'short');
    await userEvent.type(canvas.getByLabelText('비밀번호 확인'), 'different');
    await userEvent.type(canvas.getByLabelText('이메일'), 'not-an-email');
    await userEvent.click(canvas.getByRole('button', { name: '가입하고 인증 코드 받기' }));

    await expect(await canvas.findByText('비밀번호가 일치하지 않습니다')).toBeInTheDocument();
    await expect(canvas.getByText('올바른 이메일 주소를 입력해 주세요')).toBeInTheDocument();
  },
};

export const TakenLoginId: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await goToAccountStep(canvasElement);

    await userEvent.type(canvas.getByLabelText('아이디'), 'taken-id');
    await userEvent.type(canvas.getByLabelText('비밀번호'), 'Daon-demo-2026!');
    await userEvent.type(canvas.getByLabelText('비밀번호 확인'), 'Daon-demo-2026!');
    await userEvent.type(canvas.getByLabelText('이메일'), 'daon@example.com');
    await userEvent.click(canvas.getByRole('button', { name: '가입하고 인증 코드 받기' }));

    await expect(await canvas.findByText('이미 사용 중인 아이디입니다')).toBeInTheDocument();
  },
};

// 가입에 성공하면 이메일 인증 화면으로 이동
export const SignupSuccess: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await goToAccountStep(canvasElement);

    await userEvent.type(canvas.getByLabelText('아이디'), 'daon-wood');
    await userEvent.type(canvas.getByLabelText('비밀번호'), 'Daon-demo-2026!');
    await userEvent.type(canvas.getByLabelText('비밀번호 확인'), 'Daon-demo-2026!');
    await userEvent.type(canvas.getByLabelText('이메일'), 'daon@example.com');
    await userEvent.click(canvas.getByRole('button', { name: '가입하고 인증 코드 받기' }));

    await waitFor(() => expect(canvas.getByTestId('navigated')).toBeInTheDocument());
  },
};

export const KakaoSignupOption: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await goToAccountStep(canvasElement);

    await expect(await canvas.findByRole('button', { name: '카카오로 가입' })).toBeInTheDocument();
    await expect(canvas.getByText(/인증된 이메일이 있는 카카오 계정만/)).toBeInTheDocument();
  },
};

export const KakaoEmailRequired: Story = {
  parameters: {
    router: {
      initialEntries: ['/invite/demo-invite-0001?social=email-required'],
      path: '/invite/:token',
    },
  },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent(
      '인증된 이메일이 없는 카카오 계정',
    );
  },
};
