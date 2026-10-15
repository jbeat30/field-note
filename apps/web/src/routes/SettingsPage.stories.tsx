import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  addAccount,
  findAccount,
  getCurrentAccount,
  getRules,
  setKakaoProfile,
  signIn,
} from '../mocks/state';

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
  parameters: { router: { initialEntries: ['/settings?tab=company'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByDisplayValue('8')).toBeInTheDocument();
    await expect(canvas.getByLabelText('월 기준일수 (일)')).toHaveValue(22);
    // 22일은 근무 형태 표준값이 아니라 직접 입력으로 보인다
    await expect(canvas.getByRole('radio', { name: /직접 입력/ })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: /비율/ })).toBeChecked();
    // 변경하기 전에는 저장할 수 없음
    await expect(canvas.getByRole('button', { name: '저장' })).toBeDisabled();
  },
};

export const SaveSettings: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=company'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const hours = await canvas.findByLabelText('하루 기준시간 (시간)');

    await userEvent.clear(hours);
    await userEvent.type(hours, '7.5');
    await userEvent.click(canvas.getByRole('radio', { name: /시간/ }));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '저장' })).toBeDisabled();
  },
};

// 근무 형태를 고르면 표준값이 채워지고 소수 첫째 자리까지 저장된다
export const PickWorkPattern: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=company'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByLabelText('월 기준일수 (일)');
    await userEvent.click(canvas.getByRole('radio', { name: /주 5일 21.7일/ }));
    await expect(canvas.getByLabelText('월 기준일수 (일)')).toHaveValue(21.7);
    await expect(canvas.getByText(/이 값이면 1MM = 21.7일/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(canvas.getByRole('radio', { name: /주 5일 21.7일/ })).toBeChecked();

    await userEvent.click(canvas.getByRole('button', { name: '표준값(26일)으로' }));
    await expect(canvas.getByLabelText('월 기준일수 (일)')).toHaveValue(26);
    await expect(canvas.getByRole('radio', { name: /주 6일 26일/ })).toBeChecked();
  },
};

export const InvalidInput: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=company'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const hours = await canvas.findByLabelText('하루 기준시간 (시간)');

    await userEvent.clear(hours);
    await userEvent.type(hours, '7.3');
    await userEvent.clear(canvas.getByLabelText('월 기준일수 (일)'));
    await userEvent.type(canvas.getByLabelText('월 기준일수 (일)'), '40');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('0.5시간 단위로 입력해 주세요')).toBeInTheDocument();
    await expect(canvas.getByText('31일 이하로 입력해 주세요')).toBeInTheDocument();

    // 소수 둘째 자리는 받지 않는다
    await userEvent.clear(canvas.getByLabelText('월 기준일수 (일)'));
    await userEvent.type(canvas.getByLabelText('월 기준일수 (일)'), '21.75');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));
    await expect(await canvas.findByText('소수 첫째 자리까지 입력해 주세요')).toBeInTheDocument();
  },
};

export const Devices: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('이 기기')).toBeInTheDocument();
    // 이 기기를 맨 위에, IP와 마지막 사용을 함께 보인다. 로그인 때와 IP가 다르면 안내
    const items = canvas
      .getAllByRole('listitem')
      .filter((item) => item.textContent?.includes('IP'));

    await expect(items[0]).toHaveTextContent('Chrome · macOS');
    await expect(items[0]).toHaveTextContent('이 기기');
    await expect(items[0]).toHaveTextContent('IP 203.0.113.24');
    await expect(items[1]).toHaveTextContent('IP 198.51.100.9 (로그인 198.51.100.7)');
    // 현재 기기에는 원격 로그아웃 버튼이 없음
    await expect(
      canvas.queryByRole('button', { name: 'Chrome · macOS 로그아웃' }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Safari · iPhone 로그아웃' }),
    ).toBeInTheDocument();
  },
};

// 로그아웃은 확인 창을 거친다
export const RevokeDevice: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: 'Safari · iPhone 로그아웃' }));

    const confirm = within(await within(document.body).findByRole('alertdialog'));

    await expect(confirm.getByText(/"Safari · iPhone"의 로그인이 끊기고/)).toBeInTheDocument();
    await userEvent.click(confirm.getByRole('button', { name: '로그아웃' }));

    await waitFor(() => expect(canvas.queryByText('Safari · iPhone')).not.toBeInTheDocument());
    await expect(canvas.getByText('Chrome · Android')).toBeInTheDocument();
  },
};

export const RevokeCancelled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: 'Safari · iPhone 로그아웃' }));
    await userEvent.click(
      within(await within(document.body).findByRole('alertdialog')).getByRole('button', {
        name: '취소',
      }),
    );

    await expect(canvas.getByText('Safari · iPhone')).toBeInTheDocument();
  },
};

// 오래 쓰지 않은 로그인은 접어 두고 한 번에 로그아웃한다
export const StaleDevicesGroup: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = await canvas.findByText('오래 쓰지 않음 1대');

    await userEvent.click(summary);
    await expect(canvas.getByText('Chrome · Android')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: '오래 쓰지 않은 기기 모두 로그아웃' }),
    );
    await userEvent.click(
      within(await within(document.body).findByRole('alertdialog')).getByRole('button', {
        name: '모두 로그아웃',
      }),
    );

    await waitFor(() => expect(canvas.queryByText('오래 쓰지 않음 1대')).not.toBeInTheDocument());
    // 최근에 쓴 기기와 이 기기는 그대로
    await expect(canvas.getByText('Safari · iPhone')).toBeInTheDocument();
    await expect(canvas.getByText('이 기기')).toBeInTheDocument();
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
  await userEvent.click(await canvas.findByRole('button', { name: '비밀번호 변경하기' }));

  const section = within(
    await within(document.body).findByRole('dialog', { name: '비밀번호 변경' }),
  );

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
  await userEvent.click(await canvas.findByRole('button', { name: '이메일 변경하기' }));

  const section = within(await within(document.body).findByRole('dialog', { name: '이메일 변경' }));

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
    // 창을 닫으면 보안 줄에 새 이메일이 보인다
    await userEvent.keyboard('{Escape}');
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

const closureSection = (canvas: ReturnType<typeof within>) =>
  within(canvas.getByRole('region', { name: '계정 해지' }));

export const ClosureWrongPassword: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=etc'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '계정 해지' }));

    const section = closureSection(canvas);

    await userEvent.type(section.getByLabelText('현재 비밀번호'), 'wrong-password-1');
    await userEvent.click(section.getByRole('button', { name: '해지 요청' }));
    await userEvent.click(
      within(await within(document.body).findByRole('alertdialog')).getByRole('button', {
        name: '해지 요청',
      }),
    );

    await expect(await section.findByText('현재 비밀번호가 올바르지 않습니다')).toBeInTheDocument();
  },
};

export const ClosureRequiresPassword: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=etc'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '계정 해지' }));

    const section = closureSection(canvas);

    await userEvent.click(section.getByRole('button', { name: '해지 요청' }));

    await expect(await section.findByText('현재 비밀번호를 입력해 주세요')).toBeInTheDocument();
  },
};

// 요청하면 로그아웃되어 안내 화면으로 이동 (스토리에서는 서버 상태가 해지 중으로 바뀌는지 확인)
export const ClosureRequested: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=etc'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '계정 해지' }));

    const section = closureSection(canvas);

    await userEvent.type(section.getByLabelText('현재 비밀번호'), 'Hanbit-demo-2026!');
    await userEvent.click(section.getByRole('button', { name: '해지 요청' }));
    await userEvent.click(
      within(await within(document.body).findByRole('alertdialog')).getByRole('button', {
        name: '해지 요청',
      }),
    );

    await waitFor(() => expect(findAccount('hanbit')?.closingPurgeAfter).toBeDefined());
    await expect(getCurrentAccount()).toBeUndefined();
  },
};

// 확인 창에서 취소하면 해지를 요청하지 않는다
export const ClosureConfirmCancelled: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=etc'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '계정 해지' }));

    const section = closureSection(canvas);

    await userEvent.type(section.getByLabelText('현재 비밀번호'), 'Hanbit-demo-2026!');
    await userEvent.click(section.getByRole('button', { name: '해지 요청' }));

    const dialog = within(await within(document.body).findByRole('alertdialog'));

    await expect(dialog.getByText(/14일 뒤 회사의 모든 데이터가 삭제됩니다/)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: '취소' }));

    await waitFor(() =>
      expect(within(document.body).queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    await expect(findAccount('hanbit')?.closingPurgeAfter).toBeUndefined();
    await expect(getCurrentAccount()).toBeDefined();
  },
};

export const ClosureCanGoBack: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=etc'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '계정 해지' }));
    await userEvent.click(canvas.getByRole('button', { name: '돌아가기' }));

    await expect(await canvas.findByRole('button', { name: '계정 해지' })).toBeInTheDocument();
  },
};

// 경고·보증 기준: 기본값(80%·100%·20%p·12개월)을 보여 주고 바꿔 저장하면 다시 불러와도 유지된다
export const CompanyRules: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=company'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const warn = await canvas.findByLabelText('공수 소진율 경고');

    await waitFor(() => expect(warn).toHaveValue(80));
    await expect(canvas.getByLabelText('공수 소진율 한도')).toHaveValue(100);
    await expect(canvas.getByLabelText('보증 기본 기간')).toHaveValue(12);

    await userEvent.clear(warn);
    await userEvent.type(warn, '70');
    await userEvent.clear(canvas.getByLabelText('보증 기본 기간'));
    await userEvent.type(canvas.getByLabelText('보증 기본 기간'), '24');
    await userEvent.click(canvas.getByRole('button', { name: '기준 저장' }));

    await waitFor(() =>
      expect(getRules(findAccount('hanbit')!)).toMatchObject({
        burnWarnPercent: 70,
        warrantyDefaultMonths: 24,
      }),
    );
  },
};

// 한도가 경고 기준보다 크지 않으면 저장하기 전에 알려 준다
export const CompanyRulesInvalid: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=company'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const limit = await canvas.findByLabelText('공수 소진율 한도');

    await waitFor(() => expect(limit).toHaveValue(100));
    await userEvent.clear(limit);
    await userEvent.type(limit, '70');
    await userEvent.click(canvas.getByRole('button', { name: '기준 저장' }));

    await expect(
      await canvas.findByText('한도 기준은 경고 기준보다 커야 합니다'),
    ).toBeInTheDocument();
  },
};
