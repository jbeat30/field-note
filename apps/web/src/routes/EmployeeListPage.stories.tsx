import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { signIn } from '../mocks/state';

import { EmployeeListPage } from './EmployeeListPage';

const meta = {
  title: 'Pages/직원 목록',
  component: EmployeeListPage,
  parameters: { router: { initialEntries: ['/employees'], path: '/employees' } },
  // 한빛판금 관리자로 로그인된 상태에서 시작 (더미 직원 8명)
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof EmployeeListPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const rowNames = (canvas: ReturnType<typeof within>) =>
  canvas
    .getAllByRole('listitem')
    .map((item: HTMLElement) => item.textContent ?? '')
    .filter(Boolean);

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('정판금')).toBeInTheDocument();
    await expect(canvas.getByText('8명')).toBeInTheDocument();
    // 직책·직종·구분이 한 줄로 보이고, 생년월일·연락처는 목록에 없음
    await expect(canvas.getByText('반장 · 판금공 · 정직원')).toBeInTheDocument();
    await expect(canvas.queryByText(/010-0000/)).not.toBeInTheDocument();
    // 휴직·퇴사 표시, 퇴사자는 목록 맨 뒤
    await expect(within(canvas.getByRole('list')).getByText('휴직')).toBeInTheDocument();
    await waitFor(() => expect(rowNames(canvas).at(-1)).toContain('박퇴사'));
  },
};

export const QuickAddNameOnly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText('이름'), '  신입일용 ');
    await userEvent.click(canvas.getByRole('button', { name: '등록' }));

    await expect(await canvas.findByText('신입일용 등록했습니다')).toBeInTheDocument();
    await expect(await canvas.findByText('9명')).toBeInTheDocument();
    await expect(canvas.getByLabelText('이름')).toHaveValue('');
  },
};

export const QuickAddWithJobType: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const jobType = await canvas.findByLabelText('직종');

    await userEvent.type(await canvas.findByLabelText('이름'), '새용접');
    await within(jobType).findByRole('option', { name: '용접공' });
    await userEvent.selectOptions(jobType, '용접공');
    await userEvent.click(canvas.getByRole('button', { name: '등록' }));

    await expect(await canvas.findByText('새용접 등록했습니다')).toBeInTheDocument();

    const row = (await canvas.findByText('새용접', { selector: 'span' })).closest('li')!;

    await expect(row).toHaveTextContent('용접공');
  },
};

export const QuickAddNeedsName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '등록' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent('이름을 입력해 주세요');
  },
};

export const FilterByStatus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('정판금');
    await userEvent.selectOptions(canvas.getByLabelText('상태 필터'), '퇴사');

    await expect(await canvas.findByText('1명')).toBeInTheDocument();
    await waitFor(() => expect(canvas.queryByText('정판금')).not.toBeInTheDocument());
    await expect(canvas.getByText('박퇴사')).toBeInTheDocument();
  },
};

export const FilterByJobType: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('정판금');
    await userEvent.selectOptions(canvas.getByLabelText('직종 필터'), '보통인부');

    await expect(await canvas.findByText('2명')).toBeInTheDocument();
    await expect(canvas.getByText('김일용')).toBeInTheDocument();
    await expect(canvas.getByText('이조공')).toBeInTheDocument();
  },
};

export const SearchByName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('정판금');
    await userEvent.type(canvas.getByLabelText('이름 검색'), '용');

    await expect(await canvas.findByText('2명')).toBeInTheDocument();
    await expect(canvas.getByText('한용접')).toBeInTheDocument();
    await expect(canvas.getByText('김일용')).toBeInTheDocument();
  },
};

export const NoResult: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('정판금');
    await userEvent.type(canvas.getByLabelText('이름 검색'), '없는이름');

    await expect(await canvas.findByText('조건에 맞는 직원이 없습니다')).toBeInTheDocument();
  },
};
