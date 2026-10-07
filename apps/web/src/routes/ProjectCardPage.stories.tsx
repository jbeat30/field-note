import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

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

    await userEvent.clear(end);
    await userEvent.type(end, '2026-07-01');
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

    await userEvent.clear(date);
    await userEvent.type(date, '2099-01-01');
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
