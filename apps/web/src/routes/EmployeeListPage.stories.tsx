import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { signIn } from '../mocks/state';

import { EmployeeListPage } from './EmployeeListPage';
import { chooseOption } from '../lib/storyActions';

const meta = {
  title: 'Pages/직원 목록',
  component: EmployeeListPage,
  parameters: { router: { initialEntries: ['/employees'], path: '/employees' } },
  // 한빛판금 관리자로 로그인된 상태에서 시작 (더미 직원 8명)
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof EmployeeListPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 표의 데이터 줄 (머리 줄 제외)
const rowNames = (canvas: ReturnType<typeof within>) =>
  canvas
    .getAllByRole('row')
    .slice(1)
    .map((item: HTMLElement) => item.textContent ?? '');

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('정판금')).toBeInTheDocument();
    await expect(canvas.getByText('8명')).toBeInTheDocument();
    // 직책·직종·구분이 열로 보이고, 생년월일·연락처는 목록에 없음
    const row = rowNames(canvas).find((text: string) => text.includes('정판금'))!;

    await expect(row).toContain('반장');
    await expect(row).toContain('판금공');
    await expect(row).toContain('정직원');
    await expect(canvas.queryByText(/010-0000/)).not.toBeInTheDocument();
    // 휴직·퇴사 표시, 퇴사자는 목록 맨 뒤
    await expect(within(canvas.getByRole('table')).getByText('휴직')).toBeInTheDocument();
    await waitFor(() => expect(rowNames(canvas).at(-1)).toContain('박퇴사'));
  },
};

// 머리의 `간편 등록`을 누르면 창이 열리고, 이름만 넣어도 등록된다
const openQuickAdd = async (canvas: ReturnType<typeof within>) => {
  await userEvent.click(await canvas.findByRole('button', { name: '간편 등록' }));

  return within(await within(document.body).findByRole('dialog'));
};

export const QuickAddNameOnly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await openQuickAdd(canvas);

    await userEvent.type(await dialog.findByLabelText('이름'), '  신입일용 ');
    await userEvent.click(dialog.getByRole('button', { name: '등록' }));

    await expect(await dialog.findByText('신입일용 등록했습니다')).toBeInTheDocument();
    await expect(await canvas.findByText('9명')).toBeInTheDocument();
    await expect(dialog.getByLabelText('이름')).toHaveValue('');
    await userEvent.keyboard('{Escape}');
  },
};

export const QuickAddWithJobType: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await openQuickAdd(canvas);
    const jobType = await dialog.findByLabelText('직종');

    await userEvent.type(await dialog.findByLabelText('이름'), '새용접');
    await chooseOption(jobType, '용접공');
    await userEvent.click(dialog.getByRole('button', { name: '등록' }));

    await expect(await dialog.findByText('새용접 등록했습니다')).toBeInTheDocument();
    // 창을 닫아야 뒤의 목록을 읽을 수 있다
    await userEvent.keyboard('{Escape}');

    const row = (await canvas.findByRole('link', { name: '새용접' })).closest('tr')!;

    await expect(row).toHaveTextContent('용접공');
  },
};

export const QuickAddNeedsName: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openQuickAdd(within(canvasElement));

    await userEvent.click(await dialog.findByRole('button', { name: '등록' }));

    await expect(await dialog.findByRole('alert')).toHaveTextContent('이름을 입력해 주세요');
    await userEvent.keyboard('{Escape}');
  },
};

// 목록에 현재 단가 열이 있고, 단가가 없는 재직 직원은 "단가 없음"으로 표시한다
export const ShowsCurrentRate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('정판금');
    await waitFor(() =>
      expect(rowNames(canvas).some((text: string) => /일급제 [0-9]/.test(text))).toBe(true),
    );
  },
};

// 단가표 탭: 직원별 현재 단가와 `단가 변경`, 바꾸면 표가 새 단가로 바뀐다
export const RateTable: Story = {
  parameters: { router: { initialEntries: ['/employees?tab=rates'], path: '/employees' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = within(await canvas.findByRole('table', { name: '직원 단가표' }));

    await expect(table.getByText('정판금')).toBeInTheDocument();
    await userEvent.click(table.getByRole('button', { name: '정판금 단가 변경' }));

    const dialog = within(await within(document.body).findByRole('dialog'));

    await userEvent.type(dialog.getByLabelText('일급 (원)'), '260000');
    await userEvent.click(dialog.getByRole('button', { name: '단가 저장' }));

    await waitFor(() =>
      expect(
        within(canvas.getByRole('table', { name: '직원 단가표' })).getByText('일급제 260,000원'),
      ).toBeInTheDocument(),
    );
  },
};

export const FilterByStatus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('정판금');
    await chooseOption(canvas.getByLabelText('상태 필터'), '퇴사');

    await expect(await canvas.findByText('1명')).toBeInTheDocument();
    await waitFor(() => expect(canvas.queryByText('정판금')).not.toBeInTheDocument());
    await expect(canvas.getByText('박퇴사')).toBeInTheDocument();
  },
};

export const FilterByJobType: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('정판금');
    await chooseOption(canvas.getByLabelText('직종 필터'), '보통인부');

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

// 열 머리를 누르면 그 열 기준 오름차순, 한 번 더 누르면 내림차순
export const SortByNameColumn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('정판금');
    await userEvent.click(canvas.getByRole('button', { name: '이름' }));
    await waitFor(() => expect(rowNames(canvas)[0]).toContain('김일용'));
    await expect(canvas.getByRole('columnheader', { name: /이름/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    await userEvent.click(canvas.getByRole('button', { name: '이름' }));
    await waitFor(() => expect(rowNames(canvas)[0]).toContain('한용접'));
  },
};
