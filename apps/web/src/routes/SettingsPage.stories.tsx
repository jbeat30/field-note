import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { signIn } from '../mocks/state';

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

    await expect(await canvas.findByText(/이 기기/)).toBeInTheDocument();
    // 현재 기기에는 원격 로그아웃 버튼이 없음
    await expect(
      canvas.queryByRole('button', { name: /이 기기.*로그아웃/ }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getAllByRole('button', { name: /로그아웃$/ }).length,
    ).toBeGreaterThanOrEqual(3);
  },
};

export const RevokeDevice: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: 'iPhone (Safari) 로그아웃' }));

    await waitFor(() => expect(canvas.queryByText('iPhone (Safari)')).not.toBeInTheDocument());
    await expect(canvas.getByText('Android (Chrome)')).toBeInTheDocument();
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
