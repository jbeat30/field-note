import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { resetMockMonthly } from '../mocks/monthlyHandlers';
import { signIn } from '../mocks/state';

import { MonthlyHoursPage } from './MonthlyHoursPage';

const routerFor = (month: string) => ({
  initialEntries: [`/monthly-hours?month=${month}`],
  path: '/monthly-hours',
});

const meta = {
  title: 'Pages/월 공수표',
  component: MonthlyHoursPage,
  // 더미 작업 내역은 2026-09에 있다: 저장된 작업 내역 4건(A동 3·B동 1)과 임시 저장 1건(A동 9월 4일)
  parameters: { router: routerFor('2026-09') },
  // 스토리를 다시 그릴 때마다 확정 상태가 처음으로 돌아가야 같은 순서로 확인할 수 있다
  loaders: [
    () => {
      resetMockMonthly();
      signIn('hanbit');
    },
  ],
} satisfies Meta<typeof MonthlyHoursPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('미확정')).toBeInTheDocument();
    // 프로젝트·직원별 표와 직원별 합계
    await expect(await canvas.findByRole('table')).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: '직원별 합계' })).toBeInTheDocument();
    // 임시 저장 작업 내역은 목록으로 알린다 (집계에는 포함되지 않음)
    await expect(
      canvas.getByRole('heading', { name: '임시 저장된 작업 내역 1건' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('확정한 기록이 없습니다')).toBeInTheDocument();
  },
};

export const EmptyMonth: Story = {
  parameters: { router: routerFor('2026-07') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByText('이 달에 저장된 작업 내역이 없습니다'),
    ).toBeInTheDocument();
    await expect(canvas.queryByRole('table')).not.toBeInTheDocument();
  },
};

// 임시 저장 작업 내역이 남아 있으면 확인해야 확정할 수 있다
export const CloseNeedsDraftConfirm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '2026-09 공수 확정' }));
    await expect(
      await canvas.findByText(/임시 저장된 작업 내역가 1건 있습니다/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();

    await userEvent.click(
      canvas.getByRole('checkbox', { name: '임시 저장된 작업 내역이 남아 있어도 확정합니다' }),
    );
    await userEvent.click(canvas.getByRole('button', { name: '2026-09 공수 확정' }));

    await expect(
      await canvas.findByText('2026-09 공수를 확정했습니다', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('확정됨')).toBeInTheDocument();
    await expect(canvas.getByText('(확정 당시 값)', { exact: false })).toBeInTheDocument();
    // 확정 이력이 남고 재오픈 폼이 열린다
    await expect(canvas.getByRole('form', { name: '재오픈' })).toBeInTheDocument();
    await expect(await canvas.findByText(/임시 저장 1건/)).toBeInTheDocument();
  },
};

export const ReopenNeedsReason: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      await canvas.findByRole('checkbox', {
        name: '임시 저장된 작업 내역이 남아 있어도 확정합니다',
      }),
    );
    await userEvent.click(await canvas.findByRole('button', { name: '2026-09 공수 확정' }));

    const form = within(await canvas.findByRole('form', { name: '재오픈' }, { timeout: 4000 }));

    // 사유 없이는 재오픈할 수 없다
    await userEvent.click(form.getByRole('button', { name: '2026-09 공수 재오픈' }));
    await expect(await form.findByText('재오픈 사유를 입력해 주세요')).toBeInTheDocument();

    await userEvent.type(form.getByLabelText('재오픈 사유 (필수)'), 'A동 공수 정정');
    await userEvent.click(form.getByRole('button', { name: '2026-09 공수 재오픈' }));

    await expect(
      await canvas.findByText('2026-09 공수를 재오픈했습니다', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await expect(await canvas.findByText('사유: A동 공수 정정')).toBeInTheDocument();
    await expect(canvas.getByText('미확정')).toBeInTheDocument();
  },
};

export const FutureMonthCannotClose: Story = {
  parameters: { router: routerFor('2999-01') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('button', { name: '2999-01 공수 확정' })).toBeDisabled();
    await expect(canvas.getByText('아직 오지 않은 달은 확정할 수 없습니다')).toBeInTheDocument();
  },
};

// 내보내기는 한 번 더 확인하고 기록으로 남는다는 것을 알린다
export const ExportAsksConfirmation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '엑셀로 내보내기' }));

    const group = within(canvas.getByRole('group', { name: '내보내기 확인' }));

    await expect(group.getByText(/내보낸 기록이 남습니다/)).toBeInTheDocument();
    await userEvent.click(group.getByRole('button', { name: '취소' }));
    await expect(canvas.queryByRole('group', { name: '내보내기 확인' })).not.toBeInTheDocument();
  },
};
