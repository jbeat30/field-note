import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { draftKey, parseDraft, serializeDraft } from '../drafts/formDraft';
import { DEMO_PROJECTS } from '../mocks/demoSource';
import { findAccount, getWorkLogs, signIn } from '../mocks/state';
import { useDraftStore } from '../stores/draftStore';

import { WorkLogPage } from './WorkLogPage';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const routerFor = (date: string) => ({
  initialEntries: [`/work-logs?project=${projectId}&date=${date}`],
  path: '/work-logs',
});

const NEW_DAY = '2026-09-08';
const SAVED_DAY = '2026-09-02';

// 저장하지 않고 닫았던 입력을 기기에 미리 넣어 둠
const seedWorkLogDraft = (date: string, baseVersion: number | null, content: string) => {
  useDraftStore.getState().setDraft(
    draftKey('workLog', projectId, date),
    serializeDraft({
      value: { lines: [], content, area: '3층', notes: '', isChange: false, isAfterService: false },
      baseVersion,
      savedAt: '2026-10-08T01:00:00.000Z',
    }),
  );
};

const meta = {
  title: 'Pages/작업일지 임시 저장',
  component: WorkLogPage,
  parameters: { router: routerFor(NEW_DAY) },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof WorkLogPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 일지를 쓰다가 닫은 뒤 다시 열면 입력이 그대로 복구되고 안내가 나온다
export const RestoresUnsavedInput: Story = {
  beforeEach: () => seedWorkLogDraft(NEW_DAY, null, '복구될 작업 내용'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByLabelText('작업 내용')).toHaveValue('복구될 작업 내용');
    await expect(canvas.getByLabelText('작업 구역')).toHaveValue('3층');
    await expect(
      canvas.getByText(/저장하지 않고 닫았던 작성 내용을 복구했습니다/),
    ).toBeInTheDocument();
  },
};

export const DiscardRestoredInput: Story = {
  beforeEach: () => seedWorkLogDraft(NEW_DAY, null, '버릴 내용'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/복구했습니다/);
    await userEvent.click(canvas.getByRole('button', { name: '복구한 내용 버리기' }));

    await expect(canvas.getByLabelText('작업 내용')).toHaveValue('');
    await expect(canvas.queryByText(/복구했습니다/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        useDraftStore.getState().drafts[draftKey('workLog', projectId, NEW_DAY)],
      ).toBeUndefined(),
    );
  },
};

// 입력하면 잠깐 뒤 기기에 저장되고, 서버에 저장하면 지워진다
export const AutoSavesWhileTypingAndClearsOnSave: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const key = draftKey('workLog', projectId, NEW_DAY);

    await canvas.findByRole('checkbox', { name: '정판금 출근' });
    // 아직 아무것도 고치지 않았으면 초안이 없음
    await expect(useDraftStore.getState().drafts[key]).toBeUndefined();

    await fireEvent.change(canvas.getByLabelText('작업 내용'), {
      target: { value: '쓰는 중인 내용' },
    });
    await waitFor(() =>
      expect(
        parseDraft<{ content: string }>(useDraftStore.getState().drafts[key])?.value.content,
      ).toBe('쓰는 중인 내용'),
    );

    await userEvent.selectOptions(canvas.getByLabelText('작업 구분 일괄 지정'), '설치');
    await userEvent.click(canvas.getByRole('button', { name: '모두 적용' }));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/저장했습니다 \(버전 1\)/)).toBeInTheDocument();
    await waitFor(() => expect(useDraftStore.getState().drafts[key]).toBeUndefined());
  },
};

// 입력을 원래대로 되돌리면 초안도 사라짐 (서버 내용과 같은 초안은 남기지 않음)
export const NoDraftWhenBackToOriginal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const key = draftKey('workLog', projectId, NEW_DAY);

    await canvas.findByRole('checkbox', { name: '정판금 출근' });
    await fireEvent.change(canvas.getByLabelText('작업 내용'), { target: { value: '임시' } });
    await waitFor(() => expect(useDraftStore.getState().drafts[key]).toBeDefined());
    await fireEvent.change(canvas.getByLabelText('작업 내용'), { target: { value: '' } });
    await waitFor(() => expect(useDraftStore.getState().drafts[key]).toBeUndefined());
  },
};

// 그사이 서버의 일지가 바뀌었으면(다른 기기) 자동으로 덮지 않고 불러올지 묻는다
export const StaleDraftAsksBeforeLoading: Story = {
  parameters: { router: routerFor(SAVED_DAY) },
  beforeEach: () => seedWorkLogDraft(SAVED_DAY, 99, '예전 기기에서 쓰던 내용'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 서버에 있는 내용이 그대로 보임
    await expect(await canvas.findByLabelText('작업 내용')).toHaveValue(
      '3층 외장 패널 설치 (고객 요청으로 창 위치 변경 작업 포함)',
    );
    await expect(canvas.getByText(/자동으로 불러오지 않았습니다/)).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '저장해 둔 내용 불러오기' }));

    await expect(canvas.getByLabelText('작업 내용')).toHaveValue('예전 기기에서 쓰던 내용');
    await expect(canvas.getByText(/서버의 최신 내용과 비교해 확인한 뒤 저장/)).toBeInTheDocument();
  },
};

export const StaleDraftCanBeDiscarded: Story = {
  parameters: { router: routerFor(SAVED_DAY) },
  beforeEach: () => seedWorkLogDraft(SAVED_DAY, 99, '버릴 예전 내용'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/자동으로 불러오지 않았습니다/);
    await userEvent.click(canvas.getByRole('button', { name: '버리기' }));

    await waitFor(() =>
      expect(canvas.queryByText(/자동으로 불러오지 않았습니다/)).not.toBeInTheDocument(),
    );
    await expect(canvas.getByLabelText('작업 내용')).toHaveValue(
      '3층 외장 패널 설치 (고객 요청으로 창 위치 변경 작업 포함)',
    );
    await expect(
      useDraftStore.getState().drafts[draftKey('workLog', projectId, SAVED_DAY)],
    ).toBeUndefined();
  },
};

// 서버 버전이 같은 초안은 그대로 복구 (이미 저장된 일지를 고치다 닫은 경우)
export const RestoresEditOfSavedLog: Story = {
  parameters: { router: routerFor(SAVED_DAY) },
  // 서버에 있는 일지의 현재 버전과 같은 버전에서 쓰기 시작한 초안
  beforeEach: () => {
    const saved = getWorkLogs(findAccount('hanbit')!).find((log) => log.workDate === SAVED_DAY)!;

    seedWorkLogDraft(SAVED_DAY, saved.version, '고치다 닫은 내용');
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByLabelText('작업 내용')).toHaveValue('고치다 닫은 내용');
    await expect(canvas.getByText(/복구했습니다/)).toBeInTheDocument();
  },
};

// 망가진 초안이 있어도 화면은 정상으로 열림
export const BrokenDraftIsIgnored: Story = {
  beforeEach: () =>
    useDraftStore.getState().setDraft(draftKey('workLog', projectId, NEW_DAY), '{깨진 글자'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('checkbox', { name: '정판금 출근' })).toBeChecked();
    await expect(canvas.queryByText(/복구했습니다/)).not.toBeInTheDocument();
  },
};
