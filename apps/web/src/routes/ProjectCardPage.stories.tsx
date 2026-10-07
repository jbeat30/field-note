import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { ProjectCardPage } from './ProjectCardPage';

const routerFor = (name: string) => ({
  initialEntries: [`/projects/${DEMO_PROJECTS.find((project) => project.name === name)!.id}`],
  path: '/projects/:id',
});

const meta = {
  title: 'Pages/프로젝트 카드',
  component: ProjectCardPage,
  parameters: { router: routerFor('A동 외장 판금 공사') },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectCardPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('heading', { name: 'A동 외장 판금 공사' }),
    ).toBeInTheDocument();
    // 코드와 상태는 보이기만 하고 수정 칸이 없음
    await expect(canvas.getByText('2026-001')).toBeInTheDocument();
    await expect(canvas.getByText('진행')).toBeInTheDocument();
    await expect(canvas.queryByLabelText('프로젝트 코드')).not.toBeInTheDocument();
    await expect(await canvas.findByLabelText('현장 이름')).toHaveValue('A동 신축 현장');
    await expect(canvas.getByLabelText('주소')).toHaveValue('서울특별시 중구 세종대로 110');
    await expect(canvas.getByLabelText('현장 연락처')).toHaveValue('02-0000-0101');
    await expect(canvas.getByLabelText('출입·주의 메모')).toHaveValue(
      '정문 출입증 필요, 작업 시간 08~18시, 주차는 지하 2층',
    );
    await expect(canvas.getByLabelText('고객')).toHaveDisplayValue('가나다건설');
    await expect(canvas.getByLabelText('담당자')).toHaveDisplayValue('송소장 (소장)');
    await expect(canvas.getByLabelText('판금')).toBeChecked();
    await expect(canvas.getByLabelText('설비')).not.toBeChecked();
    await expect(canvas.getByLabelText('계약일')).toHaveValue('2026-06-20');
    await expect(canvas.getByLabelText('시작 예정일')).toHaveValue('2026-07-15');
    await expect(canvas.getByLabelText('종료 예정일')).toHaveValue('2026-11-30');
    await expect(canvas.getByRole('link', { name: '지도 열기' })).toHaveAttribute(
      'href',
      'https://map.example.com/a-dong',
    );
    await expect(canvas.getByRole('button', { name: '저장' })).toBeDisabled();
  },
};

export const EditAndSave: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByLabelText('프로젝트명');

    await userEvent.clear(name);
    await userEvent.type(name, 'A동 외장 판금 공사 (변경)');
    await userEvent.click(canvas.getByLabelText('설비'));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(canvas.getByLabelText('프로젝트명')).toHaveValue('A동 외장 판금 공사 (변경)');
    await expect(canvas.getByLabelText('설비')).toBeChecked();
    // 코드는 그대로
    await expect(canvas.getByText('2026-001')).toBeInTheDocument();
  },
};

export const ClearOptionalFields: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.clear(await canvas.findByLabelText('주소'));
    await userEvent.clear(canvas.getByLabelText('현장 연락처'));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(canvas.getByLabelText('주소')).toHaveValue('');
  },
};

export const EndBeforeStart: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const end = await canvas.findByLabelText('종료 예정일');

    await userEvent.clear(end);
    await userEvent.type(end, '2026-07-01');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(
      await canvas.findByText('종료 예정일은 시작 예정일보다 빠를 수 없습니다'),
    ).toBeInTheDocument();
  },
};

export const InvalidPhone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const phone = await canvas.findByLabelText('현장 연락처');

    await userEvent.clear(phone);
    await userEvent.type(phone, '전화');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/숫자와 - \( \) \+ 만 입력/)).toBeInTheDocument();
  },
};

// 이미 숨긴 고객(옛날상가)이 연결된 프로젝트는 카드에서 계속 보이지만, 다른 프로젝트에서는 새로 고를 수 없음
export const HiddenClientStillShown: Story = {
  parameters: { router: routerFor('옛날상가 간판 교체') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByLabelText('고객')).toHaveDisplayValue('옛날상가 (숨김)');
    await expect(canvas.getByText('완료')).toBeInTheDocument();
  },
};

export const MultipleTradesShown: Story = {
  parameters: { router: routerFor('B동 덕트 설치') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByLabelText('판금')).toBeChecked();
    await expect(canvas.getByLabelText('설비')).toBeChecked();
    await expect(canvas.getByText('중단')).toBeInTheDocument();
  },
};

export const NotFound: Story = {
  parameters: {
    router: {
      initialEntries: ['/projects/0198d000-0000-7000-8000-000000000999'],
      path: '/projects/:id',
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: '프로젝트를 찾을 수 없습니다' }),
    ).toBeInTheDocument();
  },
};
