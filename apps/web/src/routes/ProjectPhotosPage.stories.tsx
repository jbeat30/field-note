import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { ProjectPhotosPage } from './ProjectPhotosPage';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const meta = {
  title: 'Pages/프로젝트 사진첩',
  component: ProjectPhotosPage,
  parameters: {
    router: { initialEntries: [`/projects/${projectId}/photos`], path: '/projects/:id/photos' },
  },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectPhotosPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', { name: '사진첩' })).toBeInTheDocument();
    // 더미 사진 5장이 최근순으로 보임
    await waitFor(() =>
      expect(canvas.getAllByRole('button', { name: /사진 열기/ })).toHaveLength(5),
    );
    await expect(canvas.getByText('대표')).toBeInTheDocument();
  },
};

export const FilterByCategory: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() =>
      expect(canvas.getAllByRole('button', { name: /사진 열기/ })).toHaveLength(5),
    );
    await userEvent.selectOptions(canvas.getByLabelText('구분으로 거르기'), '작업 전');

    await waitFor(() =>
      expect(canvas.getAllByRole('button', { name: /사진 열기/ })).toHaveLength(2),
    );
  },
};

export const BeforeAfterComparison: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '전후 비교' }));

    await expect(await canvas.findByRole('heading', { name: '3층 301호' })).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: '3층 302호' })).toBeInTheDocument();
  },
};

export const OpenDetailAndDelete: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = await canvas.findAllByRole('button', { name: /사진 열기/ });

    await userEvent.click(buttons[0]!);

    const dialog = within(await within(document.body).findByRole('dialog'));

    await userEvent.click(dialog.getByRole('button', { name: '삭제' }));
    await userEvent.click(dialog.getByRole('button', { name: '정말 삭제' }));

    await waitFor(() =>
      expect(canvas.getAllByRole('button', { name: /사진 열기/ })).toHaveLength(4),
    );
  },
};
