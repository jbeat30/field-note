import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { MaterialDayPanel } from './MaterialDayPanel';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const meta = {
  title: 'Materials/일지 안 자재',
  component: MaterialDayPanel,
  args: { projectId, date: '2026-10-07', categories: [] },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof MaterialDayPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

// 그날 기록이 보이고 최근 쓴 자재가 눌러서 추가할 수 있게 나옴
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('사용 32장')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '아연도강판 1.0T' })).toBeInTheDocument();
  },
};

export const EmptyDay: Story = {
  args: { date: '2026-10-08' },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText('이 날 기록한 자재가 없습니다'),
    ).toBeInTheDocument();
  },
};

// 입력 → 저장하면 그날 기록에 나타나고 입력 행은 비워짐
export const AddAndSave: Story = {
  args: { date: '2026-10-08' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('이 날 기록한 자재가 없습니다');
    await userEvent.click(await canvas.findByRole('button', { name: '아연도강판 1.0T' }));
    await userEvent.type(canvas.getByLabelText('수량'), '6');
    await userEvent.click(canvas.getByRole('button', { name: '자재 1건 저장' }));

    await expect(await canvas.findByText('사용 6장')).toBeInTheDocument();
    await waitFor(() => expect(canvas.queryByLabelText('수량')).not.toBeInTheDocument());
  },
};

// 어제(직전 기록일)와 같은 사용 자재를 복사
export const CopyPreviousDay: Story = {
  args: { date: '2026-10-08' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('이 날 기록한 자재가 없습니다');
    await waitFor(() => expect(canvas.getByRole('button', { name: '어제와 동일' })).toBeEnabled());
    await userEvent.click(canvas.getByRole('button', { name: '어제와 동일' }));

    // 직전 기록일(10-07)의 사용: 아연도강판 32장, 실리콘 코킹 8개
    await expect(
      canvas
        .getAllByLabelText('수량')
        .map((input) => (input as HTMLInputElement).value)
        .sort(),
    ).toEqual(['32', '8']);
  },
};

// 목록에 없는 자재를 그 자리에서 만들고 바로 기록
export const CreateOnTheSpotThenSave: Story = {
  args: { date: '2026-10-08' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '새 자재' }));
    await userEvent.type(canvas.getByLabelText('자재명'), '리벳');
    await userEvent.click(canvas.getByRole('button', { name: '자재 추가하고 입력 행에 넣기' }));
    await userEvent.type(await canvas.findByLabelText('수량'), '2');
    await userEvent.click(canvas.getByRole('button', { name: '자재 1건 저장' }));

    await expect(await canvas.findByText('사용 2장')).toBeInTheDocument();
    // 기록 목록과 최근 쓴 자재 버튼에 모두 나옴
    await expect(canvas.getAllByText('리벳').length).toBeGreaterThanOrEqual(1);
  },
};
