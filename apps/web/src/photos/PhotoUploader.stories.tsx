import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { PhotoUploader } from './PhotoUploader';

const meta = {
  title: 'Photos/사진 올리기',
  component: PhotoUploader,
  args: { onSelect: fn(async () => []) },
} satisfies Meta<typeof PhotoUploader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(canvas.getByLabelText('구분'), '작업 전');
    await userEvent.type(canvas.getByLabelText('구역 (선택)'), ' 3층 301호 ');

    const input = canvas.getByLabelText('사진 파일 선택');
    const photos = [
      new File(['a'], '현장1.jpg', { type: 'image/jpeg' }),
      new File(['b'], '현장2.jpg', { type: 'image/jpeg' }),
    ];

    await userEvent.upload(input, photos);
    await waitFor(() =>
      expect(args.onSelect).toHaveBeenCalledWith(photos, { category: 'BEFORE', area: '3층 301호' }),
    );
  },
};

// 열 수 없는 사진은 사유와 함께 알려 줌
export const SomeFailed: Story = {
  args: {
    onSelect: fn(async () => [
      {
        name: '이상한.heic',
        message: '이 사진 형식은 열 수 없습니다. 카메라 설정에서 JPEG 형식으로 찍어 주세요',
      },
    ]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.upload(canvas.getByLabelText('사진 파일 선택'), [
      new File(['x'], '이상한.heic', { type: 'image/heic' }),
    ]);
    await expect(await canvas.findByRole('alert')).toHaveTextContent('이상한.heic');
  },
};
