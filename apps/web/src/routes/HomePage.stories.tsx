import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { draftKey, serializeDraft } from '../drafts/formDraft';
import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';
import { useDraftStore } from '../stores/draftStore';

import { HomePage } from './HomePage';

const meta = {
  title: 'Pages/대시보드',
  component: HomePage,
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof HomePage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 홈: 확인할 일(알림)과 진행 중 프로젝트 표 표시, 알림 설정으로 이동 가능
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alerts = within(await canvas.findByRole('region', { name: '확인할 일' }));

    await expect(alerts.getByRole('link', { name: '알림 설정' })).toHaveAttribute(
      'href',
      '/settings/alerts',
    );
    await expect(
      await canvas.findByRole('table', { name: '진행 중 프로젝트' }),
    ).toBeInTheDocument();
  },
};

// 저장하지 않고 닫았던 작업 내역이 기기에 남아 있으면 홈에서 바로 이어서 쓰도록 안내
export const ResumesUnsavedWorkLog: Story = {
  beforeEach: () => {
    const project = DEMO_PROJECTS.find((item) => item.name === 'A동 외장 판금 공사')!;

    useDraftStore.getState().setDraft(
      draftKey('workLog', project.id, '2026-10-08'),
      serializeDraft({
        value: {
          lines: [],
          content: '쓰던 작업 내역',
          area: '',
          notes: '',
          isChange: false,
          isAfterService: false,
        },
        baseVersion: null,
        savedAt: new Date().toISOString(),
      }),
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('link', {
        name: /A동 외장 판금 공사 · 10월 8일 \(목\) 작업 내역 작성 중/,
      }),
    ).toHaveAttribute('href', expect.stringMatching(/\/projects\/.+\/work\/\d{4}-\d{2}-\d{2}$/));
  },
};

export const NoDraftsNoSection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('region', { name: '확인할 일' });
    await expect(canvas.queryByRole('heading', { name: '이어서 작성' })).not.toBeInTheDocument();
  },
};

// 홈의 검색창에서 찾으면 검색 화면으로 이동 (이동한 곳에는 검색어가 이어짐)
export const SearchFormNavigates: Story = {
  // 홈 경로만 이 화면으로 두어, 다른 경로로 이동하면 스토리의 이동 표시가 나타나게 함
  parameters: { router: { initialEntries: ['/'], path: '/' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('찾기'), '배관{Enter}');
    // 라우터가 정의하지 않은 경로로 이동하면 스토리의 이동 표시가 나타남
    await expect(await within(document.body).findByTestId('navigated')).toBeInTheDocument();
  },
};

export const EmptySearchDoesNothing: Story = {
  parameters: { router: { initialEntries: ['/'], path: '/' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('찾기'), '   {Enter}');
    await expect(within(document.body).queryByTestId('navigated')).not.toBeInTheDocument();
  },
};

// 대시보드 위젯: 진행 중 프로젝트, 확인할 일, 이번 달 인력, 보증 종료 임박, 만료 임박 (09)
export const DashboardWidgets: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    for (const title of [
      '진행 중 프로젝트',
      '확인할 일',
      '이번 달 인력',
      '보증 종료 임박',
      '만료 임박',
    ]) {
      await expect(await canvas.findByRole('region', { name: title })).toBeInTheDocument();
    }

    await expect(canvas.getByText('진행 중 프로젝트', { selector: 'dt' })).toBeInTheDocument();
  },
};
