import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ResumeDrafts } from './ResumeDrafts';

const meta = {
  title: 'Drafts/이어서 작성',
  component: ResumeDrafts,
  args: {
    projectNames: new Map([
      ['p1', 'A동 외장 판금 공사'],
      ['p2', 'B동 덕트 설치'],
    ]),
    drafts: [
      {
        key: 'workLog:p1:2026-10-08',
        kind: 'workLog',
        projectId: 'p1',
        date: '2026-10-08',
        savedAt: '2026-10-08T01:30:00.000Z',
      },
      {
        key: 'materials:p2:2026-10-07',
        kind: 'materials',
        projectId: 'p2',
        date: '2026-10-07',
        savedAt: '2026-10-07T09:00:00.000Z',
      },
    ],
  },
} satisfies Meta<typeof ResumeDrafts>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('link', { name: /A동 외장 판금 공사 · 10월 8일 \(목\) 일지 작성 중/ }),
    ).toHaveAttribute('href', '/work-logs?project=p1&date=2026-10-08');
    await expect(
      canvas.getByRole('link', { name: /B동 덕트 설치 · 10월 7일 \(수\) 자재 작성 중/ }),
    ).toBeInTheDocument();
  },
};

// 프로젝트 이름을 모르면 이름 없이 표시
export const UnknownProject: Story = {
  args: { projectNames: new Map() },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText(/프로젝트 · /)).toHaveLength(2);
  },
};

export const EmptyRendersNothing: Story = {
  args: { drafts: [] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('section')).toBeNull();
  },
};
