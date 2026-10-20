import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { MOCK_TOTP_CODE } from '../mocks/data';
import { handlers } from '../mocks/handlers';
import {
  addAccount,
  findAccount,
  getCurrentAccount,
  getRules,
  saveMockTotp,
  setSocialProfile,
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
    // 22일은 근무 형태 표준값이 아니므로 직접 입력으로 표시
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

// 근무 형태를 고르면 표준값이 채워지고 소수 첫째 자리까지 저장
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

    // 소수 둘째 자리는 거부
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
    // 이 기기를 맨 위에 두고 IP와 마지막 사용을 함께 표시, 로그인 때와 IP가 다르면 안내
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

// 로그아웃은 확인 창 경유
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

// 오래 쓰지 않은 로그인은 접어 두고 한 번에 로그아웃
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
    // 창을 닫으면 보안 줄에 새 이메일 표시
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

const socialSection = async (canvas: ReturnType<typeof within>) =>
  within(await canvas.findByRole('region', { name: '소셜 로그인' }));

export const SocialNotLinked: Story = {
  play: async ({ canvasElement }) => {
    const section = await socialSection(within(canvasElement));

    await expect(await section.findAllByText('연동하지 않음')).toHaveLength(3);
    await expect(section.getByRole('button', { name: '카카오 연동' })).toBeEnabled();
  },
};

export const SocialProvidersListed: Story = {
  play: async ({ canvasElement }) => {
    const section = await socialSection(within(canvasElement));

    for (const name of ['카카오', '네이버', '구글']) {
      await expect(await section.findByRole('button', { name: `${name} 연동` })).toBeEnabled();
    }
  },
};

// 소셜 계정이 둘이면 하나를 해제해도 로그인 수단이 남음
export const SocialOnlyWithTwoCanUnlinkOne: Story = {
  loaders: [
    () => {
      addAccount({
        loginId: 'two-social',
        password: '',
        hasPassword: false,
        socialProfiles: { kakao: 'other', google: 'other' },
        displayName: '소셜 두 개',
        email: 'social-other@example.com',
        isEmailVerified: true,
        companyName: '미래설비',
        settings: { standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
      });
      signIn('two-social');
    },
  ],
  play: async ({ canvasElement }) => {
    const section = await socialSection(within(canvasElement));

    await expect(await section.findByRole('button', { name: '카카오 연동 해제' })).toBeEnabled();
    await expect(section.getByRole('button', { name: '구글 연동 해제' })).toBeEnabled();
  },
};

export const SocialLinkedAndUnlink: Story = {
  loaders: [() => setSocialProfile(findAccount('hanbit')!, 'kakao', 'hanbit')],
  play: async ({ canvasElement }) => {
    const section = await socialSection(within(canvasElement));

    await expect(await section.findByText('연동됨')).toBeInTheDocument();
    await userEvent.click(section.getByRole('button', { name: '카카오 연동 해제' }));

    await waitFor(() => expect(section.getAllByText('연동하지 않음')).toHaveLength(3));
  },
};

// 소셜 로그인만 쓰는 계정은 마지막 로그인 수단이라 해제할 수 없음
export const SocialOnlyCannotUnlink: Story = {
  loaders: [
    () => {
      addAccount({
        loginId: 'social-only',
        password: '',
        hasPassword: false,
        socialProfiles: { kakao: 'other' },
        displayName: '소셜 전용',
        email: 'social-other@example.com',
        isEmailVerified: true,
        companyName: '미래설비',
        settings: { standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
      });
      signIn('social-only');
    },
  ],
  play: async ({ canvasElement }) => {
    const section = await socialSection(within(canvasElement));

    await expect(await section.findByRole('button', { name: '카카오 연동 해제' })).toBeDisabled();
    await expect(section.getByText(/로그인 수단이 하나는 남아 있어야/)).toBeInTheDocument();
  },
};

// 소셜 로그인만 쓰는 계정은 현재 비밀번호 없이 아이디·비밀번호를 설정하고, 이후 비밀번호 변경으로 바뀜
export const SocialOnlySetsPassword: Story = {
  loaders: [
    () => {
      addAccount({
        loginId: 'social-setter',
        password: '',
        hasPassword: false,
        socialProfiles: { kakao: 'other' },
        displayName: '소셜 설정',
        email: 'social-other@example.com',
        isEmailVerified: true,
        companyName: '미래설비',
        settings: { standardWorkMinutes: 480, monthlyWorkDays: 22, workUnitMode: 'RATIO' },
      });
      signIn('social-setter');
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '아이디·비밀번호 설정하기' }));

    const dialog = within(
      await within(document.body).findByRole('dialog', { name: '아이디·비밀번호 설정' }),
    );

    await userEvent.type(dialog.getByLabelText('아이디'), 'social-setter-id');
    await userEvent.type(
      dialog.getByLabelText('비밀번호', { selector: 'input' }),
      'Setter-2026-pass!',
    );
    await userEvent.type(dialog.getByLabelText('비밀번호 확인'), 'Setter-2026-pass!');
    await userEvent.click(dialog.getByRole('button', { name: '아이디·비밀번호 설정' }));

    await expect(await dialog.findByText(/아이디와 비밀번호를 설정했습니다/)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: '완료' }));
    await expect(
      await canvas.findByRole('button', { name: '비밀번호 변경하기' }),
    ).toBeInTheDocument();
  },
};

export const SocialLinkedNotice: Story = {
  parameters: { router: { initialEntries: ['/settings?social=linked'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const section = await socialSection(within(canvasElement));

    await expect(await section.findByText('소셜 계정을 연동했습니다')).toBeInTheDocument();
  },
};

export const SocialAlreadyLinkedNotice: Story = {
  parameters: {
    router: { initialEntries: ['/settings?social=already-linked'], path: '/settings' },
  },
  play: async ({ canvasElement }) => {
    const section = await socialSection(within(canvasElement));

    await expect(
      await section.findByText('이미 다른 계정에 연동된 소셜 계정입니다'),
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

// 확인 창에서 취소하면 해지 요청 없음
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

// 경고·보증 기준: 기본값(80%·100%·20%p·12개월) 표시, 변경 후 저장하면 다시 불러와도 유지
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

// 한도가 경고 기준보다 크지 않으면 저장 전에 안내
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

// 저장 용량: 사용량과 한도, 용도별·프로젝트별 사용량 표시
export const StorageUsage: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=company'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/사용 \(/)).toBeInTheDocument();
    await expect(canvas.getByRole('progressbar', { name: '저장 용량 사용률' })).toBeInTheDocument();
    await expect(canvas.getByText('프로젝트별 (큰 순)')).toBeInTheDocument();
    await expect(canvas.getByText('사진')).toBeInTheDocument();
  },
};

// 전체 데이터 내보내기: 비밀번호를 비우면 안내하고, 입력하면 파일 이름과 함께 완료 안내
export const DataExport: Story = {
  parameters: { router: { initialEntries: ['/settings?tab=company'], path: '/settings' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 실제 파일 저장 창을 열지 않도록 주소 만들기를 가로챔
    URL.createObjectURL = fn(() => 'blob:mock');
    URL.revokeObjectURL = fn();
    HTMLAnchorElement.prototype.click = fn();

    await userEvent.click(await canvas.findByRole('button', { name: '전체 데이터 내려받기' }));
    await expect(await canvas.findByText('현재 비밀번호를 입력해 주세요')).toBeInTheDocument();

    const field = canvas.getAllByLabelText('현재 비밀번호')[0]!;

    await userEvent.type(field, 'wrong-password');
    await userEvent.click(canvas.getByRole('button', { name: '전체 데이터 내려받기' }));
    await waitFor(() =>
      expect(canvas.queryByText(/파일을 내려받았습니다/)).not.toBeInTheDocument(),
    );

    await userEvent.clear(field);
    await userEvent.type(field, 'Hanbit-demo-2026!');
    await userEvent.click(await canvas.findByRole('button', { name: '전체 데이터 내려받기' }));
    await expect(
      await canvas.findByText(/전체데이터_.*\.xlsx 파일을 내려받았습니다/),
    ).toBeInTheDocument();
  },
};

// 2단계 인증 (선택 기능): 꺼진 상태에서 켜면 복구 코드를 보여 주고, 확인해야 닫을 수 있음
const securityRow = async (canvas: ReturnType<typeof within>) =>
  within((await canvas.findByText('2단계 인증')).closest('li')!);

export const TotpOffByDefault: Story = {
  play: async ({ canvasElement }) => {
    const row = await securityRow(within(canvasElement));

    await expect(await row.findByText(/꺼짐/)).toBeInTheDocument();
    await expect(row.getByRole('button', { name: '2단계 인증 켜기' })).toBeInTheDocument();
  },
};

export const TotpEnable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = await securityRow(canvas);

    await userEvent.click(await row.findByRole('button', { name: '2단계 인증 켜기' }));

    const dialog = within(await within(document.body).findByRole('dialog'));

    await expect(await dialog.findByAltText('인증 앱 등록 QR 코드')).toBeInTheDocument();
    await expect(dialog.getByLabelText('인증 키')).toBeInTheDocument();

    // 틀린 코드는 거부
    await userEvent.type(dialog.getByLabelText('인증 앱의 6자리 코드'), '000000');
    await userEvent.click(dialog.getByRole('button', { name: '확인하고 켜기' }));
    await expect(await dialog.findByText(/인증 코드가 올바르지 않습니다/)).toBeInTheDocument();

    // 맞는 코드면 복구 코드를 보여 주고, 적어 두었다고 확인해야 완료할 수 있음
    await userEvent.clear(dialog.getByLabelText('인증 앱의 6자리 코드'));
    await userEvent.type(dialog.getByLabelText('인증 앱의 6자리 코드'), MOCK_TOTP_CODE);
    await userEvent.click(dialog.getByRole('button', { name: '확인하고 켜기' }));

    const codes = within(await within(document.body).findByRole('dialog', { name: '복구 코드' }));

    await expect(await codes.findAllByRole('listitem')).toHaveLength(8);
    await expect(codes.getByRole('button', { name: '완료' })).toBeDisabled();
    await userEvent.click(codes.getByRole('checkbox'));
    await userEvent.click(codes.getByRole('button', { name: '완료' }));

    await expect(await row.findByText(/켜짐 · 복구 코드 8개 남음/)).toBeInTheDocument();
  },
};

export const TotpDisable: Story = {
  loaders: [
    () => {
      saveMockTotp(findAccount('hanbit')!, { isEnabled: true, recoveryCodes: ['ABCDE-FGHJK'] });
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = await securityRow(canvas);

    await expect(await row.findByText(/켜짐 · 복구 코드 1개 남음/)).toBeInTheDocument();
    // 복구 코드가 거의 없으면 다시 받도록 안내
    await expect(row.getByText(/복구 코드가 1개 남았습니다/)).toBeInTheDocument();

    await userEvent.click(row.getByRole('button', { name: '2단계 인증 끄기' }));

    const dialog = within(await within(document.body).findByRole('dialog'));

    await userEvent.type(dialog.getByLabelText('현재 비밀번호'), 'wrong-password-1');
    await userEvent.type(dialog.getByLabelText('인증 코드'), MOCK_TOTP_CODE);
    await userEvent.click(dialog.getByRole('button', { name: '2단계 인증 끄기' }));
    await expect(await dialog.findByText('현재 비밀번호가 올바르지 않습니다')).toBeInTheDocument();

    await userEvent.clear(dialog.getByLabelText('현재 비밀번호'));
    await userEvent.type(dialog.getByLabelText('현재 비밀번호'), 'Hanbit-demo-2026!');
    await userEvent.click(dialog.getByRole('button', { name: '2단계 인증 끄기' }));
    await expect(await row.findByText(/꺼짐/)).toBeInTheDocument();
  },
};

export const TotpRegenerateRecoveryCodes: Story = {
  loaders: [
    () => {
      saveMockTotp(findAccount('hanbit')!, { isEnabled: true, recoveryCodes: ['ABCDE-FGHJK'] });
    },
  ],
  play: async ({ canvasElement }) => {
    const row = await securityRow(within(canvasElement));

    await userEvent.click(await row.findByRole('button', { name: '복구 코드 다시 받기' }));

    const dialog = within(await within(document.body).findByRole('dialog'));

    await userEvent.type(dialog.getByLabelText('인증 코드'), '000000');
    await userEvent.click(dialog.getByRole('button', { name: '새 복구 코드 받기' }));
    await expect(await dialog.findByText(/인증 코드가 올바르지 않습니다/)).toBeInTheDocument();

    await userEvent.clear(dialog.getByLabelText('인증 코드'));
    await userEvent.type(dialog.getByLabelText('인증 코드'), MOCK_TOTP_CODE);
    await userEvent.click(dialog.getByRole('button', { name: '새 복구 코드 받기' }));

    const codes = within(await within(document.body).findByRole('dialog', { name: '복구 코드' }));

    await expect(await codes.findAllByRole('listitem')).toHaveLength(8);
  },
};

// 공개 시연 계정: 막힌 설정 구역은 숨기고 이유를 안내
export const DemoAccount: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/me', () =>
          HttpResponse.json({
            displayName: 'Tester',
            email: 'jbeatfield@gmail.com',
            isEmailVerified: true,
            companyName: 'Test Company',
            isDemo: true,
          }),
        ),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/시연용 계정이라/)).toBeInTheDocument();
    await expect(canvas.getByText('Test Company')).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: '비밀번호 변경하기' }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByRole('heading', { name: '소셜 로그인' })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('heading', { name: '로그인한 기기' })).not.toBeInTheDocument();

    await userEvent.click(canvas.getByRole('tab', { name: '기타' }));
    await expect(canvas.queryByRole('heading', { name: '계정 해지' })).not.toBeInTheDocument();
  },
};
