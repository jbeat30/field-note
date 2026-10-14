import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { findAccount, getWorkLogs, saveWorkLogs, signIn } from '../mocks/state';

import { ProjectWorkDayPage } from './ProjectWorkDayPage';
import { chooseOption } from '../lib/storyActions';

const projectIdOf = (name: string) => DEMO_PROJECTS.find((project) => project.name === name)!.id;

const routerFor = (name: string, date: string) => ({
  initialEntries: [`/projects/${projectIdOf(name)}/work/${date}`],
  path: '/projects/:id/work/:date',
});

const meta = {
  title: 'Pages/프로젝트 하루 작업',
  component: ProjectWorkDayPage,
  parameters: { router: routerFor('A동 외장 판금 공사', '2026-09-08') },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectWorkDayPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 2026-09-08 A동 외장 판금 공사에 투입된 사람 (시험 데이터)
const TEAM = ['정판금', '최설치', '한용접', '김일용'];

// 회사 직원 표에서 일한 사람을 고른다 (처음에는 하루 8시간으로 채워짐)
const pick = async (canvas: ReturnType<typeof within>, names: readonly string[] = TEAM) => {
  for (const name of names) {
    await userEvent.click(await canvas.findByRole('checkbox', { name: `${name} 일함` }));
  }
  await canvas.findByLabelText(`${names[0]} 일한 시간(시간)`);
};

// 작업 내역이 없는 날: 빈 채로 시작하고, 회사 직원 표에서 고른다. 이 현장 투입 인원이 먼저 보인다
export const NewDayStartsWithEmployeeTable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = within(await canvas.findByRole('list', { name: '회사 직원' }));

    await expect(table.getByRole('checkbox', { name: '정판금 일함' })).not.toBeChecked();
    // 투입 인원이 아닌 직원도 표에 있다
    await expect(table.getByRole('checkbox', { name: '오전기 일함' })).toBeInTheDocument();
    await expect(canvas.getAllByText('먼저 일한 사람을 고르세요').length).toBeGreaterThan(0);

    await pick(canvas, ['정판금']);
    // 고른 사람은 '하루(8시간)'로 채워진다
    await expect(canvas.getByLabelText('정판금 일한 시간(시간)')).toHaveValue(8);
    await expect(canvas.getByText('1명 · 8시간')).toBeInTheDocument();
  },
};

export const SaveWithBulkInput: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await pick(canvas);
    await chooseOption(canvas.getByLabelText('작업 구분 일괄 지정'), '설치');
    await userEvent.click(canvas.getByRole('button', { name: '모두 적용' }));
    await userEvent.click(canvas.getByRole('checkbox', { name: '김일용 일함' }));
    await fireEvent.change(canvas.getByLabelText('작업 내용'), {
      target: { value: '5층 패널 설치' },
    });
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/저장됐습니다 · 버전 1/)).toBeInTheDocument();
    await expect(canvas.getByText(/지연 입력/, { selector: 'p' })).toBeInTheDocument();
    // 결근 처리한 직원은 공수가 저장되지 않는다
    await waitFor(() => {
      const saved = getWorkLogs(findAccount('hanbit')!).find(
        (log) => log.workDate === '2026-09-08',
      );

      expect(saved?.status).toBe('SAVED');
      expect(saved?.entries).toHaveLength(3);
    });
  },
};

export const SaveRequiresContent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await pick(canvas);
    await chooseOption(canvas.getByLabelText('작업 구분 일괄 지정'), '설치');
    await userEvent.click(canvas.getByRole('button', { name: '모두 적용' }));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/작업 내용/, { selector: 'p' })).toBeInTheDocument();
  },
};

export const MissingCategoryBlocksSave: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await pick(canvas);
    await fireEvent.change(canvas.getByLabelText('작업 내용'), { target: { value: '작업' } });
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/작업 구분/, { selector: 'p' })).toBeInTheDocument();
  },
};

export const SplitCategoryAndQuickValue: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await pick(canvas);
    await userEvent.click(canvas.getByRole('button', { name: '한용접 작업 구분 나누기' }));

    await expect(canvas.getByLabelText('한용접 일한 시간(시간) 2')).toHaveValue(4);
    await expect(canvas.getByText(/나눠 적음 · 합계 12시간/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '한용접 줄 삭제 2' }));
    await expect(canvas.queryByLabelText('한용접 일한 시간(시간) 2')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '한용접 연장' }));
    await expect(canvas.getByLabelText('한용접 일한 시간(시간)')).toHaveValue(12);
  },
};

// 다른 날짜에서 불러오기: 기본 날짜는 가장 최근 작업 내역(09-04, 임시 저장)
export const LoadFromOtherDate: Story = {
  parameters: { router: routerFor('A동 외장 판금 공사', '2026-09-05') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '다른 날짜에서 불러오기' }));

    const dialog = within(
      await within(document.body).findByRole('dialog', { name: '다른 날짜에서 불러오기' }),
    );

    await waitFor(() => expect(dialog.getByLabelText('불러올 날짜')).toHaveValue('2026-09-04'));
    await userEvent.click(dialog.getByRole('button', { name: '불러오기' }));

    await expect(await canvas.findByText(/작업 내역을 불러왔습니다/)).toBeInTheDocument();
    await expect(canvas.getByLabelText('작업 내용')).toHaveValue('4층 패널 설치 (작성 중)');
  },
};

export const ExistingSavedLogAndRevisions: Story = {
  parameters: { router: routerFor('A동 외장 판금 공사', '2026-09-02') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByLabelText('작업 내용')).toHaveValue(
      '3층 외장 패널 설치 (고객 요청으로 창 위치 변경 작업 포함)',
    );
    await expect(canvas.getByLabelText('변경·추가 작업이 포함되어 있습니다')).toBeChecked();

    await userEvent.click(canvas.getByText('수정 이력 보기'));
    await expect(
      await canvas.findByText('3층 외장 패널 설치', { exact: false, selector: 'span' }),
    ).toBeInTheDocument();
  },
};

export const EditSavedLogBumpsVersion: Story = {
  parameters: { router: routerFor('A동 외장 판금 공사', '2026-09-03') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const content = await canvas.findByLabelText('작업 내용');

    await fireEvent.change(content, { target: { value: '4층 패널 가공품 반입 (수정)' } });
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/저장됐습니다 · 버전 2/)).toBeInTheDocument();
  },
};

export const DraftLogShowsNotice: Story = {
  parameters: { router: routerFor('A동 외장 판금 공사', '2026-09-04') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/임시 저장 · 버전/)).toBeInTheDocument();
  },
};

// 다른 기기에서 먼저 고친 경우: 충돌을 알리고 최신 내용을 불러오게 한다
export const ConflictOnStaleVersion: Story = {
  parameters: { router: routerFor('A동 외장 판금 공사', '2026-09-03') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const content = await canvas.findByLabelText('작업 내용');

    // 서버(목업) 쪽 버전을 올려 화면의 버전을 오래된 것으로 만든다
    const account = findAccount('hanbit')!;

    saveWorkLogs(
      account,
      getWorkLogs(account).map((log) =>
        log.workDate === '2026-09-03' && log.projectId === projectIdOf('A동 외장 판금 공사')
          ? { ...log, version: log.version + 1 }
          : log,
      ),
    );
    await fireEvent.change(content, { target: { value: '충돌 확인' } });
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(
      await canvas.findByRole('button', { name: '최신 내용 불러오기' }),
    ).toBeInTheDocument();
  },
};

export const AddEmployeeWithoutAssignmentAsksConfirm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await pick(canvas);
    await userEvent.click(canvas.getByRole('checkbox', { name: '오전기 일함' }));
    await chooseOption(canvas.getByLabelText('작업 구분 일괄 지정'), '설치');
    await userEvent.click(canvas.getByRole('button', { name: '모두 적용' }));
    await fireEvent.change(canvas.getByLabelText('작업 내용'), { target: { value: '지원 작업' } });
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await userEvent.click(
      await within(document.body).findByRole('button', { name: '투입 추가하고 저장' }),
    );
    await expect(await canvas.findByText(/투입 자동 추가: 오전기/)).toBeInTheDocument();
  },
};

// 잘못 고른 사람은 체크를 풀면 이 날 기록에서 아예 빠진다
export const RemoveAddedEmployee: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await pick(canvas, ['오전기']);
    await userEvent.click(canvas.getByRole('checkbox', { name: '오전기 일함' }));

    await expect(canvas.queryByLabelText('오전기 일한 시간(시간)')).not.toBeInTheDocument();
    await expect(canvas.getByText('0명 · 0시간')).toBeInTheDocument();
  },
};

export const PlannedProjectNeedsStart: Story = {
  parameters: { router: routerFor('미래오피스 천장 마감', '2026-09-08') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/먼저 작업을 시작/)).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
  },
};

export const SuspendedProjectNeedsConfirm: Story = {
  parameters: { router: routerFor('B동 덕트 설치', '2026-09-08') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByLabelText(/중단 중인 프로젝트에 작업 내역을 쓰는 것을 확인/),
    ).not.toBeChecked();
  },
};

export const OutsidePeriod: Story = {
  parameters: { router: routerFor('A동 외장 판금 공사', '2026-06-01') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/프로젝트 기간 밖/)).toBeInTheDocument();
  },
};

// 사람마다 일한 시간이 다를 수 있다: 한 사람만 늘리고 줄이고, 모두에게 한 번에도 정할 수 있다
export const DifferentHoursPerPerson: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await pick(canvas);
    await expect(canvas.getByText('4명 · 32시간')).toBeInTheDocument();

    // 정판금만 30분씩 두 번 늘리고, 최설치는 반일
    await userEvent.click(canvas.getByRole('button', { name: '정판금 30분 늘리기' }));
    await userEvent.click(canvas.getByRole('button', { name: '정판금 30분 늘리기' }));
    await expect(canvas.getByLabelText('정판금 일한 시간(시간)')).toHaveValue(9);
    await userEvent.click(canvas.getByRole('button', { name: '최설치 반일' }));
    await expect(canvas.getByLabelText('최설치 일한 시간(시간)')).toHaveValue(4);
    // 합계는 사람별 합: 9 + 4 + 8 + 8 = 29
    await expect(canvas.getByText('4명 · 29시간')).toBeInTheDocument();

    // 안 나온 사람은 체크를 풀면 합계에서 빠짐
    await userEvent.click(canvas.getByRole('checkbox', { name: '김일용 일함' }));
    await expect(canvas.getByText('3명 · 21시간')).toBeInTheDocument();

    // 모두에게 한 번에: 일한 시간 머리의 "모두 반일"
    await userEvent.click(canvas.getByRole('button', { name: '반일' }));
    await expect(canvas.getByLabelText('정판금 일한 시간(시간)')).toHaveValue(4);
    await expect(canvas.getByText('3명 · 12시간')).toBeInTheDocument();
  },
};
