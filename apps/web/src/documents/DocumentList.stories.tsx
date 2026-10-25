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
      storyDocument(2, { title: '도급 계약서', categoryName: '계약·공문', isSensitive: true }),
      storyDocument(3, { title: '외장 시방서', categoryName: '견적·정산' }),
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
    for (const category of ['도면·작업지시서', '견적·정산', '계약·공문']) {
      await expect(table.getByText(category)).toBeInTheDocument();
    }
    await expect(table.getByText('10월 6일 (화)')).toBeInTheDocument();
    // 최신 판과 판 수가 따로 보임
    await expect(table.getByText('v2')).toBeInTheDocument();
    await expect(table.getByRole('columnheader', { name: '판 수' })).toBeInTheDocument();
    await expect(canvas.getByText('민감')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '1층 시공도 열기' }));
    await expect(args.onOpen).toHaveBeenCalledWith(args.documents[0], 'view');
    await userEvent.click(canvas.getByRole('button', { name: '도급 계약서 더보기' }));
    await userEvent.click(await within(document.body).findByRole('menuitem', { name: '내려받기' }));
    await expect(args.onOpen).toHaveBeenCalledWith(args.documents[1], 'download');
  },
};

export const OpenDetail: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '외장 시방서 더보기' }));
    await userEvent.click(
      await within(document.body).findByRole('menuitem', { name: '새 판 올리기·버전 기록' }),
    );
    await expect(args.onDetail).toHaveBeenCalledWith(args.documents[2]);
  },
};
