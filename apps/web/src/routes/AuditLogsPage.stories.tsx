import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { resetMockAudit } from '../mocks/auditHandlers';
import { signIn } from '../mocks/state';

import { AuditLogsPage } from './AuditLogsPage';
import { chooseOption } from '../lib/storyActions';

const meta = {
  title: 'Pages/활동 기록',
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

    // 최근순: 사진 삭제(10/7) → 내보내기(10/6) → 직원 정보 수정 → 작업 내역 수정(10/5)
    const rows = list.getAllByRole('listitem');

    await expect(rows).toHaveLength(4);
    await expect(rows[0]).toHaveTextContent('삭제');
    await expect(rows[0]).toHaveTextContent('사진 삭제');
    await expect(rows[0]).toHaveTextContent('3층 301호 · 2026-10-05');
    await expect(rows[1]).toHaveTextContent('내보내기');
    await expect(rows[1]).toHaveTextContent('작업일보 엑셀 · 2026-10-01 ~ 2026-10-04');
    await expect(rows[2]).toHaveTextContent('직원 정보 수정');
    await expect(within(rows[2]!).getByRole('link', { name: '정판금' })).toHaveAttribute(
      'href',
      '/employees/0198d000-0000-7000-8000-000000000101',
    );
    await expect(rows[3]).toHaveTextContent('작업 내역 수정');
    // 인건비·단가 조회는 기록 중단이므로 종류 칩에도 없음
    await expect(canvas.queryByRole('button', { name: '조회' })).not.toBeInTheDocument();
    await expect(canvas.getByText(/수정하거나 지울 수 없습니다/)).toBeInTheDocument();
  },
};

export const FilterByKind: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('list', { name: '기록 목록' });
    await userEvent.click(canvas.getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(1));
    await expect(canvas.getByRole('listitem')).toHaveTextContent('사진 삭제');

    // 같은 칩을 다시 누르면 전체, 해당하는 기록이 없으면 안내
    await userEvent.click(canvas.getByRole('button', { name: '삭제' }));
    await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(4));
    await userEvent.click(canvas.getByRole('button', { name: '확정' }));
    await expect(await canvas.findByText('조건에 맞는 기록이 없습니다')).toBeInTheDocument();
  },
};

// 행을 누르면 바뀐 내용의 전·후 표시, 개인정보는 값 없이 바뀌었다는 사실만 표시
export const ShowChanges: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('list', { name: '기록 목록' });

    const buttons = canvas.getAllByRole('button', { name: /바뀐 내용 2건/ });

    await userEvent.click(buttons[0]!);
    await expect(await canvas.findByText('반장')).toBeInTheDocument();
    await expect(canvas.getByText('바뀜 (값은 기록하지 않음)')).toBeInTheDocument();
    await userEvent.click(buttons[1]!);
    await expect(await canvas.findByText('10시간')).toBeInTheDocument();
    await expect(canvas.getByText('3명')).toBeInTheDocument();
  },
};

export const FilterByProject: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('list', { name: '기록 목록' });
    await chooseOption(canvas.getByLabelText('프로젝트'), 'A동 외장 판금 공사');

    // 직원 정보 수정은 프로젝트에 속하지 않으므로 제외
    await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(3));
    await expect(canvas.queryByText('직원 정보 수정')).not.toBeInTheDocument();
  },
};

export const FilterByDate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('list', { name: '기록 목록' });
    fireEvent.change(canvas.getByLabelText('시작 날짜'), { target: { value: '2026-10-06' } });

    await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(2));
    await expect(canvas.getAllByRole('listitem')[1]).toHaveTextContent('내보내기');

    // 끝 날짜가 시작 날짜보다 빠르면 차단
    fireEvent.change(canvas.getByLabelText('끝 날짜'), { target: { value: '2026-10-01' } });
    await expect(
      await canvas.findByText('끝 날짜는 시작 날짜보다 빠를 수 없습니다'),
    ).toBeInTheDocument();
  },
};
