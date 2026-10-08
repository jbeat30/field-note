import type { SearchHit, SearchResponse } from '@field-note/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { SearchResults } from './SearchResults';

const hit = (patch: Partial<SearchHit>): SearchHit => ({
  type: 'PROJECT',
  id: '0198d000-0000-7000-8000-000000000001',
  title: '제목',
  snippet: null,
  projectId: null,
  projectName: null,
  date: null,
  badge: null,
  ...patch,
});

const group = (items: SearchHit[], hasMore = false) => ({ items, hasMore });

const results: SearchResponse = {
  q: '배관',
  projects: group([
    hit({ type: 'PROJECT', id: 'p1', title: 'B동 배관 공사', snippet: '2026-002 · B동 현장' }),
  ]),
  employees: group([
    hit({ type: 'EMPLOYEE', id: 'e1', title: '배관반장', snippet: '반장' }),
    hit({ type: 'EMPLOYEE', id: 'e2', title: '배관 김씨', badge: 'LEFT' }),
  ]),
  memos: group(
    [
      hit({
        type: 'MEMO',
        id: 'm1',
        title: '3층 배관 위치 다시 확인',
        snippet: '3층 배관 위치 다시 확인해야 함 내일 오전',
        projectId: 'p1',
        projectName: 'B동 배관 공사',
        date: '2026-10-07',
      }),
    ],
    true,
  ),
  documents: group([
    hit({
      type: 'DOCUMENT',
      id: 'd1',
      title: '배관 시공도',
      projectId: 'p1',
      projectName: 'B동 배관 공사',
      date: '2026-10-06',
      badge: 'SENSITIVE',
    }),
  ]),
  workLogs: group([
    hit({
      type: 'WORK_LOG',
      id: 'w1',
      title: '외장 판넬 설치',
      snippet: '…설치 중 배관 간섭 확인',
      projectId: 'p1',
      projectName: 'B동 배관 공사',
      date: '2026-10-06',
    }),
  ]),
};

const meta = {
  title: 'Search/검색 결과',
  component: SearchResults,
  args: { results },
} satisfies Meta<typeof SearchResults>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllTypes: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const headings = canvas
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);

    await expect(headings).toEqual(['프로젝트', '직원', '메모', '자료', '일지']);
    // 종류마다 이동할 곳이 다름
    await expect(canvas.getByRole('link', { name: /B동 배관 공사 2026-002/ })).toHaveAttribute(
      'href',
      '/projects/p1',
    );
    await expect(canvas.getByRole('link', { name: /배관반장/ })).toHaveAttribute(
      'href',
      '/employees/e1',
    );
    await expect(canvas.getByRole('link', { name: /3층 배관 위치 다시 확인/ })).toHaveAttribute(
      'href',
      '/projects/p1/memos',
    );
    await expect(canvas.getByRole('link', { name: /배관 시공도/ })).toHaveAttribute(
      'href',
      '/projects/p1/documents?doc=d1',
    );
    await expect(canvas.getByRole('link', { name: /외장 판넬 설치/ })).toHaveAttribute(
      'href',
      '/work-logs?project=p1&date=2026-10-06',
    );
  },
};

export const BadgesAndMore: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('민감')).toBeInTheDocument();
    await expect(canvas.getByText('퇴사')).toBeInTheDocument();
    // 개수 제한 때문에 더 있는 종류만 안내
    await expect(canvas.getAllByText(/결과가 더 있습니다/)).toHaveLength(1);
    await expect(
      canvas.getByText('메모 결과가 더 있습니다. 검색어를 더 구체적으로 입력해 보세요'),
    ).toBeInTheDocument();
  },
};

// 프로젝트 없는 메모는 메모함으로
export const InboxMemoGoesToInbox: Story = {
  args: {
    results: {
      ...results,
      projects: group([]),
      employees: group([]),
      documents: group([]),
      workLogs: group([]),
      memos: group([
        hit({
          type: 'MEMO',
          id: 'm9',
          title: '메모함 메모',
          snippet: '메모함 메모',
          date: '2026-10-07',
        }),
      ]),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('link', { name: /메모함 메모/ })).toHaveAttribute(
      'href',
      '/inbox',
    );
    // 결과가 없는 종류는 제목도 없음
    await expect(canvas.queryByRole('heading', { name: '프로젝트' })).not.toBeInTheDocument();
  },
};

export const NoResults: Story = {
  args: {
    results: {
      ...results,
      q: '없는말',
      projects: group([]),
      employees: group([]),
      memos: group([]),
      documents: group([]),
      workLogs: group([]),
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      '‘없는말’에 맞는 결과가 없습니다',
    );
  },
};
