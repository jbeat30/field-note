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
  // 스토리를 다시 그릴 때마다 확정 상태가 처음으로 돌아가야 같은 순서로 확인 가능
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
    // 직원 × 프로젝트 표: 행 직원·열 프로젝트, 합계가 큰 사람이 먼저, 끝 열에 MD와 MM, 아래에 합계 행
    const table = within(await canvas.findByRole('table', { name: '월 공수표' }));
    const rows = table.getAllByRole('row');

    await expect(rows[1]).toHaveTextContent('최설치');
    await expect(table.getByRole('row', { name: /^정판금/ })).toHaveTextContent('2');
    await expect(table.getByRole('columnheader', { name: 'MM' })).toBeInTheDocument();
    await expect(table.getByRole('row', { name: /^합계/ })).toHaveTextContent('9');
    // 행을 프로젝트로 전환 가능
    await userEvent.click(canvas.getByRole('radio', { name: '프로젝트별' }));
    await expect(await table.findByRole('columnheader', { name: '프로젝트' })).toBeInTheDocument();
    await expect(table.getByRole('rowheader', { name: /A동 외장 판금 공사/ })).toBeInTheDocument();
    // MM 환산 기준을 수치 옆에 표기
    await expect(canvas.getAllByText(/1MM = /).length).toBeGreaterThan(0);
    // 임시 저장 작업 내역은 목록으로 알림 (집계에는 포함되지 않음)
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
    await expect(canvas.queryByRole('table', { name: '월 공수표' })).not.toBeInTheDocument();
  },
};

// 임시 저장 작업 내역이 남아 있으면 확인 후 확정 가능
export const CloseNeedsDraftConfirm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '공수 확정' }));
    await expect(
      await canvas.findByText(/임시 저장된 작업 내역가 1건 있습니다/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();

    await userEvent.click(
      canvas.getByRole('checkbox', { name: '임시 저장된 작업 내역이 남아 있어도 확정합니다' }),
    );
    await userEvent.click(canvas.getByRole('button', { name: '공수 확정' }));

    await expect(
      await canvas.findByText('2026-09 공수를 확정했습니다', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('확정됨')).toBeInTheDocument();
    await expect(canvas.getByText('하루 기준시간')).toBeInTheDocument();
    // 확정 이력이 남고 재오픈 폼 표시
    await expect(canvas.getByRole('form', { name: '재오픈' })).toBeInTheDocument();
    await expect(await canvas.findByText(/임시 1건/)).toBeInTheDocument();
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
    await userEvent.click(await canvas.findByRole('button', { name: '공수 확정' }));

    const form = within(await canvas.findByRole('form', { name: '재오픈' }, { timeout: 4000 }));

    // 사유 없이는 재오픈 불가
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

    await expect(await canvas.findByRole('button', { name: '공수 확정' })).toBeDisabled();
    await expect(canvas.getByText('아직 오지 않은 달은 확정할 수 없습니다')).toBeInTheDocument();
  },
};

// 내보내기는 한 번 더 확인하고 기록이 남는다는 안내 표시
export const ExportAsksConfirmation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '엑셀로 내보내기' }));

    const group = within(await within(document.body).findByRole('alertdialog'));

    await expect(group.getByText(/내보낸 기록이 남습니다/)).toBeInTheDocument();
    await userEvent.click(group.getByRole('button', { name: '취소' }));
    await expect(within(document.body).queryByRole('alertdialog')).not.toBeInTheDocument();
  },
};
