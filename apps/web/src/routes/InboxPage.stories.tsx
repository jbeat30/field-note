import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { signIn } from '../mocks/state';
import { resetDraftStore } from '../stores/draftStore';

import { InboxPage } from './InboxPage';

const meta = {
  title: 'Pages/메모함',
  component: InboxPage,
  loaders: [() => signIn('hanbit'), () => resetDraftStore()],
} satisfies Meta<typeof InboxPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('301호 천장 높이 다시 확인')).toBeInTheDocument();
    // 더미 메모함 3건
    await expect(canvas.getAllByRole('button', { name: '삭제' })).toHaveLength(3);
  },
};

export const SaveToInbox: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('301호 천장 높이 다시 확인');
    await userEvent.type(canvas.getByLabelText('메모'), '새로 적은 메모');
    await userEvent.click(canvas.getByRole('button', { name: '메모함에 저장' }));

    // 입력 칸에도 같은 글이 있으므로 목록의 메모(문단)로 찾음
    await expect(await canvas.findByText('새로 적은 메모', { selector: 'p' })).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByLabelText('메모')).toHaveValue(''));
  },
};

// 프로젝트에 연결하면 메모함에서 빠짐
export const LinkRemovesFromInbox: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('자재 반입 시간 협의');
    await waitFor(() =>
      expect(
        within(canvas.getByLabelText('자재 반입 시간 협의 프로젝트에 연결')).getAllByRole('option')
          .length,
      ).toBeGreaterThan(1),
    );
    await userEvent.selectOptions(
      canvas.getByLabelText('자재 반입 시간 협의 프로젝트에 연결'),
      'A동 외장 판금 공사',
    );

    await waitFor(() => expect(canvas.queryByText('자재 반입 시간 협의')).not.toBeInTheDocument());
  },
};

export const CompleteTodo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByLabelText('301호 천장 높이 다시 확인 완료'));
    await waitFor(() =>
      expect(canvas.getByLabelText('301호 천장 높이 다시 확인 완료')).toBeChecked(),
    );
  },
};

export const DeleteMemo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 같은 날짜의 메모는 순서가 정해져 있지 않으므로 해당 메모 칸 안의 삭제 버튼을 누름
    const item = (await canvas.findByText('자재 반입 시간 협의')).closest('li')!;

    await userEvent.click(within(item).getByRole('button', { name: '삭제' }));
    await userEvent.click(within(item).getByRole('button', { name: '정말 삭제' }));

    await waitFor(() => expect(canvas.queryByText('자재 반입 시간 협의')).not.toBeInTheDocument());
  },
};
