import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route, Routes } from 'react-router';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { ProjectLayout } from '../layouts/ProjectLayout';

import { resetMockCredentials } from '../mocks/credentialHandlers';
import { DEMO_PROJECTS } from '../mocks/demoSource';
import { findAccount, getProjects, saveProjects, signIn } from '../mocks/state';

import { ProjectCardPage } from './ProjectCardPage';

const routerFor = (name: string) => ({
  initialEntries: [`/projects/${DEMO_PROJECTS.find((project) => project.name === name)!.id}`],
  path: '/projects/:id',
});

const meta = {
  title: 'Pages/프로젝트 카드',
  component: ProjectCardPage,
  parameters: { router: routerFor('A동 외장 판금 공사') },
  // 머리(이름·상태·메뉴)는 프로젝트 작업 공간 틀이 그리므로 틀 안에서 시험한다. 모든 구역을 한 화면에 그려 확인
  decorators: [
    (Story) => (
      <Routes>
        <Route element={<ProjectLayout />}>
          <Route index element={<Story />} />
        </Route>
      </Routes>
    ),
  ],
  loaders: [
    () => {
      // 스토리가 다시 그려져도 필요 자격 상태가 이어지지 않게 처음으로 되돌림
      resetMockCredentials();
      signIn('hanbit');
    },
  ],
} satisfies Meta<typeof ProjectCardPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('heading', { name: 'A동 외장 판금 공사' }),
    ).toBeInTheDocument();
    // 코드와 상태는 보이기만 하고 수정 칸이 없음
    await expect(canvas.getByText('2026-001')).toBeInTheDocument();
    await expect(canvas.getByText('현재 상태').nextElementSibling).toHaveTextContent('진행');
    await expect(canvas.queryByLabelText('프로젝트 코드')).not.toBeInTheDocument();
    await expect(await canvas.findByLabelText('현장 이름')).toHaveValue('A동 신축 현장');
    await expect(canvas.getByLabelText('주소')).toHaveValue('서울특별시 중구 세종대로 110');
    await expect(canvas.getByLabelText('현장 연락처')).toHaveValue('02-0000-0101');
    await expect(canvas.getByLabelText('출입·주의 메모')).toHaveValue(
      '정문 출입증 필요, 작업 시간 08~18시, 주차는 지하 2층',
    );
    await expect(canvas.getByLabelText('고객')).toHaveDisplayValue('가나다건설');
    await expect(canvas.getByLabelText('담당자')).toHaveDisplayValue('송소장 (소장)');
    await expect(canvas.getByLabelText('판금')).toBeChecked();
    await expect(canvas.getByLabelText('설비')).not.toBeChecked();
    await expect(canvas.getByLabelText('계약일')).toHaveValue('2026-06-20');
    await expect(canvas.getByLabelText('시작 예정일')).toHaveValue('2026-07-15');
    await expect(canvas.getByLabelText('종료 예정일')).toHaveValue('2026-11-30');
    await expect(canvas.getByRole('link', { name: '지도 열기' })).toHaveAttribute(
      'href',
      'https://map.example.com/a-dong',
    );
    await expect(canvas.getByRole('button', { name: '저장' })).toBeDisabled();
  },
};

export const EditAndSave: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByLabelText('프로젝트명');

    await userEvent.clear(name);
    await userEvent.type(name, 'A동 외장 판금 공사 (변경)');
    await userEvent.click(canvas.getByLabelText('설비'));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(canvas.getByLabelText('프로젝트명')).toHaveValue('A동 외장 판금 공사 (변경)');
    await expect(canvas.getByLabelText('설비')).toBeChecked();
    // 코드는 그대로
    await expect(canvas.getByText('2026-001')).toBeInTheDocument();
  },
};

export const ClearOptionalFields: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.clear(await canvas.findByLabelText('주소'));
    await userEvent.clear(canvas.getByLabelText('현장 연락처'));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(canvas.getByLabelText('주소')).toHaveValue('');
  },
};

export const EndBeforeStart: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const end = await canvas.findByLabelText('종료 예정일');

    fireEvent.change(end, { target: { value: '2026-07-01' } });
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(
      await canvas.findByText('종료 예정일은 시작 예정일보다 빠를 수 없습니다'),
    ).toBeInTheDocument();
  },
};

export const InvalidPhone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const phone = await canvas.findByLabelText('현장 연락처');

    await userEvent.clear(phone);
    await userEvent.type(phone, '전화');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/숫자와 - \( \) \+ 만 입력/)).toBeInTheDocument();
  },
};

// 이미 숨긴 고객(옛날상가)이 연결된 프로젝트는 카드에서 계속 보이지만, 다른 프로젝트에서는 새로 고를 수 없음
export const HiddenClientStillShown: Story = {
  parameters: { router: routerFor('옛날상가 간판 교체') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByLabelText('고객')).toHaveDisplayValue('옛날상가 (숨김)');
    await expect(canvas.getByText('현재 상태').nextElementSibling).toHaveTextContent('완료');
  },
};

export const MultipleTradesShown: Story = {
  parameters: { router: routerFor('B동 덕트 설치') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByLabelText('판금')).toBeChecked();
    await expect(canvas.getByLabelText('설비')).toBeChecked();
    await expect(canvas.getByText('현재 상태').nextElementSibling).toHaveTextContent('중단');
  },
};

export const NotFound: Story = {
  parameters: {
    router: {
      initialEntries: ['/projects/0198d000-0000-7000-8000-000000000999'],
      path: '/projects/:id',
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: '프로젝트를 찾을 수 없습니다' }),
    ).toBeInTheDocument();
  },
};

const panel = (canvasElement: HTMLElement) => within(canvasElement);

export const StatusPanelInProgress: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await expect(await canvas.findByText('실제 시작일')).toBeInTheDocument();
    await expect(canvas.getByText('2026-07-15', { selector: 'dd' })).toBeInTheDocument();
    // 진행 중에는 중단·완료·취소로 바꿀 수 있고 재개는 없음
    await expect(canvas.getByRole('button', { name: '작업 중단' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '완료 처리' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '프로젝트 취소' })).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: '작업 재개' })).not.toBeInTheDocument();
    // 변경 이력
    await expect(await canvas.findByText(/2026-07-15 예정 → 진행/)).toBeInTheDocument();
  },
};

export const StartPlannedProject: Story = {
  parameters: { router: routerFor('미래오피스 천장 마감') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await expect(await canvas.findByText('아직 시작 전')).toBeInTheDocument();
    await userEvent.click(await canvas.findByRole('button', { name: '작업 시작' }));
    await userEvent.click(
      within(await canvas.findByRole('form', { name: '작업 시작 확인' })).getByRole('button', {
        name: '확인',
      }),
    );

    await expect(await canvas.findByText("'진행' 상태로 바꿨습니다")).toBeInTheDocument();
    await expect(canvas.getByText('현재 상태').nextElementSibling).toHaveTextContent('진행');
    // 실제 시작일이 오늘로 기록되고 이력이 한 건 생김
    await expect(canvas.queryByText('아직 시작 전')).not.toBeInTheDocument();
    await expect(await canvas.findByText(/예정 → 진행/)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '작업 중단' })).toBeInTheDocument();
  },
};

export const SuspendNeedsReason: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '작업 중단' }));

    const form = within(await canvas.findByRole('form', { name: '작업 중단 확인' }));

    await userEvent.click(form.getByRole('button', { name: '확인' }));

    await expect(await form.findByText('사유를 입력해 주세요')).toBeInTheDocument();
    await expect(canvas.getByText('현재 상태').nextElementSibling).toHaveTextContent('진행');
  },
};

export const SuspendWithReasonAndResume: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '작업 중단' }));

    const form = within(await canvas.findByRole('form', { name: '작업 중단 확인' }));

    await userEvent.type(form.getByLabelText('사유 (필수)'), '우천으로 중단');
    await userEvent.click(form.getByRole('button', { name: '확인' }));

    await expect(await canvas.findByText("'중단' 상태로 바꿨습니다")).toBeInTheDocument();
    await expect(await canvas.findByText('사유: 우천으로 중단')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '작업 재개' }));
    await userEvent.click(
      within(await canvas.findByRole('form', { name: '작업 재개 확인' })).getByRole('button', {
        name: '확인',
      }),
    );

    await expect(await canvas.findByText("'진행' 상태로 바꿨습니다")).toBeInTheDocument();
    // 재개해도 실제 시작일은 그대로
    await expect(canvas.getByText('2026-07-15', { selector: 'dd' })).toBeInTheDocument();
  },
};

export const FutureDateRejected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '완료 처리' }));

    const form = within(await canvas.findByRole('form', { name: '완료 처리 확인' }));
    const date = form.getByLabelText('실제 완료일');

    fireEvent.change(date, { target: { value: '2099-01-01' } });
    await userEvent.click(form.getByRole('button', { name: '확인' }));

    await expect(await form.findByText(/오늘 이후 날짜로 입력할 수 없습니다/)).toBeInTheDocument();
  },
};

export const CompleteProject: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '완료 처리' }));
    await userEvent.click(
      within(await canvas.findByRole('form', { name: '완료 처리 확인' })).getByRole('button', {
        name: '확인',
      }),
    );

    await expect(await canvas.findByText("'완료' 상태로 바꿨습니다")).toBeInTheDocument();
    // 완료하면 보증 시작·종료 처리로 이어갈 수 있다 (기본정보는 계속 수정 가능)
    await expect(await canvas.findByRole('button', { name: '보증 시작' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '종료 처리' })).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: '작업 중단' })).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '저장' })).toBeInTheDocument();
  },
};

// 완료 전에 확인할 것을 알려 주되 막지는 않는다 (§10.3)
export const CompleteShowsNotices: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '완료 처리' }));

    const form = within(await canvas.findByRole('form', { name: '완료 처리 확인' }));
    const notices = within(await form.findByRole('list', { name: '확인할 것' }));

    // 더미: 임시 저장 작업 내역 1건, 진행률 40%, 협의 중 변경 작업 1건
    await expect(notices.getByText(/임시 저장된 작업 내역가 1건/)).toBeInTheDocument();
    await expect(notices.getByText(/진행률이 40%입니다/)).toBeInTheDocument();
    await expect(notices.getByText(/협의 중인 변경·추가 작업이 1건/)).toBeInTheDocument();

    // 안내가 있어도 완료할 수 있다
    await userEvent.click(form.getByRole('button', { name: '확인' }));
    await expect(await canvas.findByText("'완료' 상태로 바꿨습니다")).toBeInTheDocument();
  },
};

export const CancelMakesProjectReadOnly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '프로젝트 취소' }));

    const form = within(await canvas.findByRole('form', { name: '프로젝트 취소 확인' }));

    await userEvent.click(form.getByRole('button', { name: '확인' }));
    await expect(await form.findByText('사유를 입력해 주세요')).toBeInTheDocument();
    await userEvent.type(form.getByLabelText('사유 (필수)'), '계약 해지');
    await userEvent.click(form.getByRole('button', { name: '확인' }));

    await expect(await canvas.findByText("'취소' 상태로 바꿨습니다")).toBeInTheDocument();
    await expect(await canvas.findByText(/취소된 프로젝트입니다/)).toBeInTheDocument();
    // 취소하면 기본정보를 더 수정할 수 없고 저장 버튼이 없음
    await expect(
      await canvas.findByText(/상태의 프로젝트는 수정할 수 없습니다/),
    ).toBeInTheDocument();
    await expect(canvas.getByLabelText('프로젝트명')).toBeDisabled();
    await expect(canvas.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
  },
};

export const SuspendedProjectHistory: Story = {
  parameters: { router: routerFor('B동 덕트 설치') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await expect(await canvas.findByText('사유: 철골 자재 납품 지연으로 중단')).toBeInTheDocument();
    // 중단 중에는 재개와 취소만 가능
    await expect(canvas.getByRole('button', { name: '작업 재개' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '프로젝트 취소' })).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: '완료 처리' })).not.toBeInTheDocument();
    // 최근 변경(중단)이 이력 맨 앞
    const items = canvas
      .getAllByRole('listitem')
      .filter((item) => /→/.test(item.textContent ?? ''));

    await expect(items[0]).toHaveTextContent('진행 → 중단');
  },
};

// 완료 → 보증 중은 프로젝트 요약을 확인해야 한다 (§10.3)
export const StartWarrantyNeedsSummaryConfirm: Story = {
  parameters: { router: routerFor('옛날상가 간판 교체') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '보증 시작' }));

    const form = within(await canvas.findByRole('form', { name: '보증 시작 확인' }));

    await userEvent.click(form.getByRole('button', { name: '확인' }));
    await expect(
      await form.findByText('보증 중으로 바꾸려면 프로젝트 요약을 확인해 주세요'),
    ).toBeInTheDocument();

    await userEvent.click(form.getByRole('checkbox', { name: '프로젝트 요약을 확인했습니다' }));
    await userEvent.click(form.getByRole('button', { name: '확인' }));

    await expect(await canvas.findByText("'보증 중' 상태로 바꿨습니다")).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '종료 처리' })).toBeInTheDocument();
  },
};

// 보증 기간이 남아 있으면 완료에서 바로 종료할 수 없다 (보증 기간 0개월일 때만)
export const CloseFromCompletedNeedsNoWarranty: Story = {
  parameters: { router: routerFor('옛날상가 간판 교체') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '종료 처리' }));

    const form = within(await canvas.findByRole('form', { name: '종료 처리 확인' }));

    await userEvent.click(form.getByRole('button', { name: '확인' }));
    await expect(
      await form.findByText(/보증 기간이 12개월입니다/, { exact: false }),
    ).toBeInTheDocument();
  },
};

// 재오픈은 사유가 필요하고, 보증 종료 예정일이 지난 뒤의 종료는 사유 없이 할 수 있다
export const ReopenThenCloseAfterWarrantyEnd: Story = {
  parameters: { router: routerFor('C동 환기 설비') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '재오픈' }));

    const reopenForm = within(await canvas.findByRole('form', { name: '재오픈 확인' }));

    await userEvent.click(reopenForm.getByRole('button', { name: '확인' }));
    await expect(await reopenForm.findByText('사유를 입력해 주세요')).toBeInTheDocument();

    await userEvent.type(reopenForm.getByLabelText('사유 (필수)'), '고객 재보수 요청');
    await userEvent.click(reopenForm.getByRole('button', { name: '확인' }));
    await expect(await canvas.findByText("'보증 중' 상태로 바꿨습니다")).toBeInTheDocument();

    await userEvent.click(await canvas.findByRole('button', { name: '종료 처리' }));

    const closeForm = within(await canvas.findByRole('form', { name: '종료 처리 확인' }));

    // 종료 예정일(2026-06-18)이 지났으므로 사유는 선택
    await expect(closeForm.getByLabelText('사유 (선택)')).toBeInTheDocument();
    await userEvent.click(closeForm.getByRole('button', { name: '확인' }));
    await expect(await canvas.findByText("'종료' 상태로 바꿨습니다")).toBeInTheDocument();
  },
};

export const ClosedProjectReadOnly: Story = {
  parameters: { router: routerFor('C동 환기 설비') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await expect(
      await canvas.findByText(/'종료' 상태의 프로젝트는 수정할 수 없습니다/),
    ).toBeInTheDocument();
    await expect(canvas.getByLabelText('프로젝트명')).toBeDisabled();
    await expect(canvas.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    // 이력은 그대로 조회됨
    await expect(await canvas.findByText(/보증 중 → 종료/)).toBeInTheDocument();
  },
};

// 보증 중에는 담당자와 메모만 수정할 수 있음
export const WarrantyEditsOnlyManagerAndMemo: Story = {
  parameters: { router: routerFor('옛날상가 간판 교체') },
  loaders: [
    () => {
      signIn('hanbit');

      const account = findAccount('hanbit')!;

      saveProjects(
        account,
        getProjects(account).map((project) =>
          project.name === '옛날상가 간판 교체'
            ? { ...project, status: 'WARRANTY' as const }
            : project,
        ),
      );
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await expect(await canvas.findByLabelText('프로젝트명')).toBeDisabled();
    await expect(canvas.getByLabelText('현장 이름')).toBeDisabled();
    await expect(canvas.getByLabelText('고객')).toBeDisabled();
    await expect(canvas.getByLabelText('담당자', { selector: 'select' })).toBeEnabled();
    await expect(canvas.getByLabelText('메모')).toBeEnabled();

    await userEvent.type(canvas.getByLabelText('메모'), ' 보증 메모');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
  },
};

// 투입 패널은 목록이 도착한 뒤에 그려지므로 기다렸다가 찾는다
const assignForm = async (canvas: ReturnType<typeof within>) =>
  within(await canvas.findByRole('form', { name: '팀에 직원 추가' }));

// 검색해서 고르는 직원 칸에서 직원을 고른다 (목록은 화면 밖 겹침층에 그려진다)
// 직원 선택 목록(겹침층)
const listbox = () => within(document.body).findByRole('listbox');

const pickEmployee = async (form: ReturnType<typeof within>, name: RegExp) => {
  await userEvent.click(await form.findByRole('combobox'));
  await userEvent.click(await within(await listbox()).findByRole('option', { name }));
};

// 접혀 있는 투입 기간·계획 공수 칸을 연다
const openPeriod = (form: ReturnType<typeof within>) =>
  userEvent.click(form.getByText(/투입 기간·계획 공수 정하기/));

export const AssignmentsListed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const list = within(await canvas.findByRole('list', { name: '투입 목록' }));

    await expect(await list.findByText('정판금')).toBeInTheDocument();
    // 취소한 투입(오전기)은 기본 목록에 없음
    await expect(list.queryByText('오전기')).not.toBeInTheDocument();
    // 계획 공수(분 → MD·시간)와 기간
    await expect(
      await canvas.findByText(/2026-08-01 ~ 2026-11-30 · 계획 40MD \(320시간\)/),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/2026-09-01 ~ 2026-10-15 · 계획 공수 없음/)).toBeInTheDocument();
  },
};

export const OverlapWarningShown: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await canvas.findByRole('list', { name: '투입 목록' });

    // 최설치·한용접은 중단된 B동 덕트 설치와, 정판금은 예정인 미래오피스 천장 마감과 기간이 겹침
    await expect(
      (await canvas.findAllByText(/'B동 덕트 설치'\(2026-003\)에도 투입되어 있습니다/)).length,
    ).toBeGreaterThanOrEqual(2);
    await expect(
      canvas.getByText(
        /2026-11-02 ~ 2026-11-30에 '미래오피스 천장 마감'\(2026-002\)에도 투입되어 있습니다/,
      ),
    ).toBeInTheDocument();
  },
};

export const AddAssignment: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const form = await assignForm(canvas);

    await pickEmployee(form, /오전기/);
    await openPeriod(form);
    await userEvent.type(form.getByLabelText('계획 공수 (MD)'), '10');
    await userEvent.click(form.getByRole('button', { name: '팀에 추가' }));

    await expect(await canvas.findByText(/오전기님을 팀에 넣었습니다/)).toBeInTheDocument();
    await expect(
      await canvas.findByText(/2026-07-15 ~ 2026-11-30 · 계획 10MD \(80시간\)/),
    ).toBeInTheDocument();
  },
};

export const LeftEmployeeNotSelectable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const form = await assignForm(canvas);

    await userEvent.click(await form.findByRole('combobox'));
    const body = within(await listbox());

    await body.findByRole('option', { name: /오전기/ });
    await expect(body.queryByRole('option', { name: /박퇴사/ })).not.toBeInTheDocument();
    // 휴직 직원은 고를 수 있고 표시가 붙음
    await expect(body.getByRole('option', { name: /이조공.*휴직/ })).toBeInTheDocument();
  },
};

export const AssignmentOutsideProjectPeriod: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const form = await assignForm(canvas);

    await pickEmployee(form, /오전기/);
    await openPeriod(form);
    fireEvent.change(form.getByLabelText('투입 시작일'), { target: { value: '2026-07-01' } });
    await userEvent.click(form.getByRole('button', { name: '팀에 추가' }));

    await expect(
      await form.findByText(/프로젝트 시작 예정일\(2026-07-15\) 이후여야 합니다/),
    ).toBeInTheDocument();
  },
};

export const AssignmentNeedsEmployee: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click((await assignForm(canvas)).getByRole('button', { name: '팀에 추가' }));

    await expect(await canvas.findByText('직원을 선택해 주세요')).toBeInTheDocument();
  },
};

// 이미 팀에 있는 직원은 고르는 목록에 나오지 않는다
export const TeamMemberNotOfferedAgain: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const form = await assignForm(canvas);

    await userEvent.click(await form.findByRole('combobox'));
    const options = within(await listbox());

    await options.findByRole('option', { name: /오전기/ });
    await expect(options.queryByRole('option', { name: /정판금/ })).not.toBeInTheDocument();
  },
};

// 다른 프로젝트와 겹치면 막지 않고 저장한 뒤 겹치는 구간을 알려 줌
export const OverlapWarningAfterAdd: Story = {
  parameters: { router: routerFor('미래오피스 천장 마감') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const form = await assignForm(canvas);

    await pickEmployee(form, /최설치/);
    await userEvent.click(form.getByRole('button', { name: '팀에 추가' }));

    await expect(await canvas.findByText(/최설치님을 팀에 넣었습니다/)).toBeInTheDocument();
    await expect(await canvas.findByText('확인이 필요합니다')).toBeInTheDocument();
    await expect(
      canvas.getAllByText(
        /2026-11-02 ~ 2026-11-30에 'A동 외장 판금 공사'\(2026-001\)에도 투입되어 있습니다/,
      ).length,
    ).toBeGreaterThan(0);
  },
};

export const EditAssignment: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '김일용 투입 수정' }));

    const form = within(await canvas.findByRole('form', { name: '김일용 투입 수정' }));
    const end = form.getByLabelText('투입 종료일');

    fireEvent.change(end, { target: { value: '2026-10-31' } });
    await userEvent.type(form.getByLabelText('계획 공수 (MD)'), '5');
    await userEvent.click(form.getByRole('button', { name: '저장' }));

    await expect(
      await canvas.findByText(/2026-09-01 ~ 2026-10-31 · 계획 5MD \(40시간\)/),
    ).toBeInTheDocument();
  },
};

export const EditAssignmentOutsidePeriod: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '김일용 투입 수정' }));

    const form = within(await canvas.findByRole('form', { name: '김일용 투입 수정' }));
    const end = form.getByLabelText('투입 종료일');

    fireEvent.change(end, { target: { value: '2027-03-01' } });
    await userEvent.click(form.getByRole('button', { name: '저장' }));

    await expect(
      await form.findByText(/프로젝트 종료 예정일\(2026-11-30\) 이전이어야 합니다/),
    ).toBeInTheDocument();
  },
};

export const CancelAssignment: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '김일용 팀에서 빼기' }));
    await userEvent.click(await canvas.findByRole('button', { name: '빼기 확인' }));

    const list = within(canvas.getByRole('list', { name: '투입 목록' }));

    await waitFor(() => expect(list.queryByText('김일용')).not.toBeInTheDocument());
    await expect(list.getByText('정판금')).toBeInTheDocument();
  },
};

export const CompletedProjectLocksAssignments: Story = {
  parameters: { router: routerFor('옛날상가 간판 교체') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await expect(
      await canvas.findByText(/상태의 프로젝트에는 투입을 바꿀 수 없습니다/),
    ).toBeInTheDocument();
    await expect(canvas.queryByRole('form', { name: '팀에 직원 추가' })).not.toBeInTheDocument();
  },
};

export const SuspendedProjectNeedsConfirmation: Story = {
  parameters: { router: routerFor('B동 덕트 설치') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const form = await assignForm(canvas);

    await pickEmployee(form, /오전기/);
    await userEvent.click(form.getByRole('button', { name: '팀에 추가' }));

    await expect(
      await canvas.findByText(/중단 중인 프로젝트입니다. 투입하려면 확인이 필요합니다/),
    ).toBeInTheDocument();

    await userEvent.click(canvas.getByLabelText(/투입을 바꾸는 것을 확인합니다/));
    await userEvent.click(form.getByRole('button', { name: '팀에 추가' }));

    await expect(await canvas.findByText(/오전기님을 팀에 넣었습니다/)).toBeInTheDocument();
  },
};

export const PeriodChangeNeedsReasonAfterStart: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const end = await canvas.findByLabelText('종료 예정일');

    // 기간을 바꾸기 전에는 사유 입력칸이 없음
    await expect(canvas.queryByLabelText('기간 변경 사유 (필수)')).not.toBeInTheDocument();

    fireEvent.change(end, { target: { value: '2026-12-15' } });

    await expect(await canvas.findByLabelText('기간 변경 사유 (필수)')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '저장' }));
    await expect(
      await canvas.findByText('시작한 프로젝트의 기간을 바꿀 때는 사유를 입력해 주세요'),
    ).toBeInTheDocument();

    await userEvent.type(canvas.getByLabelText('기간 변경 사유 (필수)'), '고객 요청으로 연장');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    // 이력 맨 앞에 방금 변경이 기록됨
    await expect(await canvas.findByText('사유: 고객 요청으로 연장')).toBeInTheDocument();
    await expect(
      canvas.getByText('2026-07-15 ~ 2026-11-30 → 2026-07-15 ~ 2026-12-15'),
    ).toBeInTheDocument();
  },
};

export const PeriodHistorySeeded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await expect(
      await canvas.findByText('사유: 외장 패널 납품 지연으로 종료 예정일 연장'),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText('2026-07-15 ~ 2026-11-15 → 2026-07-15 ~ 2026-11-30'),
    ).toBeInTheDocument();
  },
};

export const PeriodReasonOptionalBeforeStart: Story = {
  parameters: { router: routerFor('미래오피스 천장 마감') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const end = await canvas.findByLabelText('종료 예정일');

    fireEvent.change(end, { target: { value: '2027-02-15' } });

    await expect(await canvas.findByLabelText('기간 변경 사유 (선택)')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(
      await canvas.findByText('2026-11-02 ~ 2027-01-29 → 2026-11-02 ~ 2027-02-15'),
    ).toBeInTheDocument();
  },
};

export const ShrinkBlockedByAssignments: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const end = await canvas.findByLabelText('종료 예정일');

    fireEvent.change(end, { target: { value: '2026-09-20' } });
    await userEvent.type(await canvas.findByLabelText('기간 변경 사유 (필수)'), '조기 종료');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/투입 \d건이 새 기간 밖에 있습니다/)).toBeInTheDocument();
  },
};

// 더미 작업 내역: 저장 3건(공수 합 7.0 MD) + 임시 저장 1건은 집계 제외
export const WorkSummary: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = within(await canvas.findByRole('region', { name: '공수 집계' }));

    await expect(
      await summary.findByText('7.0 MD (56시간)', { selector: 'dd' }),
    ).toBeInTheDocument();
    await expect(summary.getByText('0.32 MM')).toBeInTheDocument();
    await expect(
      summary.getByText(/임시 저장 작업 내역 1건은 집계에 포함되지 않았습니다/),
    ).toBeInTheDocument();
    await expect(summary.getByText('6%')).toBeInTheDocument();

    const employees = within(summary.getByRole('list', { name: '직원별 공수' }));

    await expect(employees.getByText('정판금')).toBeInTheDocument();
    await expect(employees.getByText('한용접')).toBeInTheDocument();
    await expect(
      within(summary.getByRole('list', { name: '작업 구분별 공수' })).getByText('설치'),
    ).toBeInTheDocument();
    await expect(summary.getByRole('list', { name: '기간별 공수' })).toBeInTheDocument();
  },
};

export const WorkSummaryDateRangeAndMonthly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = within(await canvas.findByRole('region', { name: '공수 집계' }));

    await summary.findByRole('list', { name: '직원별 공수' });
    await fireEvent.change(summary.getByLabelText('집계 시작일'), {
      target: { value: '2026-09-02' },
    });
    await fireEvent.change(summary.getByLabelText('집계 종료일'), {
      target: { value: '2026-09-02' },
    });

    await waitFor(() =>
      expect(summary.getByText('2.0 MD (16시간)', { selector: 'dd' })).toBeInTheDocument(),
    );
    await expect(summary.getByText('기간 선택 중에는 표시하지 않음')).toBeInTheDocument();

    await userEvent.selectOptions(summary.getByLabelText('기간 묶음'), '월별');
    await expect(await summary.findByText('2026-09월')).toBeInTheDocument();
  },
};

export const ProgressPanel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 더미 진행률 기록 두 건(25%, 40%)이 최근순으로 보이고 현재 진행률은 40%
    const panel = within(await canvas.findByRole('region', { name: '진행 현황' }));

    await expect(await panel.findByText('진행률 이력')).toBeInTheDocument();
    await expect(panel.getByText('진행률').nextElementSibling).toHaveTextContent('40%');

    // 범위를 벗어난 값은 서버에 보내기 전에 막는다
    await userEvent.type(panel.getByLabelText('진행률 (%)'), '120');
    await userEvent.click(panel.getByRole('button', { name: '진행률 기록' }));
    await expect(
      await panel.findByText('0부터 100 사이의 정수를 입력해 주세요'),
    ).toBeInTheDocument();

    // 정상 값은 기록되어 현재 진행률과 이력이 바뀐다
    await userEvent.clear(panel.getByLabelText('진행률 (%)'));
    await userEvent.type(panel.getByLabelText('진행률 (%)'), '55');
    await userEvent.type(panel.getByLabelText('메모 (선택)'), '도장 시작');
    await userEvent.click(panel.getByRole('button', { name: '진행률 기록' }));
    await waitFor(() =>
      expect(panel.getByText('진행률').nextElementSibling).toHaveTextContent('55%'),
    );
    await expect(await panel.findByText(/도장 시작/)).toBeInTheDocument();
  },
};

export const LaborCostPanel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = within(await canvas.findByRole('region', { name: '인건비 (최소 추정)' }));

    // 금액이 계산되고 포함하지 않는 항목을 알려 준다
    await expect(await panel.findByText('지금까지 인건비')).toBeInTheDocument();
    await expect(panel.getByText(/4대보험·수당·퇴직금·세금은 포함하지/)).toBeInTheDocument();
    // 더미 단가가 없는 직원의 공수는 합계에서 빠지고 안내된다
    await expect(await panel.findByText(/단가가 없어 합계에서 빠진 공수/)).toBeInTheDocument();
    await expect(panel.getAllByText(/\d원$/).length).toBeGreaterThan(0);
  },
};

export const RequiredCredentials: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = within(await canvas.findByRole('region', { name: '필요 자격' }));

    // 더미: A동은 안전교육 이수증이 필요. 저장하기 전에는 버튼이 꺼져 있다
    const safety = await panel.findByRole('checkbox', { name: '안전교육 이수증' });

    await expect(safety).toBeChecked();
    await expect(panel.getByRole('checkbox', { name: '용접 기능사' })).not.toBeChecked();
    await expect(panel.getByRole('button', { name: '필요 자격 저장' })).toBeDisabled();

    await userEvent.click(panel.getByRole('checkbox', { name: '용접 기능사' }));
    await userEvent.click(panel.getByRole('button', { name: '필요 자격 저장' }));

    await expect(await panel.findByText('필요 자격을 저장했습니다')).toBeInTheDocument();
    await expect(panel.getByRole('checkbox', { name: '용접 기능사' })).toBeChecked();
  },
};

export const CredentialWarnings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 필요 자격(안전교육 이수증)이 없는 투입 직원에게 경고가 붙는다
    await expect(
      (await canvas.findAllByText(/필요 자격 '안전교육 이수증': 자격 없음/)).length,
    ).toBeGreaterThan(0);
  },
};
