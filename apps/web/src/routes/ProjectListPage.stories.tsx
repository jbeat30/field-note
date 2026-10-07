import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { signIn } from '../mocks/state';

import { ProjectListPage } from './ProjectListPage';

const meta = {
  title: 'Pages/프로젝트 목록',
  component: ProjectListPage,
  parameters: { router: { initialEntries: ['/projects'], path: '/projects' } },
  // 한빛판금 관리자로 로그인된 상태에서 시작 (더미 프로젝트 5건)
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectListPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const rows = (canvas: ReturnType<typeof within>) =>
  within(canvas.getByRole('region', { name: '프로젝트 목록' }))
    .getAllByRole('listitem')
    .map((item: HTMLElement) => item.textContent ?? '');

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('A동 외장 판금 공사')).toBeInTheDocument();
    await expect(canvas.getByText('5건')).toBeInTheDocument();
    // 코드는 숫자 순서의 최근 등록순 (2025년 번호가 맨 뒤)
    await waitFor(() => expect(rows(canvas)[0]).toContain('2026-004'));
    await expect(rows(canvas).at(-1)).toContain('2025-012');
    // 상태·현장·고객·담당자·기간·공종이 보이고, 현장 연락처·출입 메모는 목록에 없음
    await expect(
      await canvas.findByText('A동 신축 현장 · 가나다건설 · 송소장'),
    ).toBeInTheDocument();
    await expect(await canvas.findByText(/2026-07-15 ~ 2026-11-30 · 판금/)).toBeInTheDocument();
    await expect(canvas.queryByText(/02-0000-0101/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/정문 출입증/)).not.toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: '프로젝트 등록' })).toHaveAttribute(
      'href',
      '/projects/new',
    );
  },
};

export const FilterByStatus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.selectOptions(canvas.getByLabelText('상태 필터'), '중단');

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByText('B동 덕트 설치')).toBeInTheDocument();
    await expect(canvas.queryByText('A동 외장 판금 공사')).not.toBeInTheDocument();
  },
};

export const FilterByClient: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await within(canvas.getByLabelText('고객 필터')).findByRole('option', { name: '미래오피스' });
    await userEvent.selectOptions(canvas.getByLabelText('고객 필터'), '미래오피스');

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByText('미래오피스 천장 마감')).toBeInTheDocument();
  },
};

export const FilterByTradeAndManager: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await within(canvas.getByLabelText('공종 필터')).findByRole('option', { name: '설비' });
    await userEvent.selectOptions(canvas.getByLabelText('공종 필터'), '설비');

    await expect(await canvas.findByText('2건')).toBeInTheDocument();

    await within(canvas.getByLabelText('담당자 필터')).findByRole('option', { name: '최설치' });
    await userEvent.selectOptions(canvas.getByLabelText('담당자 필터'), '최설치');

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByText('B동 덕트 설치')).toBeInTheDocument();
  },
};

export const SearchByNameCodeSite: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.type(canvas.getByLabelText('프로젝트 검색'), '기계실');

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByText('B동 덕트 설치')).toBeInTheDocument();
  },
};

export const FilterByPeriod: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    // 2027년 1월과 겹치는 프로젝트는 미래오피스 천장 마감뿐
    await userEvent.type(canvas.getByLabelText('기간 시작'), '2027-01-10');
    await userEvent.type(canvas.getByLabelText('기간 끝'), '2027-01-20');

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByText('미래오피스 천장 마감')).toBeInTheDocument();
  },
};

export const SortByEndDate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.selectOptions(canvas.getByLabelText('정렬'), '종료 예정일 빠른 순');

    await waitFor(() => expect(rows(canvas)[0]).toContain('C동 환기 설비'));
    await expect(rows(canvas).at(-1)).toContain('미래오피스 천장 마감');
  },
};

export const ClearFilters: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.selectOptions(canvas.getByLabelText('상태 필터'), '완료');
    await expect(await canvas.findByText('1건')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '필터 지우기' }));

    await expect(await canvas.findByText('5건')).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: '필터 지우기' })).not.toBeInTheDocument();
  },
};

export const NoResult: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.type(canvas.getByLabelText('프로젝트 검색'), '없는프로젝트');

    await expect(await canvas.findByText('조건에 맞는 프로젝트가 없습니다')).toBeInTheDocument();
  },
};
