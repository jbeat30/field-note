import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { ProjectMemosPage } from './ProjectMemosPage';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const meta = {
  title: 'Pages/프로젝트 메모 노트',
  component: ProjectMemosPage,
  parameters: {
    router: { initialEntries: [`/projects/${projectId}/memos`], path: '/projects/:id/memos' },
  },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectMemosPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 쓰기 폼 없이 날짜별로 모아 보고 날짜마다 그날 작업 기록으로 가는 링크 제공
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('철거 후 바닥 상태 불량, 보수 필요')).toBeInTheDocument();
    // 이 프로젝트 메모 4건만 (메모함 메모는 없음)
    await expect(canvas.getAllByRole('button', { name: '삭제' })).toHaveLength(4);
    await expect(canvas.queryByText('자재 반입 시간 협의')).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    await expect(canvas.getAllByRole('link', { name: '작업 기록 보기' })[0]).toHaveAttribute(
      'href',
      expect.stringContaining(`/projects/${projectId}/work/`),
    );
  },
};

export const FilterByTag: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('철거 후 바닥 상태 불량, 보수 필요');
    await userEvent.click(canvas.getByRole('button', { name: '이슈' }));

    await waitFor(() => expect(canvas.getAllByRole('button', { name: '삭제' })).toHaveLength(1));
  },
};

export const OnlyOpenTodos: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('철거 후 바닥 상태 불량, 보수 필요');
    await userEvent.click(canvas.getByRole('button', { name: '끝내지 않은 할 일' }));

    await waitFor(() => expect(canvas.getAllByRole('button', { name: '삭제' })).toHaveLength(1));
    await expect(canvas.getByText('내일까지 샘플 승인받기')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '끝내지 않은 할 일' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};
