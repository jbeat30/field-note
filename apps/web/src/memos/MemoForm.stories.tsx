import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { resetDraftStore } from '../stores/draftStore';

import { MemoForm } from './MemoForm';

const meta = {
  title: 'Memos/메모 입력',
  component: MemoForm,
  args: { draftKey: 'memo:story', onSubmit: fn(async () => undefined) },
  loaders: [() => resetDraftStore()],
} satisfies Meta<typeof MemoForm>;

export default meta;

type Story = StoryObj<typeof meta>;

// 한 줄만 적어도 저장되고 태그는 기본 "기타", 저장 뒤 입력이 비워짐
export const OneLine: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('메모'), '  전화 회신 필요 ');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith({ content: '  전화 회신 필요 ', tag: 'OTHER' }),
    );
    await waitFor(() => expect(canvas.getByLabelText('메모')).toHaveValue(''));
  },
};

export const WithTag: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('메모'), '샘플 승인');
    await userEvent.selectOptions(canvas.getByLabelText('태그'), '할 일');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith({ content: '샘플 승인', tag: 'TODO' }),
    );
  },
};

export const EmptyIsRejected: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent('내용을 입력해 주세요');
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

// 저장이 실패해도 쓴 글은 남고 사유를 알림
export const SaveFailsKeepsText: Story = {
  args: {
    onSubmit: fn(async () => {
      throw { error: { code: 'VALIDATION_ERROR', message: '입력 값을 확인해 주세요' } };
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('메모'), '잃으면 안 되는 글');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByRole('alert')).toBeInTheDocument();
    await expect(canvas.getByLabelText('메모')).toHaveValue('잃으면 안 되는 글');
  },
};
