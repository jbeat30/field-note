import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { ProjectChangeWorksPage } from './ProjectChangeWorksPage';
import { chooseOption } from '../lib/storyActions';

const meta = {
  title: 'Pages/변경·추가 작업',
  component: ProjectChangeWorksPage,
  parameters: {
    router: {
      initialEntries: [
        `/projects/${DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id}/change-works`,
      ],
      path: '/projects/:id/change-works',
    },
  },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectChangeWorksPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const itemOf = (canvas: ReturnType<typeof within>, seq: number) =>
  canvas.getByText(`#${seq}`).closest('li') as HTMLElement;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/옥상 배수구 주변 방수 판금/)).toBeInTheDocument();
    // 번호 큰 것이 먼저, 협의 중으로 오래 남은 건은 경과일을 알려 준다
    const items = canvas.getAllByRole('listitem').filter((item) => item.textContent?.includes('#'));

    await expect(items[0]).toHaveTextContent('#2');
    await expect(items[0]).toHaveTextContent('협의 중');
    await expect(items[0]).toHaveTextContent(/\d+일째 협의 중/);
    await expect(items[1]).toHaveTextContent('#1');
    await expect(items[1]).toHaveTextContent('합의됨');
    // 변경·추가 작업으로 쓴 공수·자재 합계 구역
    await expect(
      await canvas.findByRole('heading', { name: '변경·추가 작업으로 쓴 공수·자재' }),
    ).toBeInTheDocument();
  },
};

export const CreateWithValidation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = within(await canvas.findByRole('form', { name: '변경·추가 작업 기록' }));

    // 요청자·내용이 비어 있으면 서버에 보내기 전에 막는다
    await userEvent.click(form.getByRole('button', { name: '기록하기' }));
    await expect(await form.findByText('요청자를 입력해 주세요')).toBeInTheDocument();
    await expect(form.getByText('내용을 입력해 주세요')).toBeInTheDocument();

    await userEvent.type(form.getByLabelText('요청자'), '고객사 박과장');
    await userEvent.type(form.getByLabelText('요청 내용'), '2층 복도 천장 점검구 추가');
    await userEvent.click(form.getByRole('button', { name: '기록하기' }));

    await expect(await canvas.findByText('#3 기록했습니다 (협의 중)')).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByText('#3')).toBeInTheDocument());
    await expect(form.getByLabelText('요청자')).toHaveValue('');
  },
};

export const WithdrawNeedsReason: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/옥상 배수구 주변 방수 판금/);
    await userEvent.click(canvas.getByRole('button', { name: '#2 자세히 보기' }));

    const status = within(
      await canvas
        .findByRole('button', { name: '철회' })
        .then((button) => button.closest('li') as HTMLElement),
    );

    await userEvent.click(status.getByRole('button', { name: '철회' }));

    const form = within(await canvas.findByRole('form', { name: '철회 확인' }));

    // 사유 없이는 철회할 수 없다
    await userEvent.click(form.getByRole('button', { name: '확인' }));
    await expect(await form.findByText('철회 사유를 입력해 주세요')).toBeInTheDocument();

    await userEvent.type(form.getByLabelText('사유 (필수)'), '고객이 요청을 취소함');
    await userEvent.click(form.getByRole('button', { name: '확인' }));

    await expect(await canvas.findByText("'철회' 상태로 바꿨습니다")).toBeInTheDocument();
    // 이력에 남는다
    await expect(await canvas.findByText(/고객이 요청을 취소함/)).toBeInTheDocument();
  },
};

export const AgreedIsLocked: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/외벽 코너 판금 두께 변경/);
    await userEvent.click(canvas.getByRole('button', { name: '#1 자세히 보기' }));

    const item = within(itemOf(canvas, 1));

    // 합의된 기록은 내용을 고칠 수 없고 상태만 바꿀 수 있으며 이력이 남아 있다
    await expect(await item.findByText(/현장에서 구두 합의/)).toBeInTheDocument();
    await expect(item.queryByRole('button', { name: '내용 수정' })).not.toBeInTheDocument();
    await expect(item.getByRole('button', { name: '다시 협의 중으로' })).toBeInTheDocument();
  },
};

export const LinkEvidence: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/옥상 배수구 주변 방수 판금/);
    await userEvent.click(canvas.getByRole('button', { name: '#2 자세히 보기' }));

    const item = within(itemOf(canvas, 2));

    await expect(await item.findByText('연결한 증빙이 없습니다')).toBeInTheDocument();
    await chooseOption(item.getByLabelText('문서함에서 연결'), '1층 시공도');
    await userEvent.click(item.getByRole('button', { name: '연결' }));

    await expect(
      await item.findByRole('button', { name: '1층 시공도 연결 해제' }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText('증빙 1건').length).toBeGreaterThan(0);

    await userEvent.click(item.getByRole('button', { name: '1층 시공도 연결 해제' }));
    await expect(await item.findByText('연결한 증빙이 없습니다')).toBeInTheDocument();
  },
};
