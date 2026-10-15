import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { findAccount, getProjects, saveProjects, signIn } from '../mocks/state';

import { ProjectWarrantyPage } from './ProjectWarrantyPage';
import { chooseOption } from '../lib/storyActions';

const routerFor = (name: string) => ({
  initialEntries: [
    `/projects/${DEMO_PROJECTS.find((project) => project.name === name)!.id}/warranty`,
  ],
  path: '/projects/:id/warranty',
});

// 문서함에 문서가 있는 A동 프로젝트를 완료 상태로 맞춰 보증서 등록 확인
const completeProjectA = () => {
  signIn('hanbit');

  const account = findAccount('hanbit')!;

  saveProjects(
    account,
    getProjects(account).map((project) =>
      project.name === 'A동 외장 판금 공사'
        ? { ...project, status: 'COMPLETED' as const, actualEnd: '2026-10-01' }
        : project,
    ),
  );
};

const meta = {
  title: 'Pages/보증',
  component: ProjectWarrantyPage,
  parameters: { router: routerFor('옛날상가 간판 교체') },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectWarrantyPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 완료 후 보증을 아직 설정하지 않았으면 기본 12개월과 실제 완료일로 계산한 값 표시
export const UnconfiguredDefaults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('12개월 (기본값)')).toBeInTheDocument();
    await expect(canvas.getAllByText(/2027-03-12/).length).toBeGreaterThan(0);
    await expect(canvas.getByText('아직 저장한 보증 설정이 없습니다')).toBeInTheDocument();
  },
};

// 처음 저장은 사유 없이, 이후 변경은 사유 필요, 이력에 기록
export const SaveThenChangeNeedsReason: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = within(await canvas.findByRole('form', { name: '보증 설정' }));

    await userEvent.clear(form.getByLabelText('보증 기간 (개월)'));
    await userEvent.type(form.getByLabelText('보증 기간 (개월)'), '24');
    await expect(form.getByText('종료 예정일: 2028-03-12')).toBeInTheDocument();
    await userEvent.click(form.getByRole('button', { name: '보증 설정 저장' }));
    await expect(
      await canvas.findByText('보증 설정을 저장했습니다', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await expect(
      await canvas.findByText(/24개월로 설정/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();

    // 이미 설정이 있어 사유 없이는 변경 불가
    const again = within(await canvas.findByRole('form', { name: '보증 설정' }));

    await userEvent.clear(again.getByLabelText('보증 기간 (개월)'));
    await userEvent.type(again.getByLabelText('보증 기간 (개월)'), '18');
    await userEvent.click(again.getByRole('button', { name: '보증 설정 저장' }));
    await expect(await again.findByText('변경 사유를 입력해 주세요')).toBeInTheDocument();

    await userEvent.type(again.getByLabelText('변경 사유 (필수)'), '고객과 18개월로 합의');
    await userEvent.click(again.getByRole('button', { name: '보증 설정 저장' }));
    await expect(
      await canvas.findByText(/24개월 → 18개월/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('사유: 고객과 18개월로 합의')).toBeInTheDocument();
  },
};

export const ExtendEndDateNeedsReason: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = within(await canvas.findByRole('form', { name: '보증 설정' }));

    await userEvent.type(form.getByLabelText('종료 예정일 직접 지정 (선택)'), '2028-01-31');
    await userEvent.click(form.getByRole('button', { name: '보증 설정 저장' }));
    await expect(
      await form.findByText('종료 예정일을 직접 바꾸는 사유를 입력해 주세요'),
    ).toBeInTheDocument();

    await userEvent.type(form.getByLabelText('변경 사유 (필수)'), '재보수로 연장');
    await userEvent.click(form.getByRole('button', { name: '보증 설정 저장' }));
    await expect(
      (await canvas.findAllByText(/2028-01-31/, {}, { timeout: 4000 })).length,
    ).toBeGreaterThan(0);
  },
};

export const InspectionNeedsStartDate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = within(await canvas.findByRole('form', { name: '보증 설정' }));

    await chooseOption(form.getByLabelText('시작 기준'), '고객 검수일');
    await userEvent.click(form.getByRole('button', { name: '보증 설정 저장' }));
    await expect(await form.findByText('고객 검수일을 입력해 주세요')).toBeInTheDocument();
  },
};

// 완료 전에는 설정 폼·보증서를 숨기고 한 줄 안내와 기본값만 표시
export const BeforeCompletion: Story = {
  parameters: { router: routerFor('A동 외장 판금 공사') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByText('프로젝트를 완료하면 보증을 설정할 수 있습니다'),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/기본값은 12개월/)).toBeInTheDocument();
    await expect(canvas.queryByRole('form', { name: '보증 설정' })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('heading', { name: '보증서' })).not.toBeInTheDocument();
  },
};

// 종료된 프로젝트는 설정과 보증서 변경 불가, 이력은 조회 가능
export const ClosedProjectReadOnly: Story = {
  parameters: { router: routerFor('C동 환기 설비') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/종료된 프로젝트입니다/)).toBeInTheDocument();
    await expect(canvas.getByText('6개월')).toBeInTheDocument();
    await expect(canvas.getAllByText(/2026-06-18/).length).toBeGreaterThan(0);
    await expect(canvas.queryByRole('button', { name: '보증 설정 저장' })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('form', { name: '보증서 등록' })).not.toBeInTheDocument();
    await expect(
      await canvas.findByText(/6개월로 설정/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
  },
};

export const RegisterAndRemoveCertificate: Story = {
  parameters: { router: routerFor('A동 외장 판금 공사') },
  loaders: [completeProjectA],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = within(await canvas.findByRole('form', { name: '보증서 등록' }));

    await expect(await canvas.findByText('등록한 보증서가 없습니다')).toBeInTheDocument();
    await userEvent.click(form.getByRole('button', { name: '보증서 등록' }));
    await expect(
      await form.findByText('만료일을 입력해 주세요', { exact: false }),
    ).toBeInTheDocument();

    await chooseOption(form.getByLabelText('문서함에서 선택'), '1층 시공도');
    await userEvent.type(form.getByLabelText('만료일'), '2027-03-01');
    await userEvent.type(form.getByLabelText('발급처 (선택)'), '서울보증');
    await userEvent.click(form.getByRole('button', { name: '보증서 등록' }));

    await expect(await canvas.findByText(/만료일 2027-03-01/)).toBeInTheDocument();
    await expect(canvas.getByText(/발급처 서울보증/)).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '1층 시공도 삭제' }));
    await expect(await canvas.findByText('등록한 보증서가 없습니다')).toBeInTheDocument();
  },
};
