import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { resetMockRepairs } from '../mocks/repairHandlers';
import { findAccount, getProjects, getWorkLogs, saveProjects, signIn } from '../mocks/state';

import { ProjectRepairsPage } from './ProjectRepairsPage';
import { chooseOption } from '../lib/storyActions';

const routerFor = (name: string) => ({
  initialEntries: [
    `/projects/${DEMO_PROJECTS.find((project) => project.name === name)!.id}/repairs`,
  ],
  path: '/projects/:id/repairs',
});

// 프로젝트를 보증 중으로 맞춤 (보수 요청은 보증 중에만 접수)
const warrantyOf = (name: string) => () => {
  // 스토리를 다시 그릴 때마다 보수 요청이 처음 상태로 돌아가야 같은 순서로 확인 가능
  resetMockRepairs();
  signIn('hanbit');

  const account = findAccount('hanbit')!;

  saveProjects(
    account,
    getProjects(account).map((project) =>
      project.name === name
        ? { ...project, status: 'WARRANTY' as const, actualEnd: project.actualEnd ?? '2026-10-01' }
        : project,
    ),
  );
};

const meta = {
  title: 'Pages/보수 요청',
  component: ProjectRepairsPage,
  parameters: { router: routerFor('옛날상가 간판 교체') },
  loaders: [warrantyOf('옛날상가 간판 교체')],
} satisfies Meta<typeof ProjectRepairsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const itemOf = (canvas: ReturnType<typeof within>, seq: number) =>
  canvas.getByText(`#${seq}`).closest('li') as HTMLElement;

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('접수한 보수 요청이 없습니다')).toBeInTheDocument();
    await expect(canvas.getByRole('form', { name: '보수 요청 접수' })).toBeInTheDocument();
  },
};

// 종료된 프로젝트는 접수 없이 완료된 보수 요청 이력만 조회
export const ClosedProjectReadOnly: Story = {
  parameters: { router: routerFor('C동 환기 설비') },
  loaders: [() => signIn('hanbit')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/옥상 환기구 연결부 빗물 누수/)).toBeInTheDocument();
    await expect(canvas.getByText(/종료된 프로젝트입니다/)).toBeInTheDocument();
    await expect(canvas.queryByRole('form', { name: '보수 요청 접수' })).not.toBeInTheDocument();

    const items = canvas.getAllByRole('listitem').filter((item) => item.textContent?.includes('#'));

    await expect(items[0]).toHaveTextContent('#2');
    await expect(items[1]).toHaveTextContent('#1');
    await expect(items[1]).toHaveTextContent('완료');

    await userEvent.click(canvas.getByRole('button', { name: '#1 자세히 보기' }));
    await expect(await within(itemOf(canvas, 1)).findByText('상태 이력')).toBeInTheDocument();
    await expect(
      within(itemOf(canvas, 1)).queryByRole('button', { name: '처리 시작' }),
    ).not.toBeInTheDocument();
  },
};

export const ReceiveWithValidation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = within(await canvas.findByRole('form', { name: '보수 요청 접수' }));

    await userEvent.click(form.getByRole('button', { name: '접수하기' }));
    await expect(await form.findByText('요청자를 입력해 주세요')).toBeInTheDocument();
    await expect(form.getByText('요청 내용을 입력해 주세요')).toBeInTheDocument();

    await userEvent.type(form.getByLabelText('요청자'), '관리사무소 김과장');
    await userEvent.type(form.getByLabelText('위치 (선택)'), '1층 로비');
    await userEvent.type(form.getByLabelText('요청 내용'), '간판 조명 깜빡임');
    await userEvent.click(form.getByRole('button', { name: '접수하기' }));

    await expect(
      await canvas.findByText('#1 접수했습니다', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByText('1층 로비')).toBeInTheDocument());
    await expect(form.getByLabelText('요청자')).toHaveValue('');
  },
};

export const HoldNeedsReasonThenDone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = within(await canvas.findByRole('form', { name: '보수 요청 접수' }));

    await userEvent.type(form.getByLabelText('요청자'), '고객');
    await userEvent.type(form.getByLabelText('요청 내용'), '문 처짐');
    await userEvent.click(form.getByRole('button', { name: '접수하기' }));
    await canvas.findByText(/#\d+ 접수했습니다/, {}, { timeout: 4000 });

    await userEvent.click(canvas.getAllByRole('button', { name: /자세히 보기/ })[0]!);
    await userEvent.click(await canvas.findByRole('button', { name: '보류' }));

    const hold = within(await canvas.findByRole('form', { name: '보류 확인' }));

    // 사유 없이는 보류 불가
    await userEvent.click(hold.getByRole('button', { name: '확인' }));
    await expect(await hold.findByText('보류 사유를 입력해 주세요')).toBeInTheDocument();

    await userEvent.type(hold.getByLabelText('사유 (필수)'), '자재 입고 대기');
    await userEvent.click(hold.getByRole('button', { name: '확인' }));
    await expect(
      await canvas.findByText("'보류' 상태로 바꿨습니다", {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await expect(await canvas.findByText(/자재 입고 대기/)).toBeInTheDocument();

    await userEvent.click(await canvas.findByRole('button', { name: '완료 처리' }));
    await userEvent.click(
      within(await canvas.findByRole('form', { name: '완료 처리 확인' })).getByRole('button', {
        name: '확인',
      }),
    );
    await expect(
      await canvas.findByText("'완료' 상태로 바꿨습니다", {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    // 완료된 건은 내용 수정 불가
    await expect(canvas.queryByRole('button', { name: '내용 수정' })).not.toBeInTheDocument();
  },
};

// 사후 작업으로 표시한 작업 내역을 보수 요청에 연결하면 건별 공수 표시
export const LinkAfterServiceLog: Story = {
  parameters: { router: routerFor('A동 외장 판금 공사') },
  loaders: [
    () => {
      warrantyOf('A동 외장 판금 공사')();

      const account = findAccount('hanbit')!;
      const log = getWorkLogs(account).find(
        (item) =>
          item.status === 'SAVED' &&
          item.projectId === DEMO_PROJECTS.find((p) => p.name === 'A동 외장 판금 공사')!.id,
      );

      if (log) log.isAfterService = true;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = within(await canvas.findByRole('form', { name: '보수 요청 접수' }));

    await expect(await canvas.findByText('사후 작업으로 쓴 공수·자재')).toBeInTheDocument();
    await userEvent.type(form.getByLabelText('요청자'), '고객');
    await userEvent.type(form.getByLabelText('요청 내용'), '패널 이음새 틈');
    await userEvent.click(form.getByRole('button', { name: '접수하기' }));
    await canvas.findByText('#1 접수했습니다', {}, { timeout: 4000 });

    await userEvent.click(canvas.getByRole('button', { name: '#1 자세히 보기' }));
    await expect(await canvas.findByText('연결한 사후 작업이 없습니다')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(itemOf(canvas, 1)).getByLabelText('사후 작업 연결')).toBeInTheDocument(),
    );

    const select = within(itemOf(canvas, 1)).getByLabelText('사후 작업 연결');

    await chooseOption(select, 0);
    await userEvent.click(within(itemOf(canvas, 1)).getByRole('button', { name: '연결' }));

    await expect(
      await canvas.findByText(/작업 내역, /, { exact: false }, { timeout: 4000 }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText('사후 작업 1건').length).toBeGreaterThan(0);
  },
};
