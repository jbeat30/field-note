import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

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
  loaders: [() => signIn('hanbit')],
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
    // 완료하면 더 바꿀 수 있는 상태가 없고 안내가 보임 (기본정보는 계속 수정 가능)
    await expect(
      await canvas.findByText(/보증·종료 처리는 이후 단계에서 추가됩니다/),
    ).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: '작업 중단' })).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '저장' })).toBeInTheDocument();
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

// 보증 중에는 담당자와 메모만 수정할 수 있음 (보증 전환 기능은 4단계라 상태를 직접 맞춰 확인)
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
  within(await canvas.findByRole('form', { name: '투입 등록' }));

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

    await within(await form.findByLabelText('직원')).findByRole('option', { name: '오전기' });
    await userEvent.selectOptions(form.getByLabelText('직원'), '오전기');
    await userEvent.type(form.getByLabelText('계획 공수 (MD)'), '10');
    await userEvent.click(form.getByRole('button', { name: '투입 등록' }));

    await expect(await canvas.findByText(/오전기님을 투입했습니다/)).toBeInTheDocument();
    await expect(
      await canvas.findByText(/2026-07-15 ~ 2026-11-30 · 계획 10MD \(80시간\)/),
    ).toBeInTheDocument();
  },
};

export const LeftEmployeeNotSelectable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const select = await (await assignForm(canvas)).findByLabelText('직원');

    await within(select).findByRole('option', { name: '오전기' });
    await expect(within(select).queryByRole('option', { name: '박퇴사' })).not.toBeInTheDocument();
    // 휴직 직원은 고를 수 있고 표시가 붙음
    await expect(
      within(select).getByRole('option', { name: '이조공 (조공) (휴직)' }),
    ).toBeInTheDocument();
  },
};

export const AssignmentOutsideProjectPeriod: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const form = await assignForm(canvas);

    await within(await form.findByLabelText('직원')).findByRole('option', { name: '오전기' });
    await userEvent.selectOptions(form.getByLabelText('직원'), '오전기');
    fireEvent.change(form.getByLabelText('투입 시작일'), { target: { value: '2026-07-01' } });
    await userEvent.click(form.getByRole('button', { name: '투입 등록' }));

    await expect(
      await form.findByText(/프로젝트 시작 예정일\(2026-07-15\) 이후여야 합니다/),
    ).toBeInTheDocument();
  },
};

export const AssignmentNeedsEmployee: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);

    await userEvent.click((await assignForm(canvas)).getByRole('button', { name: '투입 등록' }));

    await expect(await canvas.findByText('직원을 선택해 주세요')).toBeInTheDocument();
  },
};

export const SameProjectOverlapRejected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const form = await assignForm(canvas);

    await within(await form.findByLabelText('직원')).findByRole('option', {
      name: '정판금 (반장)',
    });
    await userEvent.selectOptions(form.getByLabelText('직원'), '정판금 (반장)');
    await userEvent.click(form.getByRole('button', { name: '투입 등록' }));

    await expect(await form.findByText(/이미 투입되어 있습니다/)).toBeInTheDocument();
  },
};

// 다른 프로젝트와 겹치면 막지 않고 저장한 뒤 겹치는 구간을 알려 줌
export const OverlapWarningAfterAdd: Story = {
  parameters: { router: routerFor('미래오피스 천장 마감') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const form = await assignForm(canvas);

    await within(await form.findByLabelText('직원')).findByRole('option', {
      name: '최설치 (기공)',
    });
    await userEvent.selectOptions(form.getByLabelText('직원'), '최설치 (기공)');
    await userEvent.click(form.getByRole('button', { name: '투입 등록' }));

    await expect(await canvas.findByText(/최설치님을 투입했습니다/)).toBeInTheDocument();
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

    await userEvent.click(await canvas.findByRole('button', { name: '김일용 투입 취소' }));
    await userEvent.click(await canvas.findByRole('button', { name: '취소 확인' }));

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
    await expect(canvas.queryByRole('form', { name: '투입 등록' })).not.toBeInTheDocument();
  },
};

export const SuspendedProjectNeedsConfirmation: Story = {
  parameters: { router: routerFor('B동 덕트 설치') },
  play: async ({ canvasElement }) => {
    const canvas = panel(canvasElement);
    const form = await assignForm(canvas);

    await within(await form.findByLabelText('직원')).findByRole('option', { name: '오전기' });
    await userEvent.selectOptions(form.getByLabelText('직원'), '오전기');
    await userEvent.click(form.getByRole('button', { name: '투입 등록' }));

    await expect(
      await canvas.findByText(/중단 중인 프로젝트입니다. 투입하려면 확인이 필요합니다/),
    ).toBeInTheDocument();

    await userEvent.click(canvas.getByLabelText(/투입을 바꾸는 것을 확인합니다/));
    await userEvent.click(form.getByRole('button', { name: '투입 등록' }));

    await expect(await canvas.findByText(/오전기님을 투입했습니다/)).toBeInTheDocument();
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

// 더미 일지: 저장 3건(공수 합 7.0 MD) + 임시 저장 1건은 집계 제외
export const WorkSummary: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = within(await canvas.findByRole('region', { name: '공수 집계' }));

    await expect(
      await summary.findByText('7.0 MD (56시간)', { selector: 'dd' }),
    ).toBeInTheDocument();
    await expect(summary.getByText('0.32 MM')).toBeInTheDocument();
    await expect(
      summary.getByText(/임시 저장 일지 1건은 집계에 포함되지 않았습니다/),
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
