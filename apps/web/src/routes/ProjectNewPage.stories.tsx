import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { findAccount, getPartners, getProjects, signIn } from '../mocks/state';

import { ProjectNewPage } from './ProjectNewPage';

const meta = {
  title: 'Pages/프로젝트 등록',
  component: ProjectNewPage,
  parameters: { router: { initialEntries: ['/projects/new'], path: '/projects/new' } },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectNewPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const fillRequired = async (canvas: ReturnType<typeof within>) => {
  await userEvent.type(await canvas.findByLabelText('프로젝트명'), '신규 판금 공사');
  await userEvent.type(canvas.getByLabelText('현장 이름'), '신규 현장');
  await userEvent.selectOptions(canvas.getByLabelText('고객'), '가나다건설');
  await userEvent.selectOptions(canvas.getByLabelText('담당자'), '송소장 (소장)');
  await userEvent.type(canvas.getByLabelText('계약일'), '2026-11-01');
  await userEvent.type(canvas.getByLabelText('시작 예정일'), '2026-11-10');
  await userEvent.type(canvas.getByLabelText('종료 예정일'), '2027-02-28');
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', { name: '프로젝트 등록' })).toBeInTheDocument();
    await expect(canvas.getByText(/코드는 저장할 때 자동으로 붙고/)).toBeInTheDocument();
    // 고객은 명부의 고객만, 숨긴 고객(옛날상가)과 다른 구분(공급처)은 목록에 없음
    const client = await canvas.findByLabelText('고객');

    await expect(within(client).getByRole('option', { name: '가나다건설' })).toBeInTheDocument();
    await expect(
      within(client).queryByRole('option', { name: '옛날상가' }),
    ).not.toBeInTheDocument();
    await expect(
      within(client).queryByRole('option', { name: '대한철강' }),
    ).not.toBeInTheDocument();
  },
};

export const RequiredFields: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '프로젝트 등록' }));

    await expect(await canvas.findByText('프로젝트명을 입력해 주세요')).toBeInTheDocument();
    await expect(canvas.getByText('현장 이름을 입력해 주세요')).toBeInTheDocument();
    await expect(canvas.getByText('고객을 선택해 주세요')).toBeInTheDocument();
    await expect(canvas.getByText('담당자를 선택해 주세요')).toBeInTheDocument();
  },
};

export const EndBeforeStart: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillRequired(canvas);
    await userEvent.clear(canvas.getByLabelText('종료 예정일'));
    await userEvent.type(canvas.getByLabelText('종료 예정일'), '2026-11-01');
    await userEvent.click(canvas.getByRole('button', { name: '프로젝트 등록' }));

    await expect(
      await canvas.findByText('종료 예정일은 시작 예정일보다 빠를 수 없습니다'),
    ).toBeInTheDocument();
  },
};

export const InvalidMapLink: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillRequired(canvas);
    await userEvent.type(canvas.getByLabelText('지도 링크'), 'javascript:alert(1)');
    await userEvent.click(canvas.getByRole('button', { name: '프로젝트 등록' }));

    await expect(await canvas.findByText(/http:\/\/ 또는 https:\/\/로 시작/)).toBeInTheDocument();
  },
};

export const CreateWithTrades: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillRequired(canvas);
    await userEvent.click(await canvas.findByLabelText('판금'));
    await userEvent.click(canvas.getByLabelText('설비'));
    await userEvent.click(canvas.getByRole('button', { name: '프로젝트 등록' }));

    // 등록하면 코드가 자동으로 붙고 예정 상태로 저장됨
    await waitFor(() =>
      expect(
        getProjects(findAccount('hanbit')!).some((project) => project.name === '신규 판금 공사'),
      ).toBe(true),
    );

    const created = getProjects(findAccount('hanbit')!).find(
      (project) => project.name === '신규 판금 공사',
    )!;

    await expect(created.code).toMatch(/^\d{4}-\d{3}$/);
    await expect(created.status).toBe('PLANNED');
    await expect(created.tradeIds).toHaveLength(2);
  },
};

// 목록에 없는 고객은 그 자리에서 추가하고 바로 선택됨
export const AddClientInline: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '목록에 없는 고객 추가' }));
    await userEvent.type(canvas.getByLabelText('새 고객 상호'), '새고객건설');
    await userEvent.click(canvas.getByRole('button', { name: '추가' }));

    await waitFor(() => expect(canvas.getByLabelText('고객')).toHaveDisplayValue('새고객건설'));
    await expect(
      getPartners(findAccount('hanbit')!).some(
        (partner) => partner.name === '새고객건설' && partner.kind === 'CLIENT',
      ),
    ).toBe(true);
  },
};

export const AddClientInlineDuplicate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '목록에 없는 고객 추가' }));
    await userEvent.type(canvas.getByLabelText('새 고객 상호'), '가나다건설');
    await userEvent.click(canvas.getByRole('button', { name: '추가' }));

    await expect(
      await canvas.findByText('같은 구분에 이미 같은 상호가 있습니다'),
    ).toBeInTheDocument();
  },
};

export const AddTradeInline: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '목록에 없는 공종 추가' }));
    await userEvent.type(canvas.getByLabelText('새 공종 이름'), '도장');
    await userEvent.click(canvas.getByRole('button', { name: '추가' }));

    // 추가한 공종이 목록에 생기고 바로 선택됨
    await expect(await canvas.findByLabelText('도장')).toBeChecked();
  },
};
