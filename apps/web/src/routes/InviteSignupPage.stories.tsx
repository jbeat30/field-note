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

    // 필수 약관과 만 14세 확인만으로 진행 가능
    await expect(canvas.getByRole('button', { name: '다음' })).toBeEnabled();
  },
};

export const ViewTermsInDialog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '이용약관 보기' }));

    // 새 탭이나 화면 이동 없이 같은 화면의 창에서 전문을 보여 주고, 긴 문서는 창 안에서 스크롤됨
    const dialog = within(await within(document.body).findByRole('dialog', { name: '이용약관' }));
    const body = dialog.getByRole('region', { name: '이용약관 전문' });

    await expect(dialog.getByText('제1조 (목적)')).toBeInTheDocument();
    await expect(body.className).toContain('overflow-y-auto');
    await expect(canvas.queryByRole('link', { name: '보기' })).not.toBeInTheDocument();

    // 모서리 X와 아래 닫기 두 곳 모두 같은 이름이라 아래 버튼을 누름
    const closeButtons = dialog.getAllByRole('button', { name: '닫기' });

    await userEvent.click(closeButtons[closeButtons.length - 1]!);
    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(),
    );
    // 가입 화면과 입력 상태는 그대로
    await expect(canvas.getByRole('checkbox', { name: '전체 동의' })).toBeInTheDocument();
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

export const SocialSignupOptions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await goToAccountStep(canvasElement);

    await expect(await canvas.findByRole('button', { name: '카카오로 가입' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '구글로 가입' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '네이버로 가입' })).toBeInTheDocument();
    await expect(
      canvas.getByText(/이메일 등록과 아이디·비밀번호 설정은 가입 뒤에/),
    ).toBeInTheDocument();
  },
};

// 계정 복구 링크는 기존 로그인이 해제된다는 안내를 함께 표시
export const RecoveryLink: Story = {
  parameters: {
    router: { initialEntries: ['/invite/demo-recovery-0001'], path: '/invite/:token' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/계정 복구 링크입니다/)).toBeInTheDocument();
    await expect(canvas.getByText(/기존 로그인은 모두 해제됩니다/)).toBeInTheDocument();
  },
};

// 소유자 이전 링크는 새 소유자 이름으로 안내
export const TransferLink: Story = {
  parameters: {
    router: { initialEntries: ['/invite/demo-transfer-0001'], path: '/invite/:token' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/새소유자님을 위한 초대입니다/)).toBeInTheDocument();
    await expect(canvas.getByText(/소유자 이전 링크입니다/)).toBeInTheDocument();
  },
};
