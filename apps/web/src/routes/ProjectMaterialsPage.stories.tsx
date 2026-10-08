import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { ProjectMaterialsPage } from './ProjectMaterialsPage';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const meta = {
  title: 'Pages/프로젝트 자재 현황',
  component: ProjectMaterialsPage,
  parameters: {
    router: {
      initialEntries: [`/projects/${projectId}/materials`],
      path: '/projects/:id/materials',
    },
  },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectMaterialsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 기획서 예시 잔량 15장과 마이너스 경고
    await expect(await canvas.findByLabelText('아연도강판 잔량')).toHaveTextContent('잔량 15장');
    await expect(canvas.getByLabelText('실리콘 코킹 잔량')).toHaveTextContent('잔량 -3개');
    await expect(canvas.getByRole('alert')).toHaveTextContent('반입 기록이 빠졌는지');
  },
};

export const FilterRecordsByKind: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByLabelText('아연도강판 잔량');
    await waitFor(() =>
      expect(canvas.getAllByRole('button', { name: '수량 수정' }).length).toBe(7),
    );
    await userEvent.selectOptions(canvas.getByLabelText('구분으로 거르기'), '폐기');

    await waitFor(() =>
      expect(canvas.getAllByRole('button', { name: '수량 수정' })).toHaveLength(1),
    );
  },
};

// 기록을 지우면 잔량도 바로 바뀜
export const DeleteUpdatesBalance: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByLabelText('아연도강판 잔량');
    await userEvent.selectOptions(canvas.getByLabelText('구분으로 거르기'), '폐기');
    await waitFor(() => expect(canvas.getAllByRole('button', { name: '삭제' })).toHaveLength(1));
    await userEvent.click(canvas.getByRole('button', { name: '삭제' }));
    await userEvent.click(canvas.getByRole('button', { name: '정말 삭제' }));

    // 폐기 3장이 빠지면 잔량 18장
    await waitFor(() =>
      expect(canvas.getByLabelText('아연도강판 잔량')).toHaveTextContent('잔량 18장'),
    );
  },
};
