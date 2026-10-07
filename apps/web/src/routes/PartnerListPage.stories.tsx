import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { signIn } from '../mocks/state';

import { PartnerListPage } from './PartnerListPage';

const meta = {
  title: 'Pages/명부 목록',
  component: PartnerListPage,
  parameters: { router: { initialEntries: ['/partners'], path: '/partners' } },
  // 한빛판금 관리자로 로그인된 상태에서 시작 (더미 업체 7곳, 그중 1곳은 숨김)
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof PartnerListPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('가나다건설')).toBeInTheDocument();
    // 숨긴 업체를 뺀 6곳, 구분별로 묶여 보임
    await expect(canvas.getByText('6곳')).toBeInTheDocument();
    for (const heading of ['고객', '협력업체', '자재 공급처']) {
      await expect(canvas.getByRole('heading', { name: heading, level: 3 })).toBeInTheDocument();
    }
    // 담당자 이름은 보이고 연락처·메모는 목록에 없음
    await expect(canvas.getByText('윤소장')).toBeInTheDocument();
    await expect(canvas.queryByText(/02-0000-0101/)).not.toBeInTheDocument();
    await expect(canvas.queryByText('옛날상가')).not.toBeInTheDocument();
  },
};

export const ShowHidden: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('가나다건설');
    await userEvent.click(canvas.getByLabelText(/숨긴 업체도 보기/));

    await expect(await canvas.findByText('옛날상가')).toBeInTheDocument();
    await expect(canvas.getByText('7곳')).toBeInTheDocument();
    await expect(canvas.getByText('숨김')).toBeInTheDocument();
  },
};

export const QuickAddClientNameOnly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText('상호'), '  신규발주처 ');
    await userEvent.click(canvas.getByRole('button', { name: '등록' }));

    await expect(await canvas.findByText('신규발주처 등록했습니다')).toBeInTheDocument();
    await expect(await canvas.findByText('7곳')).toBeInTheDocument();
    await expect(canvas.getByLabelText('상호')).toHaveValue('');
  },
};

export const QuickAddSupplier: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(
      await canvas.findByLabelText('구분'),
      '자재 공급처 (자재를 사 오는 곳)',
    );
    await userEvent.type(canvas.getByLabelText('상호'), '새공급처');
    await userEvent.click(canvas.getByRole('button', { name: '등록' }));

    await expect(await canvas.findByText('새공급처 등록했습니다')).toBeInTheDocument();
  },
};

export const DuplicateName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 같은 구분(고객)에 이미 있는 상호
    await userEvent.type(await canvas.findByLabelText('상호'), ' 가나다건설 ');
    await userEvent.click(canvas.getByRole('button', { name: '등록' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent('이미 같은 상호가 있습니다');
  },
};

export const NeedsName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '등록' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent('상호를 입력해 주세요');
  },
};

export const FilterByKind: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('가나다건설');
    await userEvent.selectOptions(canvas.getByLabelText('구분 필터'), '자재 공급처');

    await expect(await canvas.findByText('2곳')).toBeInTheDocument();
    await expect(canvas.getByText('대한철강')).toBeInTheDocument();
    await expect(canvas.queryByText('가나다건설')).not.toBeInTheDocument();
  },
};

export const SearchByContact: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('가나다건설');
    await userEvent.type(canvas.getByLabelText('상호·담당자 검색'), '문반장');

    await expect(await canvas.findByText('1곳')).toBeInTheDocument();
    await expect(canvas.getByText('대성전기')).toBeInTheDocument();
  },
};

export const NoResult: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('가나다건설');
    await userEvent.type(canvas.getByLabelText('상호·담당자 검색'), '없는업체');

    await expect(await canvas.findByText('조건에 맞는 업체가 없습니다')).toBeInTheDocument();
  },
};
