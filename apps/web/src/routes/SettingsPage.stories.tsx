import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { addAccount, findAccount, setKakaoProfile, signIn } from '../mocks/state';

import { SettingsPage } from './SettingsPage';

const meta = {
  title: 'Pages/설정',
  component: SettingsPage,
  parameters: { router: { initialEntries: ['/settings'], path: '/settings' } },
  // 한빛판금 관리자로 로그인된 상태에서 시작
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof SettingsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByDisplayValue('8')).toBeInTheDocument();
    await expect(canvas.getByLabelText(/월 기준일수/)).toHaveValue(22);
    await expect(canvas.getByRole('radio', { name: /비율/ })).toBeChecked();
    // 변경하기 전에는 저장할 수 없음
    await expect(canvas.getByRole('button', { name: '저장' })).toBeDisabled();
  },
};

export const SaveSettings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const hours = await canvas.findByLabelText(/하루 기준시간/);

    await userEvent.clear(hours);
    await userEvent.type(hours, '7.5');
    await userEvent.click(canvas.getByRole('radio', { name: /시간/ }));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '저장' })).toBeDisabled();
  },
};

export const InvalidInput: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const hours = await canvas.findByLabelText(/하루 기준시간/);

    await userEvent.clear(hours);
    await userEvent.type(hours, '7.3');
    await userEvent.clear(canvas.getByLabelText(/월 기준일수/));
    await userEvent.type(canvas.getByLabelText(/월 기준일수/), '40');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('0.5시간 단위로 입력해 주세요')).toBeInTheDocument();
    await expect(canvas.getByText('31일 이하로 입력해 주세요')).toBeInTheDocument();
  },
};

export const Devices: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('이 기기')).toBeInTheDocument();
    // 현재 기기에는 원격 로그아웃 버튼이 없음
    await expect(
      canvas.queryByRole('button', { name: 'Chrome · macOS 로그아웃' }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getAllByRole('button', { name: /로그아웃$/ }).length,
    ).toBeGreaterThanOrEqual(3);
  },
};

export const RevokeDevice: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: 'Safari · iPhone 로그아웃' }));

    await waitFor(() => expect(canvas.queryByText('Safari · iPhone')).not.toBeInTheDocument());
    await expect(canvas.getByText('Chrome · Android')).toBeInTheDocument();
  },
};

// 로그아웃하면 로그인 화면으로 이동
export const Logout: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '로그아웃' }));

    await waitFor(() => expect(canvas.getByTestId('navigated')).toBeInTheDocument());
  },
};

const fillPasswordChange = async (
  canvas: ReturnType<typeof within>,
  current: string,
  next: string,
  confirm: string,
) => {
  const section = within(await canvas.findByRole('region', { name: '비밀번호 변경' }));

  await userEvent.type(section.getByLabelText('현재 비밀번호'), current);
  await userEvent.type(section.getByLabelText('새 비밀번호', { selector: 'input' }), next);
  await userEvent.type(section.getByLabelText('새 비밀번호 확인'), confirm);
  await userEvent.click(section.getByRole('button', { name: '비밀번호 변경' }));

  return section;
};

export const ChangePassword: Story = {
  play: async ({ canvasElement }) => {
    const section = await fillPasswordChange(
      within(canvasElement),
      'Hanbit-demo-2026!',
      'Changed-2026-pass!',
      'Changed-2026-pass!',
    );

    await expect(await section.findByText(/다른 기기는 로그아웃되었습니다/)).toBeInTheDocument();
  },
};

export const ChangePasswordWrongCurrent: Story = {
  play: async ({ canvasElement }) => {
    const section = await fillPasswordChange(
      within(canvasElement),
      'wrong-password-1',
      'Changed-2026-pass!',
      'Changed-2026-pass!',
    );

    await expect(await section.findByText('현재 비밀번호가 올바르지 않습니다')).toBeInTheDocument();
  },
};

export const ChangePasswordMismatch: Story = {
  play: async ({ canvasElement }) => {
    const section = await fillPasswordChange(
      within(canvasElement),
      'Hanbit-demo-2026!',
      'Changed-2026-pass!',
      'Different-2026-pass!',
    );

    await expect(await section.findByText('비밀번호가 일치하지 않습니다')).toBeInTheDocument();
  },
};

const requestEmailChange = async (
  canvas: ReturnType<typeof within>,
  newEmail: string,
  password: string,
) => {
  const section = within(await canvas.findByRole('region', { name: '이메일 변경' }));

  await userEvent.type(section.getByLabelText('새 이메일'), newEmail);
  await userEvent.type(section.getByLabelText('현재 비밀번호'), password);
  await userEvent.click(section.getByRole('button', { name: '인증 코드 받기' }));

  return section;
};

// 비밀번호 재확인 → 새 주소 코드 확인 → 반영
export const ChangeEmail: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const section = await requestEmailChange(canvas, 'new-hanbit@example.com', 'Hanbit-demo-2026!');

    await expect(await section.findByText('new-hanbit@example.com')).toBeInTheDocument();

    await userEvent.type(section.getByLabelText('인증 코드'), '123456');
    await userEvent.click(section.getByRole('button', { name: '이메일 변경 완료' }));

    await expect(await section.findByText(/이전 주소로 변경 알림/)).toBeInTheDocument();
    await expect(await canvas.findByText('new-hanbit@example.com')).toBeInTheDocument();
  },
};

export const ChangeEmailWrongPassword: Story = {
  play: async ({ canvasElement }) => {
    const section = await requestEmailChange(
      within(canvasElement),
      'new-hanbit@example.com',
      'wrong-password-1',
    );

    await expect(await section.findByText('현재 비밀번호가 올바르지 않습니다')).toBeInTheDocument();
  },
};

export const ChangeEmailAlreadyUsed: Story = {
  play: async ({ canvasElement }) => {
    const section = await requestEmailChange(
      within(canvasElement),
      'saeron@example.com',
      'Hanbit-demo-2026!',
    );

    await expect(await section.findByText(/이미 사용 중이거나/)).toBeInTheDocument();
  },
};

export const ChangeEmailWrongCode: Story = {
  play: async ({ canvasElement }) => {
    const section = await requestEmailChange(
      within(canvasElement),
      'new-hanbit@example.com',
      'Hanbit-demo-2026!',
    );

    await userEvent.type(await section.findByLabelText('인증 코드'), '000000');
    await userEvent.click(section.getByRole('button', { name: '이메일 변경 완료' }));

    await expect(
      await section.findByText('인증 코드가 올바르지 않거나 만료되었습니다'),
    ).toBeInTheDocument();
  },
};

const kakaoSection = async (canvas: ReturnType<typeof within>) =>
  within(await canvas.findByRole('region', { name: '소셜 로그인' }));

export const SocialNotLinked: Story = {
  play: async ({ canvasElement }) => {
    const section = await kakaoSection(within(canvasElement));

    await expect(await section.findByText('연동하지 않음')).toBeInTheDocument();
    await expect(section.getByRole('button', { name: '카카오 연동' })).toBeEnabled();
  },
};

export const SocialLinkedAndUnlink: Story = {
  loaders: [() => setKakaoProfile(findAccount('hanbit')!, 'hanbit')],
  play: async ({ canvasElement }) => {
    const section = await kakaoSection(within(canvasElement));

    await expect(await section.findByText('연동됨')).toBeInTheDocument();
    await userEvent.click(section.getByRole('button', { name: '카카오 연동 해제' }));

    await expect(await section.findByText('연동하지 않음')).toBeInTheDocument();
  },
};

// 소셜 로그인만 쓰는 계정은 마지막 로그인 수단이라 해제할 수 없음
export const SocialOnlyCannotUnlink: Story = {
  loaders: [
    () => {
      addAccount({
        loginId: 'kakao-only',
        password: '',
        hasPassword: false,
        kakaoProfileKey: 'other',
        displayName: '카카오 전용',
        email: 'kakao-other@example.com',
        isEmailVerified: true,
        companyName: '미래설비',
        settings: { standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
      });
      signIn('kakao-only');
    },
  ],
  play: async ({ canvasElement }) => {
    const section = await kakaoSection(within(canvasElement));

    await expect(await section.findByRole('button', { name: '카카오 연동 해제' })).toBeDisabled();
    await expect(section.getByText(/로그인 수단이 하나는 남아 있어야/)).toBeInTheDocument();
  },
};

export const SocialLinkedNotice: Story = {
  parameters: { router: { initialEntries: ['/settings?social=linked'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const section = await kakaoSection(within(canvasElement));

    await expect(await section.findByText('카카오 계정을 연동했습니다')).toBeInTheDocument();
  },
};

export const SocialAlreadyLinkedNotice: Story = {
  parameters: {
    router: { initialEntries: ['/settings?social=already-linked'], path: '/settings' },
  },
  play: async ({ canvasElement }) => {
    const section = await kakaoSection(within(canvasElement));

    await expect(
      await section.findByText('이미 다른 계정에 연동된 카카오 계정입니다'),
    ).toBeInTheDocument();
  },
};
