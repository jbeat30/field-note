import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { MemoList } from './MemoList';
import { storyMemo } from './storyData';

const meta = {
  title: 'Memos/메모 목록',
  component: MemoList,
  args: {
    onToggleDone: fn(),
    onDelete: fn(),
    onEdit: fn(),
    memos: [
      storyMemo(1, { content: '301호 천장 높이 다시 확인', tag: 'TODO' }),
      storyMemo(2, { content: '고객이 마감 색상을 회색으로 지시', tag: 'INSTRUCTION' }),
      storyMemo(3, {
        content: '샘플 승인 받기',
        tag: 'TODO',
        isDone: true,
        memoDate: '2026-10-06',
      }),
    ],
  },
} satisfies Meta<typeof MemoList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 날짜별로 묶이고 최근 날짜가 먼저
    const headings = canvas
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);

    await expect(headings).toEqual(['10월 7일 (수)', '10월 6일 (화)']);
    // 할 일에만 완료 체크가 있고 완료된 것은 체크되어 있음
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(2);
    await expect(canvas.getByLabelText('샘플 승인 받기 완료')).toBeChecked();

    await userEvent.click(canvas.getByLabelText('301호 천장 높이 다시 확인 완료'));
    await expect(args.onToggleDone).toHaveBeenCalledWith(args.memos[0], true);
  },
};

// 삭제는 한 번 더 확인
export const DeleteNeedsConfirm: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getAllByRole('button', { name: '삭제' })[0]!);
    await expect(args.onDelete).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: '정말 삭제' }));
    await expect(args.onDelete).toHaveBeenCalledWith(args.memos[0]);
  },
};

export const Edit: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getAllByRole('button', { name: '수정' })[1]!);
    await userEvent.clear(canvas.getByLabelText('메모 내용'));
    await userEvent.type(canvas.getByLabelText('메모 내용'), '고친 지시');
    await userEvent.selectOptions(canvas.getByLabelText('태그'), '이슈');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(args.onEdit).toHaveBeenCalledWith(args.memos[1], '고친 지시', 'ISSUE');
  },
};

// 메모함에서는 프로젝트에 연결할 수 있음
export const LinkToProject: Story = {
  args: {
    projects: [
      { id: 'p1', name: 'A동 외장 판금 공사' },
      { id: 'p2', name: 'B동 배관 공사' },
    ],
    onLink: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(
      canvas.getByLabelText('301호 천장 높이 다시 확인 프로젝트에 연결'),
      'B동 배관 공사',
    );
    await expect(args.onLink).toHaveBeenCalledWith(args.memos[0], 'p2');
  },
};

// 줄바꿈이 많은 긴 메모도 그대로 보임
export const LongMemo: Story = {
  args: {
    memos: [storyMemo(1, { content: `${'긴 통화 내용입니다. '.repeat(30)}\n둘째 줄\n셋째 줄` })],
  },
};
