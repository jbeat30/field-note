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
    onTogglePin: fn(),
    documents: [
      storyDocument(1, {
        title: '1층 시공도',
        isPinned: true,
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

    // 고정한 문서가 맨 위, 나머지는 분류별
    const headings = canvas
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);

    await expect(headings).toEqual(['고정한 문서', '시방·사양', '계약·행정']);
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

export const PinAndDetail: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '1층 시공도 고정 해제' }));
    await expect(args.onTogglePin).toHaveBeenCalledWith(args.documents[0]);
    await userEvent.click(canvas.getByRole('button', { name: '외장 시방서 첫 화면에 고정' }));
    await expect(args.onTogglePin).toHaveBeenCalledWith(args.documents[2]);
    await userEvent.click(canvas.getByRole('button', { name: '외장 시방서 상세' }));
    await expect(args.onDetail).toHaveBeenCalledWith(args.documents[2]);
  },
};

// 검사 중이거나 거부된 파일은 열 수 없음
export const NotReady: Story = {
  args: {
    documents: [
      storyDocument(1, {
        title: '검사 중 문서',
        latest: storyVersion(1, { fileStatus: 'PROCESSING' }),
      }),
      storyDocument(2, {
        title: '거부된 문서',
        latest: storyVersion(1, { fileStatus: 'REJECTED', rejectReason: 'CONTENT_MISMATCH' }),
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('파일을 검사하는 중입니다')).toBeInTheDocument();
    await expect(canvas.getByText('검사에서 거부된 파일입니다')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '검사 중 문서 열기' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: '거부된 문서 내려받기' })).toBeDisabled();
  },
};

export const LongTitleAndManyDocuments: Story = {
  args: {
    documents: Array.from({ length: 20 }, (_, index) =>
      storyDocument(index + 1, {
        title:
          index === 0
            ? '아주 아주 긴 이름의 문서 제목이 들어가도 화면이 깨지지 않아야 합니다 시공도 최종 수정본'
            : `문서 ${index + 1}`,
      }),
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('button', { name: /열기$/ })).toHaveLength(20);
  },
};
