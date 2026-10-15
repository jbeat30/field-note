import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { resetMockLedger } from '../mocks/ledgerHandlers';
import { signIn } from '../mocks/state';

import { LedgerPanel } from './LedgerPanel';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const meta = {
  title: 'Ledger/지출·수입',
  component: LedgerPanel,
  args: { projectId },
  // 스토리마다 더미 기록에서 시작 (이전 스토리에서 추가·삭제한 기록이 남지 않게)
  loaders: [
    () => {
      resetMockLedger();

      return signIn('hanbit');
    },
  ],
} satisfies Meta<typeof LedgerPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

// 더미 기록: 지출 3건(27만 원)과 고철 판매 수입 1건(7만 원)이 합계와 내역 표에 표시
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = within(await canvas.findByRole('table', { name: '지출·수입 내역' }));

    await expect(table.getAllByRole('row')).toHaveLength(5);
    await expect(table.getByText('실리콘 코킹 20개')).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByText('270,000')).toBeInTheDocument());
    await expect(canvas.getByText('70,000')).toBeInTheDocument();
  },
};

// 구분 단추로 수입만 보면 내역과 지출 합계가 같은 조건 적용
export const FilterIncome: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('table', { name: '지출·수입 내역' });
    await userEvent.click(canvas.getByRole('radio', { name: '수입' }));

    await waitFor(() => {
      const table = within(canvas.getByRole('table', { name: '지출·수입 내역' }));

      expect(table.getAllByRole('row')).toHaveLength(2);
      expect(table.getByText('철거 고철')).toBeInTheDocument();
    });
    await expect(canvas.getByText('지출 (조건에 맞는 것)')).toBeInTheDocument();
  },
};

// 지출 한 건 입력 시 내역과 합계 즉시 변경
export const AddExpense: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('table', { name: '지출·수입 내역' });
    await userEvent.click(canvas.getByRole('button', { name: '지출·수입 기록' }));

    const dialog = within(await within(document.body).findByRole('dialog'));

    await userEvent.type(dialog.getByLabelText('금액'), '12000');
    await userEvent.type(dialog.getByLabelText('내용·메모'), '용접봉 한 박스');
    await userEvent.click(dialog.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(canvas.getByText('용접봉 한 박스')).toBeInTheDocument());
    await waitFor(() => expect(canvas.getByText('282,000')).toBeInTheDocument());
  },
};

// 금액을 비우고 저장하면 저장 전에 안내
export const NeedsAmount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('table', { name: '지출·수입 내역' });
    await userEvent.click(canvas.getByRole('button', { name: '지출·수입 기록' }));

    const dialog = within(await within(document.body).findByRole('dialog'));

    await userEvent.click(dialog.getByRole('button', { name: '저장' }));

    await expect(await dialog.findByText('금액을 입력해 주세요')).toBeInTheDocument();
  },
};

// 지우기는 확인 창을 거치고 지우면 합계에서 제외
export const DeleteEntry: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('table', { name: '지출·수입 내역' });
    await userEvent.click(canvas.getByRole('button', { name: /타공기 대여 지우기$/ }));

    const confirm = within(await within(document.body).findByRole('alertdialog'));

    await userEvent.click(confirm.getByRole('button', { name: '지우기' }));

    await waitFor(() => expect(canvas.queryByText('타공기 대여')).not.toBeInTheDocument());
    await waitFor(() => expect(canvas.getByText('120,000')).toBeInTheDocument());
  },
};
