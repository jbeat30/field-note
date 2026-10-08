import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { UploadQueuePanel } from './UploadQueuePanel';
import type { UploadItem } from './uploadQueue';

const item = (id: string, name: string, patch: Partial<UploadItem> = {}): UploadItem => ({
  id,
  projectId: 'p1',
  name,
  size: 1_800_000,
  meta: { category: 'DURING' },
  step: 'PUT',
  status: 'QUEUED',
  attempts: 0,
  createdAt: '2026-10-08T00:00:00.000Z',
  ...patch,
});

const meta = {
  title: 'Photos/업로드 대기열',
  component: UploadQueuePanel,
  args: { onRetry: fn(), onCancel: fn(), onClearDone: fn(), items: [] },
} satisfies Meta<typeof UploadQueuePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Mixed: Story = {
  args: {
    items: [
      item('1', '현장1.jpg', { status: 'DONE', step: 'REGISTER' }),
      item('2', '현장2.jpg', { status: 'RUNNING' }),
      item('3', '현장3.jpg'),
      item('4', '현장4.jpg', { status: 'WAITING', attempts: 2, error: '연결이 끊겼습니다' }),
      item('5', '현장5.jpg', {
        status: 'FAILED',
        attempts: 6,
        error: '저장 용량 한도를 넘어 파일을 올릴 수 없습니다. 관리자에게 문의해 주세요',
      }),
    ],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('올리는 중 4장')).toBeInTheDocument();
    await expect(canvas.getByText(/올리는 중$/)).toBeInTheDocument();
    await expect(canvas.getByText(/연결을 기다리는 중/)).toBeInTheDocument();
    await expect(canvas.getByText(/2번째 재시도/)).toBeInTheDocument();
    await expect(canvas.getByText(/저장 용량 한도/)).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '다시 시도' }));
    await expect(args.onRetry).toHaveBeenCalledWith('5');

    await userEvent.click(canvas.getAllByRole('button', { name: '취소' })[0]!);
    await expect(args.onCancel).toHaveBeenCalledWith('2');

    await userEvent.click(canvas.getByRole('button', { name: '완료 항목 지우기' }));
    await expect(args.onClearDone).toHaveBeenCalled();
  },
};

export const AllDone: Story = {
  args: { items: [item('1', 'a.jpg', { status: 'DONE' }), item('2', 'b.jpg', { status: 'DONE' })] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('2장을 모두 올렸습니다')).toBeInTheDocument();
  },
};

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('section')).toBeNull();
  },
};
