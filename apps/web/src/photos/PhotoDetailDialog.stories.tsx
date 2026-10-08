import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';

import { PhotoDetailDialog } from './PhotoDetailDialog';
import { storyImage, storyPhoto } from './storyData';

const meta = {
  title: 'Photos/사진 상세',
  component: PhotoDetailDialog,
  args: {
    photo: storyPhoto(1, 'BEFORE', '3층 301호', { description: '철거 전 상태' }),
    onClose: fn(),
    onSave: fn(async () => undefined),
    onDelete: fn(async () => undefined),
    loadOriginalUrl: async () => storyImage('BEFORE', 1200),
  },
} satisfies Meta<typeof PhotoDetailDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

// 대화 상자는 화면 최상위에 열리므로 screen으로 찾음
export const Default: Story = {
  play: async ({ args }) => {
    const dialog = within(await screen.findByRole('dialog'));

    await expect(dialog.getByLabelText('구역')).toHaveValue('3층 301호');
    await expect(dialog.getByLabelText('설명')).toHaveValue('철거 전 상태');

    await userEvent.selectOptions(dialog.getByLabelText('구분'), '작업 후');
    await userEvent.clear(dialog.getByLabelText('구역'));
    await userEvent.click(dialog.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(args.onSave).toHaveBeenCalledWith(args.photo.id, {
        category: 'AFTER',
        area: null,
        description: '철거 전 상태',
      }),
    );
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const SetCover: Story = {
  play: async ({ args }) => {
    const dialog = within(await screen.findByRole('dialog'));

    await userEvent.click(dialog.getByRole('button', { name: '대표 사진으로' }));
    await waitFor(() => expect(args.onSave).toHaveBeenCalledWith(args.photo.id, { isCover: true }));
  },
};

// 삭제는 한 번 더 확인
export const DeleteNeedsConfirm: Story = {
  play: async ({ args }) => {
    const dialog = within(await screen.findByRole('dialog'));

    await userEvent.click(dialog.getByRole('button', { name: '삭제' }));
    await expect(args.onDelete).not.toHaveBeenCalled();

    await userEvent.click(dialog.getByRole('button', { name: '정말 삭제' }));
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledWith(args.photo.id));
  },
};

export const SaveFails: Story = {
  args: {
    onSave: fn(async () => {
      throw { error: { code: 'NOT_FOUND', message: '요청한 자료를 찾을 수 없습니다' } };
    }),
  },
  play: async ({ args }) => {
    const dialog = within(await screen.findByRole('dialog'));

    await userEvent.click(dialog.getByRole('button', { name: '저장' }));
    await expect(await dialog.findByRole('alert')).toHaveTextContent(
      '요청한 자료를 찾을 수 없습니다',
    );
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

// 검사에서 거부된 사진은 안내만 보여 줌
export const Rejected: Story = {
  args: {
    photo: storyPhoto(2, 'OTHER', null, {
      thumbnailUrl: null,
      file: { status: 'REJECTED', rejectReason: 'CONTENT_MISMATCH', size: 1 },
    }),
  },
  play: async () => {
    await expect(await screen.findByText('검사에서 거부된 사진입니다')).toBeInTheDocument();
  },
};
