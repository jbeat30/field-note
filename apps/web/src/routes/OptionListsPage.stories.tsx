import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { signIn } from '../mocks/state';

import { OptionListsPage } from './OptionListsPage';

const meta = {
  title: 'Pages/목록 관리',
  component: OptionListsPage,
  parameters: { router: { initialEntries: ['/settings/lists'], path: '/settings/lists' } },
  // 한빛판금 관리자로 로그인된 상태에서 시작
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof OptionListsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 종류별 영역 (같은 이름이 여러 종류에 있을 수 있어 영역 안에서만 찾는다)
const section = async (canvasElement: HTMLElement, name: string) =>
  within(await within(canvasElement).findByRole('region', { name }));

const namesIn = (list: ReturnType<typeof within>) =>
  list.getAllByRole('listitem').map((item: HTMLElement) => item.textContent ?? '');

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const jobs = await section(canvasElement, '직종');

    await expect(await jobs.findByText('판금공')).toBeInTheDocument();
    await expect(jobs.getByText('보통인부')).toBeInTheDocument();
    // 네 가지 목록이 모두 보임
    for (const name of ['작업 구분', '공종', '직원 구분']) {
      await expect(await section(canvasElement, name)).toBeTruthy();
    }
    // 첫 항목은 위로, 마지막 항목은 아래로 이동할 수 없음
    await expect(jobs.getByRole('button', { name: '판금공 위로' })).toBeDisabled();
    await expect(jobs.getByRole('button', { name: '사무 아래로' })).toBeDisabled();
  },
};

export const AddItem: Story = {
  play: async ({ canvasElement }) => {
    const works = await section(canvasElement, '작업 구분');

    await userEvent.type(await works.findByLabelText('작업 구분 추가'), '  도장 ');
    await userEvent.click(works.getByRole('button', { name: '추가' }));

    await expect(await works.findByText('도장')).toBeInTheDocument();
    // 추가한 뒤 입력칸은 비워짐
    await expect(works.getByLabelText('작업 구분 추가')).toHaveValue('');
  },
};

export const DuplicateName: Story = {
  play: async ({ canvasElement }) => {
    const jobs = await section(canvasElement, '직종');

    await userEvent.type(await jobs.findByLabelText('직종 추가'), ' 용접공 ');
    await userEvent.click(jobs.getByRole('button', { name: '추가' }));

    await expect(await jobs.findByRole('alert')).toHaveTextContent('이미 같은 이름이 있습니다');
  },
};

export const EmptyName: Story = {
  play: async ({ canvasElement }) => {
    const trades = await section(canvasElement, '공종');

    await userEvent.click(await trades.findByRole('button', { name: '추가' }));

    await expect(await trades.findByRole('alert')).toHaveTextContent('이름을 입력해 주세요');
  },
};

export const Rename: Story = {
  play: async ({ canvasElement }) => {
    const jobs = await section(canvasElement, '직종');

    await userEvent.click(await jobs.findByRole('button', { name: '사무 이름 변경' }));

    const input = jobs.getByLabelText('사무 이름 변경', { selector: 'input' });

    await userEvent.clear(input);
    await userEvent.type(input, '사무직');
    await userEvent.click(jobs.getByRole('button', { name: '저장' }));

    await expect(await jobs.findByText('사무직')).toBeInTheDocument();
    await expect(jobs.queryByText('사무')).not.toBeInTheDocument();
  },
};

export const RenameToDuplicate: Story = {
  play: async ({ canvasElement }) => {
    const jobs = await section(canvasElement, '직종');

    await userEvent.click(await jobs.findByRole('button', { name: '사무 이름 변경' }));

    const input = jobs.getByLabelText('사무 이름 변경', { selector: 'input' });

    await userEvent.clear(input);
    await userEvent.type(input, '목수');
    await userEvent.click(jobs.getByRole('button', { name: '저장' }));

    await expect(await jobs.findByText('이미 같은 이름이 있습니다')).toBeInTheDocument();
  },
};

export const HideAndRestore: Story = {
  play: async ({ canvasElement }) => {
    const jobs = await section(canvasElement, '직종');

    await userEvent.click(await jobs.findByRole('button', { name: '사무 숨기기' }));

    // 삭제되지 않고 숨김 표시와 함께 남음
    await expect(await jobs.findByText('(숨김)')).toBeInTheDocument();

    await userEvent.click(jobs.getByRole('button', { name: '사무 다시 사용' }));

    await waitFor(() => expect(jobs.queryByText('(숨김)')).not.toBeInTheDocument());
  },
};

export const Reorder: Story = {
  play: async ({ canvasElement }) => {
    const jobs = await section(canvasElement, '직종');

    await userEvent.click(await jobs.findByRole('button', { name: '판금공 아래로' }));

    await waitFor(() => expect(namesIn(jobs)[0]).toContain('설치공'));
    await expect(namesIn(jobs)[1]).toContain('판금공');
  },
};
