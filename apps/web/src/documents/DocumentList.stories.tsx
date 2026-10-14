import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DocumentList } from './DocumentList';
import { storyDocument, storyVersion } from './storyData';

const meta = {
  title: 'Documents/문서 목록',
  component: DocumentList,
  args: {
    onOpen: fn(),
    onDetail: fn(),
    documents: [
      storyDocument(1, {
        title: '1층 시공도',
        versionCount: 2,
        latest: storyVersion(2, { reason: '배관 위치 변경', revisionDate: '2026-10-06' }),
      }),
      storyDocument(2, { title: '도급 계약서', category: 'CONTRACT', isSensitive: true }),
      storyDocument(3, { title: '외장 시방서', category: 'SPEC' }),
    ],
  },
} satisfies Meta<typeof DocumentList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const table = within(canvas.getByRole('table', { name: '문서 목록' }));

    await expect(table.getAllByRole('row')).toHaveLength(4);
    for (const category of ['도면', '시방·사양', '계약·행정']) {
      await expect(table.getByText(category)).toBeInTheDocument();
    }
    await expect(table.getByText('10월 6일 (화)')).toBeInTheDocument();
    await expect(table.getByText(/v2/)).toHaveTextContent('v2 /2');
    await expect(canvas.getByText('민감')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '1층 시공도 열기' }));
    await expect(args.onOpen).toHaveBeenCalledWith(args.documents[0], 'view');
    await userEvent.click(canvas.getByRole('button', { name: '도급 계약서 내려받기' }));
    await expect(args.onOpen).toHaveBeenCalledWith(args.documents[1], 'download');
  },
};

export const OpenDetail: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '외장 시방서 버전·기록' }));
    await expect(args.onDetail).toHaveBeenCalledWith(args.documents[2]);
  },
};
