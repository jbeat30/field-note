import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';
import { Toaster } from '../components/ui/toaster';
import { ProjectLayout } from '../layouts/ProjectLayout';
import { resetToastStore } from '../stores/toastStore';
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
  beforeEach: () => resetToastStore(),
  loaders: [() => signIn('hanbit')],
  decorators: [
    (Story) => (
      <>
        <Routes>
          <Route element={<ProjectLayout />}>
            <Route index element={<Story />} />
          </Route>
        </Routes>
        <Toaster />
      </>
    ),
  ],
} satisfies Meta<typeof ProjectSummaryPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sheet = within(await canvas.findByRole('article', { name: '프로젝트 요약' }));

    // 기본정보·투입·자재·변경 작업·사후 작업·사진·자료 구역 전체 존재
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
    // 민감 자료는 제외하고 건수만 안내, 금액은 어디에도 없음
    await expect(sheet.getByText(/민감 자료 1건은 요약에 싣지 않았습니다/)).toBeInTheDocument();
    await expect(sheet.queryByText('도급 계약서')).not.toBeInTheDocument();
    await expect(sheet.queryByText(/\d원/)).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '인쇄·PDF' })).toBeInTheDocument();

    // 자재는 고객에게 내는 보고서이므로 품명·규격·쓴 양만 표시 (반입·반출·잔량 제외)
    const materials = within(sheet.getByRole('region', { name: '자재 요약' }));

    for (const header of ['품명', '규격', '쓴 양']) {
      await expect(materials.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }

    for (const header of ['반입', '반출', '폐기', '잔량']) {
      await expect(materials.queryByRole('columnheader', { name: header })).not.toBeInTheDocument();
    }

    await expect(sheet.queryByText(/마이너스/)).not.toBeInTheDocument();
    // 사진·작업자료는 포함 기준을 명시
    await expect(
      sheet.getByText(/직접 고른 사진, 고르지 않았으면 작업 후 사진 최근 8장/),
    ).toBeInTheDocument();
    await expect(
      sheet.getByText(/안전·검사, 계약·공문 분류 중 요약에 넣기로 고른 문서/),
    ).toBeInTheDocument();
  },
};

// 엑셀 내려받기: 파일 이름을 안내하고 내보낸 기록이 남는다는 안내 병기
export const ExportDownloads: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 실제 파일 저장 창을 열지 않도록 주소 만들기를 가로챔
    URL.createObjectURL = fn(() => 'blob:mock');
    URL.revokeObjectURL = fn();
    HTMLAnchorElement.prototype.click = fn();

    await canvas.findByRole('article', { name: '프로젝트 요약' });
    await userEvent.click(canvas.getByRole('button', { name: '엑셀 내려받기' }));

    await expect(
      await screen.findByText(/프로젝트요약_2026-001\.xlsx 파일을 내려받았습니다/),
    ).toBeVisible();
  },
};
