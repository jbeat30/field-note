import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { ProjectPhotosPage } from './ProjectPhotosPage';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const meta = {
  title: 'Pages/프로젝트 사진첩',
  component: ProjectPhotosPage,
  parameters: {
    router: { initialEntries: [`/projects/${projectId}/photos`], path: '/projects/:id/photos' },
  },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectPhotosPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const photoButtons = (canvas: ReturnType<typeof within>) =>
  canvas.getAllByRole('button', { name: /사진 열기/ });

// 올리기 폼 없이 작업 날짜별 묶음으로 모아 봄 (더미 5장: 10월 7일 1장, 6일 2장, 5일 2장)
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', { name: '사진첩' })).toBeInTheDocument();
    await waitFor(() => expect(photoButtons(canvas)).toHaveLength(5));
    await expect(canvas.queryByText('사진 올리기')).not.toBeInTheDocument();

    const headings = canvas.getAllByRole('heading', { level: 3 }).map((item) => item.textContent);

    await expect(headings).toEqual([
      '2026년 10월 7일 (수)',
      '2026년 10월 6일 (화)',
      '2026년 10월 5일 (월)',
    ]);

    const latest = within(canvas.getByRole('region', { name: '2026년 10월 7일 (수) 사진' }));

    await expect(latest.getByText('1장')).toBeInTheDocument();
    await expect(latest.getByRole('link', { name: '작업 기록 보기' })).toHaveAttribute(
      'href',
      `/projects/${projectId}/work/2026-10-07`,
    );
    await expect(canvas.getByText('대표')).toBeInTheDocument();
  },
};

export const FilterByCategory: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(photoButtons(canvas)).toHaveLength(5));
    await userEvent.click(canvas.getByRole('button', { name: '작업 전' }));

    await waitFor(() => expect(photoButtons(canvas)).toHaveLength(2));
    // 같은 칩을 다시 누르면 필터 해제
    await userEvent.click(canvas.getByRole('button', { name: '작업 전' }));
    await waitFor(() => expect(photoButtons(canvas)).toHaveLength(5));
  },
};

export const FindByArea: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(photoButtons(canvas)).toHaveLength(5));
    // 구역은 부분 일치
    await userEvent.type(canvas.getByLabelText('구역 찾기'), '302');

    await waitFor(() => expect(photoButtons(canvas)).toHaveLength(2));

    await userEvent.clear(canvas.getByLabelText('구역 찾기'));
    await userEvent.type(canvas.getByLabelText('구역 찾기'), '없는 구역');
    await expect(await canvas.findByText('조건에 맞는 사진이 없습니다')).toBeInTheDocument();
  },
};

export const BeforeAfterComparison: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('radio', { name: '전후 비교' }));

    await expect(await canvas.findByRole('heading', { name: '3층 301호' })).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: '3층 302호' })).toBeInTheDocument();
  },
};

// 크게 보기에서 앞뒤로 넘기고(화면 순서) 지우기는 확인 창 경유
export const OpenDetailNavigateAndDelete: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await waitFor(() => expect(photoButtons(canvas)).toHaveLength(5));
    await userEvent.click(photoButtons(canvas)[0]!);

    let dialog = within(await body.findByRole('dialog'));

    await expect(dialog.getByRole('heading', { name: /10월 7일/ })).toBeInTheDocument();
    await expect(dialog.queryByRole('button', { name: '이전 사진' })).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: '다음 사진' }));

    dialog = within(await body.findByRole('dialog'));
    await expect(await dialog.findByRole('heading', { name: /10월 6일/ })).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('button', { name: '삭제' }));
    await userEvent.click(body.getByRole('button', { name: '지우기' }));

    await waitFor(() => expect(photoButtons(canvas)).toHaveLength(4));
  },
};
