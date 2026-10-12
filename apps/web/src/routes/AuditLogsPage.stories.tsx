import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { resetMockAudit } from '../mocks/auditHandlers';
import { signIn } from '../mocks/state';

import { AuditLogsPage } from './AuditLogsPage';

const meta = {
  title: 'Pages/기록 조회',
  component: AuditLogsPage,
  loaders: [
    () => {
      // 스토리가 다시 그려져도 기록이 이어지지 않게 처음으로 되돌림
      resetMockAudit();
      signIn('hanbit');
    },
  ],
} satisfies Meta<typeof AuditLogsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = within(await canvas.findByRole('list', { name: '기록 목록' }));

    // 최근순: 내보내기(10/6) 다음 단가 조회(10/5)
    const rows = list.getAllByRole('listitem');

    await expect(rows).toHaveLength(2);
    await expect(rows[0]).toHaveTextContent('내보내기');
    await expect(rows[0]).toHaveTextContent('A동 외장 판금 공사');
    await expect(rows[0]).toHaveTextContent('작업일보 엑셀 · 2026-10-01 ~ 2026-10-04');
    await expect(rows[1]).toHaveTextContent('단가 조회');
    await expect(within(rows[1]!).getByRole('link', { name: '정판금' })).toHaveAttribute(
      'href',
      /\/employees\//,
    );
    await expect(canvas.getByText(/수정하거나 지울 수 없습니다/)).toBeInTheDocument();
  },
};

export const FilterByAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('list', { name: '기록 목록' });
    await userEvent.selectOptions(canvas.getByLabelText('종류'), '단가 조회');

    await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(1));
    await expect(canvas.getByRole('listitem')).toHaveTextContent('단가 조회');

    // 해당하는 기록이 없으면 안내
    await userEvent.selectOptions(canvas.getByLabelText('종류'), '월 공수 확정');
    await expect(await canvas.findByText('조건에 맞는 기록이 없습니다')).toBeInTheDocument();
  },
};

export const FilterByDate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('list', { name: '기록 목록' });
    fireEvent.change(canvas.getByLabelText('시작 날짜'), { target: { value: '2026-10-06' } });

    await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(1));
    await expect(canvas.getByRole('listitem')).toHaveTextContent('내보내기');

    // 끝 날짜가 시작 날짜보다 빠르면 막는다
    fireEvent.change(canvas.getByLabelText('끝 날짜'), { target: { value: '2026-10-01' } });
    await expect(
      await canvas.findByText('끝 날짜는 시작 날짜보다 빠를 수 없습니다'),
    ).toBeInTheDocument();
  },
};
