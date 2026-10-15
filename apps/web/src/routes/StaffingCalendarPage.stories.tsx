import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { chooseOption } from '../lib/storyActions';
import { signIn } from '../mocks/state';

import { StaffingCalendarPage } from './StaffingCalendarPage';

const meta = {
  title: 'Pages/인력 배치',
  component: StaffingCalendarPage,
  // 더미 작업 내역(2026-09-01~03)이 있는 주로 고정
  parameters: { router: { initialEntries: ['/staffing?from=2026-08-31'], path: '/staffing' } },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof StaffingCalendarPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 더미: 9/1~9/3 A동(정판금·최설치·한용접·김일용), 9/2에 최설치·한용접은 B동에도 들어가 최설치는 같은 날 두 곳
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('2026-08-31 ~ 2026-09-06')).toBeInTheDocument();

    const summary = await canvas.findByLabelText('요약');

    await expect(summary).toHaveTextContent('일한 사람 4명');
    await expect(summary).toHaveTextContent('겹침 1건');

    // 정판금: 9/1·9/2 이틀 이어서 한 프로젝트 → 막대 하나, 날마다 시간
    const day1 = await canvas.findByRole('link', { name: /정판금 2026년 9월 1일 \(화\)/ });
    const day2 = canvas.getByRole('link', { name: /정판금 2026년 9월 2일 \(수\)/ });

    await expect(day1).toHaveTextContent('8h');
    await expect(day1).toHaveAttribute(
      'href',
      expect.stringMatching(/\/projects\/.+\/work\/2026-09-01$/),
    );
    await expect(day1.parentElement).toBe(day2.parentElement);
    // 일한 사람이 먼저, 기록이 없는 사람은 따로 묶는다
    await expect(
      within(canvas.getByRole('group', { name: '인력 배치 타임라인' })).getByText('일한 사람 4명'),
    ).toBeInTheDocument();
    await expect(
      within(canvas.getByRole('group', { name: '인력 배치 타임라인' })).getByText(
        /일한 기록이 없는 사람 \d+명/,
      ),
    ).toBeInTheDocument();
    // 임시 저장(9/4)은 막대로 보이지 않는다
    await expect(
      canvas.queryByRole('link', { name: /정판금 2026년 9월 4일/ }),
    ).not.toBeInTheDocument();
  },
};

// 같은 날 두 프로젝트에서 일하면 막대가 위아래로 쌓이고 그 날이 겹침으로 표시된다
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

    // 겹침 있는 사람만 거르면 겹치는 사람만 남는다
    await userEvent.click(canvas.getByRole('button', { name: '겹침 있는 사람만' }));
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

// 빈 칸을 누르면 프로젝트를 고를 수 있다 (고르면 그 프로젝트의 그날 하루 기록으로 간다)
export const PickProjectOnEmptyCell: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      await canvas.findByRole('button', { name: /김일용 9월 1일 \(화\) 프로젝트 고르기/ }),
    );

    const menu = within(await within(document.body).findByRole('menu'));

    await expect(menu.getByText(/김일용 · 9월 1일 \(화\) 하루 기록으로/)).toBeInTheDocument();
    await expect(menu.getAllByRole('menuitem').length).toBeGreaterThan(0);
    await userEvent.keyboard('{Escape}');
  },
};
