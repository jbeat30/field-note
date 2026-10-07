import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { findAccount, getWorkLogs, saveWorkLogs, signIn } from '../mocks/state';

import { WorkLogPage } from './WorkLogPage';

const projectIdOf = (name: string) => DEMO_PROJECTS.find((project) => project.name === name)!.id;

const routerFor = (name: string, date: string) => ({
  initialEntries: [`/work-logs?project=${projectIdOf(name)}&date=${date}`],
  path: '/work-logs',
});

const meta = {
  title: 'Pages/작업일지 입력',
  component: WorkLogPage,
  parameters: { router: routerFor('A동 외장 판금 공사', '2026-09-08') },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof WorkLogPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 일지가 없는 날: 그날 투입된 직원이 행으로 미리 채워진다
export const NewDayPrefilledFromAssignments: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('checkbox', { name: '정판금 출근' })).toBeChecked();
    await expect(canvas.getByRole('checkbox', { name: '최설치 출근' })).toBeChecked();
    await expect(canvas.getByRole('checkbox', { name: '김일용 출근' })).toBeChecked();
    // 투입이 끝난 직원은 행에 없음
    await expect(canvas.queryByRole('checkbox', { name: '오전기 출근' })).not.toBeInTheDocument();
    await expect(canvas.getByLabelText('정판금 공수 (MD)')).toHaveValue(1);
  },
};

export const SaveWithBulkInput: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('checkbox', { name: '정판금 출근' });
    await userEvent.selectOptions(canvas.getByLabelText('작업 구분 일괄 지정'), '설치');
    await userEvent.click(canvas.getByRole('button', { name: '모두 적용' }));
    await userEvent.click(canvas.getByRole('checkbox', { name: '김일용 출근' }));
    await fireEvent.change(canvas.getByLabelText('작업 내용'), {
      target: { value: '5층 패널 설치' },
    });
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/저장했습니다 \(버전 1\)/)).toBeInTheDocument();
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

export const DraftSaveWithoutContent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('checkbox', { name: '정판금 출근' });
    await userEvent.selectOptions(canvas.getByLabelText('작업 구분 일괄 지정'), '설치');
    await userEvent.click(canvas.getByRole('button', { name: '모두 적용' }));
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));

    await expect(await canvas.findByText(/임시 저장했습니다/)).toBeInTheDocument();
  },
};

export const SaveRequiresContent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('checkbox', { name: '정판금 출근' });
    await userEvent.selectOptions(canvas.getByLabelText('작업 구분 일괄 지정'), '설치');
    await userEvent.click(canvas.getByRole('button', { name: '모두 적용' }));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/작업 내용/, { selector: 'p' })).toBeInTheDocument();
  },
};

export const MissingCategoryBlocksSave: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('checkbox', { name: '정판금 출근' });
    await fireEvent.change(canvas.getByLabelText('작업 내용'), { target: { value: '작업' } });
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/작업 구분/, { selector: 'p' })).toBeInTheDocument();
  },
};

export const SplitCategoryAndQuickValue: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('checkbox', { name: '한용접 출근' });
    await userEvent.click(canvas.getByRole('button', { name: '한용접 작업 구분 나누기' }));

    await expect(canvas.getByLabelText('한용접 공수 (MD) 2')).toHaveValue(0.5);
    await userEvent.click(canvas.getByRole('button', { name: '한용접 연장' }));
    await expect(canvas.getByLabelText('한용접 공수 (MD)')).toHaveValue(1.5);
    await userEvent.click(canvas.getByRole('button', { name: '한용접 줄 삭제 2' }));
    await expect(canvas.queryByLabelText('한용접 공수 (MD) 2')).not.toBeInTheDocument();
  },
};

// 가장 최근 일지(09-04, 임시 저장)의 내용을 복사
export const CopyPreviousLog: Story = {
  parameters: { router: routerFor('A동 외장 판금 공사', '2026-09-05') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: /일지와 동일|어제와 동일/ }));

    await expect(await canvas.findByText(/일지를 복사했습니다/)).toBeInTheDocument();
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

    await expect(await canvas.findByText(/저장했습니다 \(버전 2\)/)).toBeInTheDocument();
  },
};

export const DraftLogShowsNotice: Story = {
  parameters: { router: routerFor('A동 외장 판금 공사', '2026-09-04') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/집계에 반영되지 않습니다/)).toBeInTheDocument();
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

    await canvas.findByRole('checkbox', { name: '정판금 출근' });
    await userEvent.selectOptions(
      canvas.getByLabelText('직원 추가'),
      (await canvas.findByRole('option', { name: /오전기/ })) as HTMLOptionElement,
    );
    await userEvent.click(canvas.getByRole('button', { name: '직원 추가' }));
    await userEvent.selectOptions(canvas.getByLabelText('작업 구분 일괄 지정'), '설치');
    await userEvent.click(canvas.getByRole('button', { name: '모두 적용' }));
    await fireEvent.change(canvas.getByLabelText('작업 내용'), { target: { value: '지원 작업' } });
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await userEvent.click(await canvas.findByRole('button', { name: '투입 추가하고 저장' }));
    await expect(
      await canvas.findByText(/투입을 자동으로 추가했습니다: 오전기/),
    ).toBeInTheDocument();
  },
};

export const SaveSeveralDates: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('checkbox', { name: '정판금 출근' });
    await userEvent.selectOptions(canvas.getByLabelText('작업 구분 일괄 지정'), '설치');
    await userEvent.click(canvas.getByRole('button', { name: '모두 적용' }));
    await fireEvent.change(canvas.getByLabelText('작업 내용'), {
      target: { value: '같은 작업 반복' },
    });
    await fireEvent.change(canvas.getByLabelText('추가 날짜'), { target: { value: '2026-09-09' } });
    await userEvent.click(canvas.getByRole('button', { name: '날짜 추가' }));
    await fireEvent.change(canvas.getByLabelText('추가 날짜'), { target: { value: '2026-09-02' } });
    await userEvent.click(canvas.getByRole('button', { name: '날짜 추가' }));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    const results = await canvas.findByRole('list', { name: '추가 날짜 결과' });

    await expect(within(results).getByText(/9월 9일.*저장했습니다/)).toBeInTheDocument();
    await expect(within(results).getByText(/9월 2일.*건너뛰었습니다/)).toBeInTheDocument();
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
      await canvas.findByLabelText(/중단 중인 프로젝트에 일지를 쓰는 것을 확인/),
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

export const RecentLogsList: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', { name: '최근 일지' })).toBeInTheDocument();
    await expect(canvas.getAllByText('임시 저장').length).toBeGreaterThan(0);
  },
};
