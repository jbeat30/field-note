import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { ProjectWorkPage } from './ProjectWorkPage';

const routerFor = (name: string) => ({
  initialEntries: [`/projects/${DEMO_PROJECTS.find((project) => project.name === name)!.id}`],
  path: '/projects/:id',
});

const meta = {
  title: 'Pages/프로젝트 작업 내역',
  component: ProjectWorkPage,
  parameters: { router: routerFor('A동 외장 판금 공사') },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectWorkPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 날짜별 작업 내역이 표로 표시되고 오늘 작업 입력 버튼이 맨 위에 위치
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/4일 기록/)).toBeInTheDocument();
    const table = canvas.getByRole('table');

    // 가장 최근 날짜가 맨 위 (9월 4일은 임시 저장)
    await waitFor(() =>
      expect(within(table).getAllByRole('row')[1]).toHaveTextContent('9월 4일 (금)'),
    );
    await expect(within(table).getAllByText('임시 저장').length).toBeGreaterThan(0);
    await expect(canvas.getByRole('link', { name: /오늘 작업 입력/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/projects\/.+\/work\/\d{4}-\d{2}-\d{2}$/),
    );
  },
};

// 열 머리를 누르면 정렬된다 (일한 시간 합계 많은 순으로 보려면 두 번)
export const SortByHours: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/4일 기록/);
    await userEvent.click(canvas.getByRole('button', { name: '일한 시간 합계' }));
    await userEvent.click(canvas.getByRole('button', { name: '일한 시간 합계' }));

    const rows = within(canvas.getByRole('table')).getAllByRole('row');

    // 24시간(9월 1일)이 가장 많은 날
    await waitFor(() => expect(rows[1]).toHaveTextContent('24시간'));
  },
};

// 달력에서 날짜 칸에 그날 일한 인원·시간이 보이고, 눌러서 그날 작업 화면으로 간다 (기록이 있는 9월로 시작)
export const CalendarShowsWorkers: Story = {
  parameters: {
    router: {
      initialEntries: [
        `/projects/${DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id}?month=2026-09`,
      ],
      path: '/projects/:id',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/4일 기록/);
    await expect(canvas.getByText('2026년 9월')).toBeInTheDocument();
    const cell = await canvas.findByRole('link', { name: /9월 1일, \d+명 24시간/ });

    await userEvent.click(cell);
    await expect(await canvas.findByTestId('navigated')).toBeInTheDocument();
  },
};

// 달을 옮겨 볼 수 있고 프로젝트 기간 밖의 날은 선택 불가
export const MoveMonth: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/4일 기록/);
    await userEvent.click(canvas.getByRole('button', { name: '이전 달' }));
    await userEvent.click(canvas.getByRole('button', { name: '다음 달' }));
    await expect(canvas.getByRole('list', { name: /작업 달력/ })).toBeInTheDocument();
    await expect(
      within(canvas.getByRole('list', { name: /작업 달력/ })).getAllByRole('listitem').length,
    ).toBeGreaterThanOrEqual(28);
  },
};

// 작업 기록이 없는 프로젝트는 첫 기록 작성을 안내
export const Empty: Story = {
  parameters: { router: routerFor('미래오피스 천장 마감') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 아직 시작하지 않은 프로젝트: 입력 불가 안내
    await expect(await canvas.findByText(/오늘은 작업을 입력할 수 없습니다/)).toBeInTheDocument();
    await expect(await canvas.findByText('아직 작업 내역이 없습니다')).toBeInTheDocument();
  },
};
