import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';
import { ProjectLayout } from '../layouts/ProjectLayout';
import { Route, Routes } from 'react-router';

import { ProjectSummaryPage } from './ProjectSummaryPage';

const meta = {
  title: 'Pages/프로젝트 요약',
  component: ProjectSummaryPage,
  parameters: {
    router: {
      initialEntries: [
        `/projects/${DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id}/summary`,
      ],
      path: '/projects/:id/summary',
    },
  },
  loaders: [() => signIn('hanbit')],
  decorators: [
    (Story) => (
      <Routes>
        <Route element={<ProjectLayout />}>
          <Route index element={<Story />} />
        </Route>
      </Routes>
    ),
  ],
} satisfies Meta<typeof ProjectSummaryPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sheet = within(await canvas.findByRole('article', { name: '프로젝트 요약' }));

    // 기본정보·투입·자재·변경 작업·사후 작업·사진·자료 구역이 모두 있다
    for (const title of [
      '기본정보',
      '투입 요약',
      '자재 요약',
      '변경·추가 작업',
      '사후 작업',
      '사진',
      '작업자료',
    ]) {
      await expect(sheet.getByRole('region', { name: title })).toBeInTheDocument();
    }

    await expect(sheet.getByText(/2026-001 A동 외장 판금 공사/)).toBeInTheDocument();
    await expect(sheet.getByText('40%')).toBeInTheDocument();
    // 변경·추가 작업은 번호·상태·요청자와 함께
    await expect(sheet.getByText(/#1 · 합의됨/)).toBeInTheDocument();
    // 민감 자료는 싣지 않고 건수만 알린다, 금액은 어디에도 없다
    await expect(sheet.getByText(/민감 자료 1건은 요약에 싣지 않았습니다/)).toBeInTheDocument();
    await expect(sheet.queryByText('도급 계약서')).not.toBeInTheDocument();
    await expect(sheet.queryByText(/\d원/)).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '인쇄·PDF' })).toBeInTheDocument();
  },
};
