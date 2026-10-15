import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { ProjectMaterialsPage } from './ProjectMaterialsPage';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const meta = {
  title: 'Pages/프로젝트 자재',
  component: ProjectMaterialsPage,
  parameters: {
    router: {
      initialEntries: [`/projects/${projectId}/materials?date=2026-09-10`],
      path: '/projects/:id/materials',
    },
  },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectMaterialsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 시드 기록이 자재별 합계와 날짜별 기록에 표시
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const totals = within(await canvas.findByRole('table', { name: '자재별 합계' }));

    await expect(totals.getAllByText('아연도강판').length).toBeGreaterThan(0);
    await expect(canvas.getAllByRole('button', { name: /기록 지우기$/ }).length).toBeGreaterThan(0);
  },
};

// 맞춤 자재: 목록에서 고르지 않고 품명·규격을 바로 입력, 줄을 복사해 규격만 바꿔 여러 개 입력
export const RecordCustomMaterials: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText('1번 줄 품명'), '철문');
    await userEvent.type(canvas.getByLabelText('1번 줄 규격'), '900×2100 1.6T 백색');
    await userEvent.type(canvas.getByLabelText('1번 줄 수량'), '2');
    await userEvent.type(canvas.getByLabelText('1번 줄 단위'), '개');
    await userEvent.type(canvas.getByLabelText('1번 줄 위치'), '3층 301호');
    await userEvent.click(canvas.getByRole('button', { name: '1번 줄 복사' }));

    await expect(canvas.getByLabelText('2번 줄 품명')).toHaveValue('철문');
    await userEvent.clear(canvas.getByLabelText('2번 줄 규격'));
    await userEvent.type(canvas.getByLabelText('2번 줄 규격'), '800×2100 1.6T 백색');
    await userEvent.type(canvas.getByLabelText('2번 줄 수량'), '1');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('자재 2건을 기록했습니다')).toBeInTheDocument();

    const totals = within(canvas.getByRole('table', { name: '자재별 합계' }));

    await waitFor(() => expect(totals.getByText('800×2100 1.6T 백색')).toBeInTheDocument());
    await expect(totals.getByText('900×2100 1.6T 백색')).toBeInTheDocument();
  },
};

// 품명만 입력하고 수량·단위를 비우면 저장 전에 안내
export const NeedsQuantityAndUnit: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText('1번 줄 품명'), '후레싱');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/0보다 큰 수량 · 단위/)).toBeInTheDocument();
  },
};

// 전에 쓴 자재는 위의 칩을 눌러 한 번에 줄로 넣는다 (단위까지 채워짐)
export const RecentMaterialAddsRow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('최근 쓴 자재');

    const chip = canvas
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('아연도강판'))!;

    await userEvent.click(chip);

    await expect(canvas.getByLabelText('1번 줄 품명')).toHaveValue('아연도강판');
    await expect(canvas.getByLabelText('1번 줄 단위')).not.toHaveValue('');
  },
};

export const DeleteRecord: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const before = (await canvas.findAllByRole('button', { name: /기록 지우기$/ })).length;

    await userEvent.click(canvas.getAllByRole('button', { name: /기록 지우기$/ })[0]!);

    await userEvent.click(await within(document.body).findByRole('button', { name: '지우기' }));

    await waitFor(() =>
      expect(canvas.getAllByRole('button', { name: /기록 지우기$/ })).toHaveLength(before - 1),
    );
  },
};
