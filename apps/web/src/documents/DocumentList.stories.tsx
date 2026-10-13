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

    // 분류별로 묶임
    const headings = canvas
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);

    await expect(headings).toEqual(['도면', '시방·사양', '계약·행정']);
    // 최신본 번호·전체 버전 수·개정일·사유, 민감 표시
    await expect(canvas.getByText('최신 v2 (전체 2개)')).toBeInTheDocument();
    await expect(canvas.getByText(/10월 6일 \(화\) 개정 · 배관 위치 변경/)).toBeInTheDocument();
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

    await userEvent.click(canvas.getByRole('button', { name: '외장 시방서 상세' }));
    await expect(args.onDetail).toHaveBeenCalledWith(args.documents[2]);
  },
};
