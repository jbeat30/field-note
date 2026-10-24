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

// 표의 번호 칸으로 해당 줄 탐색
const rowOf = (canvas: ReturnType<typeof within>, seq: number) =>
  canvas.getByRole('cell', { name: `#${seq}`, hidden: true }).closest('tr') as HTMLElement;

// 표에서 번호를 눌러 상세 창 열기
const openDetail = async (canvas: ReturnType<typeof within>, seq: number) => {
  await userEvent.click(await canvas.findByRole('button', { name: `#${seq} 자세히 보기` }));

  return within(await within(document.body).findByRole('dialog'));
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/옥상 배수구 주변 방수 판금/)).toBeInTheDocument();
    // 번호가 큰 것이 먼저, 협의 중으로 오래 남은 건은 경과일 표시
    const table = within(canvas.getByRole('table', { name: '추가 공사 목록' }));
    const rows = table.getAllByRole('row').slice(1);

    await expect(rows[0]).toHaveTextContent('#2');
    await expect(rows[0]).toHaveTextContent('협의 중');
    await expect(rows[0]).toHaveTextContent(/\d+일째 협의 중/);
    await expect(rows[1]).toHaveTextContent('#1');
    await expect(rows[1]).toHaveTextContent('합의됨');
    // 기록 폼은 평소에는 숨김, 변경·추가 작업으로 쓴 공수·자재 합계 구역 존재
    await expect(
      canvas.queryByRole('form', { name: '변경·추가 작업 기록' }),
    ).not.toBeInTheDocument();
    await expect(
      await canvas.findByRole('heading', { name: '변경·추가 작업으로 쓴 공수·자재' }),
    ).toBeInTheDocument();
  },
};

export const CreateWithValidation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/옥상 배수구 주변 방수 판금/);
    await userEvent.click(canvas.getByRole('button', { name: '추가 공사 기록' }));

    const form = within(
      await within(document.body).findByRole('form', { name: '변경·추가 작업 기록' }),
    );

    // 요청자·내용이 비어 있으면 서버 전송 전에 차단
    await userEvent.click(form.getByRole('button', { name: '저장' }));
    await expect(await form.findByText('요청자를 입력해 주세요')).toBeInTheDocument();
    await expect(form.getByText('내용을 입력해 주세요')).toBeInTheDocument();

    await userEvent.type(form.getByLabelText('요청자'), '고객사 박과장');
    await userEvent.type(form.getByLabelText('요청 내용'), '2층 복도 천장 점검구 추가');
    await userEvent.click(form.getByRole('button', { name: '저장' }));

    // 저장하면 창이 닫히고 표에 새 번호 추가
    await expect(await canvas.findByText('#3 기록했습니다 (협의 중)')).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByRole('cell', { name: '#3' })).toBeInTheDocument());
    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
};

export const WithdrawNeedsReason: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/옥상 배수구 주변 방수 판금/);

    const dialog = await openDetail(canvas, 2);

    await userEvent.click(await dialog.findByRole('button', { name: '철회' }));

    const form = within(await dialog.findByRole('form', { name: '철회 확인' }));

    // 사유 없이는 철회 불가
    await userEvent.click(form.getByRole('button', { name: '확인' }));
    await expect(await form.findByText('철회 사유를 입력해 주세요')).toBeInTheDocument();

    await userEvent.type(form.getByLabelText('사유 (필수)'), '고객이 요청을 취소함');
    await userEvent.click(form.getByRole('button', { name: '확인' }));

    await expect(await dialog.findByText("'철회' 상태로 바꿨습니다")).toBeInTheDocument();
    // 이력에 기록
    await expect(await dialog.findByText(/고객이 요청을 취소함/)).toBeInTheDocument();
  },
};

export const AgreedIsLocked: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/외벽 코너 판금 두께 변경/);

    const dialog = await openDetail(canvas, 1);

    // 합의된 기록은 내용 수정 불가, 상태만 변경 가능하며 이력 보존
    await expect(await dialog.findByText(/현장에서 구두 합의/)).toBeInTheDocument();
    await expect(dialog.queryByRole('button', { name: '내용 수정' })).not.toBeInTheDocument();
    await expect(dialog.getByRole('button', { name: '다시 협의 중으로' })).toBeInTheDocument();
  },
};

// 문서함에 있는 문서를 연결하고 해제할 때는 확인 창 경유
export const LinkEvidence: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/옥상 배수구 주변 방수 판금/);

    const dialog = await openDetail(canvas, 2);

    await expect(
      await dialog.findByText('대화 캡처·합의서·공문 사진이나 PDF를 올려 두세요'),
    ).toBeInTheDocument();
    await chooseOption(dialog.getByLabelText('문서함에서 연결'), '1층 시공도');
    await userEvent.click(dialog.getByRole('button', { name: '연결' }));

    await expect(
      await dialog.findByRole('button', { name: '1층 시공도 연결 해제' }),
    ).toBeInTheDocument();
    // 표의 증빙 수도 바뀜 (마지막 칸)
    await waitFor(() => expect(rowOf(canvas, 2)).toHaveTextContent(/1$/));

    await userEvent.click(dialog.getByRole('button', { name: '1층 시공도 연결 해제' }));
    await userEvent.click(await within(document.body).findByRole('button', { name: '연결 풀기' }));
    await expect(
      await dialog.findByText('대화 캡처·합의서·공문 사진이나 PDF를 올려 두세요'),
    ).toBeInTheDocument();
  },
};

// 증빙 올리기: 파일을 고르면 문서함에 계약·공문 문서로 생성되어 이 추가 공사에 바로 연결
export const UploadEvidence: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/옥상 배수구 주변 방수 판금/);

    const dialog = await openDetail(canvas, 2);

    await userEvent.upload(
      await dialog.findByLabelText('증빙 파일'),
      new File(['%PDF-1.7'], '고객 합의 공문.pdf', { type: 'application/pdf' }),
    );

    const item = await dialog.findByRole('button', { name: '고객 합의 공문 열기' });

    await expect(item).toBeInTheDocument();
    // 계약·공문 분류의 민감 자료로 생성
    await expect(item).toHaveTextContent('계약·공문, 민감');
    await waitFor(() => expect(rowOf(canvas, 2)).toHaveTextContent(/[1-9]$/));
  },
};
