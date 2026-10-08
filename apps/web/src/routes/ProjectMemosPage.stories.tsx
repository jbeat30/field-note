import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';
import { resetDraftStore } from '../stores/draftStore';

import { ProjectMemosPage } from './ProjectMemosPage';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const meta = {
  title: 'Pages/프로젝트 메모 노트',
  component: ProjectMemosPage,
  parameters: {
    router: { initialEntries: [`/projects/${projectId}/memos`], path: '/projects/:id/memos' },
  },
  loaders: [() => signIn('hanbit'), () => resetDraftStore()],
} satisfies Meta<typeof ProjectMemosPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('철거 후 바닥 상태 불량, 보수 필요')).toBeInTheDocument();
    // 이 프로젝트 메모 4건만 (메모함 메모는 없음)
    await expect(canvas.getAllByRole('button', { name: '삭제' })).toHaveLength(4);
    await expect(canvas.queryByText('자재 반입 시간 협의')).not.toBeInTheDocument();
  },
};

export const FilterByTag: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('철거 후 바닥 상태 불량, 보수 필요');
    await userEvent.selectOptions(canvas.getByLabelText('태그로 거르기'), '이슈');

    await waitFor(() => expect(canvas.getAllByRole('button', { name: '삭제' })).toHaveLength(1));
  },
};

export const OnlyOpenTodos: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('철거 후 바닥 상태 불량, 보수 필요');
    await userEvent.click(canvas.getByLabelText('끝내지 않은 할 일만'));

    await waitFor(() => expect(canvas.getAllByRole('button', { name: '삭제' })).toHaveLength(1));
    await expect(canvas.getByText('내일까지 샘플 승인받기')).toBeInTheDocument();
    await expect(canvas.getByLabelText('태그로 거르기')).toBeDisabled();
  },
};

export const SaveMemo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('철거 후 바닥 상태 불량, 보수 필요');
    await userEvent.type(canvas.getByLabelText('메모'), '업체 방문 일정 잡기');
    await userEvent.selectOptions(canvas.getByLabelText('태그'), '할 일');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    // 입력 칸에도 같은 글이 있으므로 목록의 메모(문단)로 찾음
    await expect(
      await canvas.findByText('업체 방문 일정 잡기', { selector: 'p' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(canvas.getAllByRole('button', { name: '삭제' })).toHaveLength(5));
  },
};
