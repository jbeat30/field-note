import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { chooseOption } from '../lib/storyActions';
import { signIn } from '../mocks/state';

import { StaffingCalendarPage } from './StaffingCalendarPage';

const meta = {
  title: 'Pages/인력 배치',
  component: StaffingCalendarPage,
  // 더미 작업 내역(2026-09-01~03)이 있는 주로 고정, 사람별 타임라인 보기를 기본으로 시험
  parameters: {
    router: { initialEntries: ['/staffing?from=2026-08-31&by=person'], path: '/staffing' },
  },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof StaffingCalendarPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 더미: 9/1~9/3 A동(정판금·최설치·한용접·김일용), 9/2에 최설치·한용접은 B동에도 들어가 최설치는 같은 날 두 곳
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('2026-08-31 ~ 2026-09-06')).toBeInTheDocument();

    // 위쪽 지표 타일
    const tile = async (label: string) =>
      (await canvas.findByText(label, { selector: 'dt' })).nextElementSibling as HTMLElement;

    await expect(await tile('일한 사람')).toHaveTextContent('4명');
    await expect(await tile('겹침')).toHaveTextContent('1건');

    // 정판금: 9/1·9/2 이틀 이어서 한 프로젝트 → 막대 하나, 날마다 시간
    const day1 = await canvas.findByRole('link', { name: /정판금 2026년 9월 1일 \(화\)/ });
    const day2 = canvas.getByRole('link', { name: /정판금 2026년 9월 2일 \(수\)/ });

    await expect(day1).toHaveTextContent('8h');
    await expect(day1).toHaveAttribute(
      'href',
      expect.stringMatching(/\/projects\/.+\/work\/2026-09-01$/),
    );
    await expect(day1.parentElement).toBe(day2.parentElement);
    // 일한 사람 우선 표시, 기록이 없는 사람은 별도 그룹
    await expect(
      within(canvas.getByRole('group', { name: '인력 배치 타임라인' })).getByText('일한 사람 4명'),
    ).toBeInTheDocument();
    await expect(
      within(canvas.getByRole('group', { name: '인력 배치 타임라인' })).getByText(
        /일한 기록이 없는 사람 \d+명/,
      ),
    ).toBeInTheDocument();
    // 임시 저장(9/4)은 막대로 표시되지 않음
    await expect(
      canvas.queryByRole('link', { name: /정판금 2026년 9월 4일/ }),
    ).not.toBeInTheDocument();
  },
};

// 같은 날 두 프로젝트에서 일하면 막대가 위아래로 쌓이고 해당 날짜를 겹침으로 표시
export const OverlapShowsStackedBars: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const links = await canvas.findAllByRole('link', { name: /최설치 2026년 9월 2일/ });

    await expect(links).toHaveLength(2);
    for (const link of links) {
      await expect(link).toHaveAttribute('data-conflict', 'true');
      await expect(link).toHaveAccessibleName(/같은 날 겹침/);
      await expect(link).toHaveAccessibleName(/외장 판금 공사 8시간/);
      await expect(link).toHaveAccessibleName(/덕트/);
    }

    // 겹침 있는 사람만 필터하면 겹치는 사람만 표시
    await userEvent.click(canvas.getByRole('button', { name: /겹침 있는 사람/ }));
    await waitFor(() =>
      expect(canvas.queryByRole('link', { name: '정판금' })).not.toBeInTheDocument(),
    );
    await expect(canvas.getByRole('link', { name: '최설치' })).toBeInTheDocument();
  },
};

export const MoveAndSwitchView: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('2026-08-31 ~ 2026-09-06');
    await userEvent.click(canvas.getByRole('button', { name: '다음 기간' }));
    await expect(await canvas.findByText('2026-09-07 ~ 2026-09-13')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '이전 기간' }));
    await expect(await canvas.findByText('2026-08-31 ~ 2026-09-06')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('radio', { name: '2주' }));
    await expect(await canvas.findByText('2026-08-31 ~ 2026-09-13')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('radio', { name: '월' }));
    await expect(await canvas.findByText('2026년 9월')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '다음 달' })).toBeInTheDocument();
  },
};

export const FilterByTitle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('link', { name: '정판금' });
    await chooseOption(canvas.getByLabelText('직종으로 거르기'), '기공');

    await waitFor(() =>
      expect(canvas.queryByRole('link', { name: '정판금' })).not.toBeInTheDocument(),
    );
    await expect(canvas.getByRole('link', { name: '최설치' })).toBeInTheDocument();
  },
};

// 빈 칸을 누르면 프로젝트 선택 가능 (선택하면 그 프로젝트의 그날 하루 기록으로 이동)
export const PickProjectOnEmptyCell: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      await canvas.findByRole('button', { name: /김일용 9월 1일 \(화\) 프로젝트 고르기/ }),
    );

    const menu = within(await within(document.body).findByRole('menu'));

    await expect(menu.getByText(/김일용, 9월 1일 \(화\) 하루 기록으로/)).toBeInTheDocument();
    await expect(menu.getAllByRole('menuitem').length).toBeGreaterThan(0);
    await userEvent.keyboard('{Escape}');
  },
};

// 기본은 날짜 칸 달력: 칸을 누르면 아래에 그날 일한 사람이 프로젝트별로 나옴
export const CalendarView: Story = {
  parameters: { router: { initialEntries: ['/staffing?from=2026-08-31'], path: '/staffing' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('radio', { name: '달력', checked: true }),
    ).toBeInTheDocument();

    // 9/2는 3명이 일하고 최설치는 두 곳에 들어가 겹침으로 표시됨
    await userEvent.click(
      await canvas.findByRole('button', { name: /2026년 9월 2일.*일한 사람 3명/ }),
    );

    const detail = within(await canvas.findByRole('region', { name: /9월 2일.*일한 사람/ }));

    await expect(detail.getAllByText(/최설치/).length).toBeGreaterThan(0);
  },
};

// 프로젝트별 카드: 프로젝트마다 누가 며칠 몇 시간 일했는지
export const ProjectView: Story = {
  parameters: {
    router: { initialEntries: ['/staffing?from=2026-08-31&by=project'], path: '/staffing' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = within(await canvas.findByRole('list', { name: '프로젝트별 인력' }));

    await expect(list.getByText('A동 외장 판금 공사')).toBeInTheDocument();
    await expect(list.getByText('B동 덕트 설치')).toBeInTheDocument();
    await expect(
      list.getAllByRole('link', { name: /최설치 2026년 9월 2일/ }).length,
    ).toBeGreaterThan(0);
  },
};
