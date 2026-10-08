import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';
import { resetDraftStore } from '../stores/draftStore';
import { useUiStore } from '../stores/uiStore';

import { QuickAddSheet } from './QuickAddSheet';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const meta = {
  title: 'Layout/빠른 추가',
  component: QuickAddSheet,
  loaders: [
    () => signIn('hanbit'),
    () => resetDraftStore(),
    () => useUiStore.setState({ isQuickAddOpen: true }),
  ],
} satisfies Meta<typeof QuickAddSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// 프로젝트 밖에서는 메모함에 저장하고 사진은 프로젝트를 먼저 고르게 함
export const OutsideProject: Story = {
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'));

    await expect(dialog.getByRole('link', { name: '사진 (프로젝트 고르기)' })).toHaveAttribute(
      'href',
      '/projects',
    );
    await expect(dialog.getByRole('link', { name: '오늘 일지' })).toHaveAttribute(
      'href',
      '/work-logs',
    );

    await userEvent.click(dialog.getByRole('button', { name: '메모' }));
    await expect(dialog.getByText(/메모함에 저장합니다/)).toBeInTheDocument();

    await userEvent.type(dialog.getByLabelText('메모'), '현장에서 적은 한 줄');
    await userEvent.click(dialog.getByRole('button', { name: '메모함에 저장' }));

    // 저장하면 닫힘
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await expect(useUiStore.getState().isQuickAddOpen).toBe(false);
  },
};

// 프로젝트 화면에서는 그 프로젝트로 바로 연결
export const InsideProject: Story = {
  parameters: { router: { initialEntries: [`/projects/${projectId}`], path: '/projects/:id/*' } },
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'));

    await expect(dialog.getByRole('link', { name: '사진' })).toHaveAttribute(
      'href',
      `/projects/${projectId}/photos`,
    );
    await expect(dialog.getByRole('link', { name: '오늘 일지' })).toHaveAttribute(
      'href',
      `/work-logs?project=${projectId}`,
    );
    await expect(dialog.getByRole('link', { name: '자재 (일지에서 입력)' })).toHaveAttribute(
      'href',
      `/work-logs?project=${projectId}`,
    );

    await userEvent.click(dialog.getByRole('button', { name: '메모' }));
    await expect(dialog.getByText('이 프로젝트의 메모 노트에 저장합니다')).toBeInTheDocument();
  },
};

// 일지 화면에서도 보고 있는 프로젝트로 바로 연결 (일지를 쓰다가 사진·메모를 더하는 흐름)
export const InsideWorkLogScreen: Story = {
  parameters: {
    router: {
      initialEntries: [`/work-logs?project=${projectId}&date=2026-10-08`],
      path: '/work-logs',
    },
  },
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'));

    await expect(dialog.getByRole('link', { name: '사진' })).toHaveAttribute(
      'href',
      `/projects/${projectId}/photos`,
    );

    await userEvent.click(dialog.getByRole('button', { name: '메모' }));
    await expect(dialog.getByText('이 프로젝트의 메모 노트에 저장합니다')).toBeInTheDocument();
  },
};
