import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { draftKey, serializeDraft } from '../drafts/formDraft';
import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';
import { useDraftStore } from '../stores/draftStore';

import { HomePage } from './HomePage';

const meta = {
  title: 'Pages/홈',
  component: HomePage,
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof HomePage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 정리 안 된 메모함과 끝내지 않은 할 일 건수를 알려 주고 메모함으로 이동
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/정리 안 된 메모 3건/)).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: /메모함/ })).toHaveAttribute('href', '/inbox');
  },
};

// 저장하지 않고 닫았던 일지가 기기에 남아 있으면 홈에서 바로 이어서 쓰도록 안내
export const ResumesUnsavedWorkLog: Story = {
  beforeEach: () => {
    const project = DEMO_PROJECTS.find((item) => item.name === 'A동 외장 판금 공사')!;

    useDraftStore.getState().setDraft(
      draftKey('workLog', project.id, '2026-10-08'),
      serializeDraft({
        value: {
          lines: [],
          content: '쓰던 일지',
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
        name: /A동 외장 판금 공사 · 10월 8일 \(목\) 일지 작성 중/,
      }),
    ).toHaveAttribute('href', expect.stringContaining('/work-logs?project='));
  },
};

export const NoDraftsNoSection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/정리 안 된 메모/);
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
