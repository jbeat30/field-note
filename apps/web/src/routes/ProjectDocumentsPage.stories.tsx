import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { seedDocumentId } from '../mocks/documentHandlers';
import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { ProjectDocumentsPage } from './ProjectDocumentsPage';
import { chooseOption } from '../lib/storyActions';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const meta = {
  title: 'Pages/프로젝트 문서함',
  component: ProjectDocumentsPage,
  parameters: {
    router: {
      initialEntries: [`/projects/${projectId}/documents`],
      path: '/projects/:id/documents',
    },
  },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectDocumentsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 새 창으로 열기를 가로채 주소를 확인 (실제 새 창을 열지 않음)
const stubWindowOpen = () => {
  const popup = { location: { href: '' }, close: fn(), opener: {} };

  window.open = fn(() => popup as unknown as Window);

  return popup;
};

// 행 오른쪽 더보기 메뉴에서 항목 선택
const pickRowMenu = async (canvas: ReturnType<typeof within>, title: string, item: string) => {
  await userEvent.click(await canvas.findByRole('button', { name: `${title} 더보기` }));
  await userEvent.click(await within(document.body).findByRole('menuitem', { name: item }));
};

// 맨 위 `문서 올리기` 버튼으로 올리기 창 열기
const openUpload = async (canvas: ReturnType<typeof within>) => {
  await userEvent.click(await canvas.findByRole('button', { name: '문서 올리기' }));

  return within(await within(document.body).findByRole('dialog', { name: '문서 올리기' }));
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('1층 시공도')).toBeInTheDocument();
    const headings = canvas
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);

    // 올리기 폼은 창으로 빼서 평소에는 보이지 않음
    await expect(headings).toEqual(['문서함']);
    await expect(canvas.queryByLabelText('문서 파일')).not.toBeInTheDocument();
    await expect(canvas.getByText('민감')).toBeInTheDocument();
    // 분류 폴더 카드마다 문서 수가 보임
    await expect(canvas.getByRole('button', { name: /^전체 3/ })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /^계약·공문 1/ })).toBeInTheDocument();
  },
};

export const FilterAndSearch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('1층 시공도');
    await userEvent.click(canvas.getByRole('button', { name: /^계약·공문/ }));
    await waitFor(() => expect(canvas.queryByText('외장 판금 시방서')).not.toBeInTheDocument());
    await expect(await canvas.findByText('도급 계약서')).toBeInTheDocument();

    // 같은 카드를 다시 누르면 전체
    await userEvent.click(canvas.getByRole('button', { name: /^계약·공문/ }));
    await expect(await canvas.findByText('외장 판금 시방서')).toBeInTheDocument();
    await userEvent.type(canvas.getByLabelText('문서 이름 검색'), '시방');
    await waitFor(() => expect(canvas.queryByText('도급 계약서')).not.toBeInTheDocument());
    await expect(await canvas.findByText('외장 판금 시방서')).toBeInTheDocument();

    await userEvent.clear(canvas.getByLabelText('문서 이름 검색'));
    await userEvent.type(canvas.getByLabelText('문서 이름 검색'), '없는이름');
    await expect(await canvas.findByText('조건에 맞는 문서가 없습니다')).toBeInTheDocument();
  },
};

// 일반 자료는 바로 새 창으로 열림
export const OpenPlainDocument: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const popup = stubWindowOpen();

    await userEvent.click(await canvas.findByRole('button', { name: '외장 판금 시방서 열기' }));

    await waitFor(() => expect(popup.location.href).toContain('/mock-storage/document/'));
    await expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument();
  },
};

// 민감 자료는 기록이 남는다는 확인을 먼저 받고, 취소하면 열지 않음
export const SensitiveNeedsConfirm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const popup = stubWindowOpen();

    await userEvent.click(await canvas.findByRole('button', { name: '도급 계약서 열기' }));

    const dialog = within(await within(document.body).findByRole('dialog'));

    await expect(dialog.getByText(/기록이 남습니다/)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: '취소' }));

    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(window.open).not.toHaveBeenCalled();
    await expect(popup.location.href).toBe('');
  },
};

// 확인하면 열람 기록이 남고 버전·기록의 열람 기록에서 확인됨
export const SensitiveOpenIsLogged: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const popup = stubWindowOpen();

    await userEvent.click(await canvas.findByRole('button', { name: '도급 계약서 열기' }));
    await userEvent.click(
      await within(await within(document.body).findByRole('dialog')).findByRole('button', {
        name: '기록을 남기고 열기',
      }),
    );
    await waitFor(() => expect(popup.location.href).toContain('/mock-storage/document/'));

    await pickRowMenu(canvas, '도급 계약서', '새 판 올리기·버전 기록');

    const dialog = within(await within(document.body).findByRole('dialog'));

    await expect(await dialog.findByText(/김한빛 · v1 열람/)).toBeInTheDocument();
  },
};

export const UploadNewDocument: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('1층 시공도');

    const dialog = await openUpload(canvas);

    await userEvent.upload(
      dialog.getByLabelText('문서 파일'),
      new File(['%PDF-1.7'], '안전점검표.pdf', { type: 'application/pdf' }),
    );
    await dialog.findByText(/올려 두었습니다/);
    await chooseOption(dialog.getByLabelText('분류'), '안전·검사');
    await userEvent.click(dialog.getByRole('button', { name: '저장' }));

    // 올리면 창이 닫히고 목록에 보임
    await expect(
      await canvas.findByRole('button', { name: '안전점검표 열기' }),
    ).toBeInTheDocument();
    await expect(
      within(canvas.getByRole('table', { name: '문서 목록' })).getByText('안전·검사'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
};

// 같은 이름의 문서를 올리면 새 판으로 올릴지 확인하고, 확인하면 그 문서의 판 증가
export const SameNameOffersNewVersion: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('1층 시공도');

    const dialog = await openUpload(canvas);

    await userEvent.upload(
      dialog.getByLabelText('문서 파일'),
      new File(['%PDF-1.7'], '도급 계약서.pdf', { type: 'application/pdf' }),
    );
    await dialog.findByText(/올려 두었습니다/);
    await userEvent.click(dialog.getByRole('button', { name: '저장' }));

    const confirmDialog = within(await within(document.body).findByRole('alertdialog'));

    await expect(confirmDialog.getByText(/v2판으로 올릴까요/)).toBeInTheDocument();
    await userEvent.click(confirmDialog.getByRole('button', { name: '새 판으로 올리기' }));

    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(),
    );
    // 새 문서가 생기지 않고 같은 문서의 판 수가 2가 됨
    const row = within(await canvas.findByRole('row', { name: /도급 계약서/ }));

    await expect(row.getByText('v2')).toBeInTheDocument();
    await expect(canvas.getAllByRole('row', { name: /도급 계약서/ })).toHaveLength(1);
  },
};

// 올려 둔 파일이 있는 채로 폼을 닫으려 하면 확인을 받고, 그만두면 파일이 지워져 다시 열어도 비어 있음
export const CloseDiscardsStagedFile: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('1층 시공도');

    const dialog = await openUpload(canvas);

    await userEvent.upload(
      dialog.getByLabelText('문서 파일'),
      new File(['%PDF-1.7'], '임시.pdf', { type: 'application/pdf' }),
    );
    await dialog.findByText(/올려 두었습니다/);

    // 계속 작성하면 폼과 올린 파일이 그대로
    await userEvent.click(dialog.getByRole('button', { name: '닫기' }));

    const confirmDialog = within(await within(document.body).findByRole('alertdialog'));

    await userEvent.click(confirmDialog.getByRole('button', { name: '계속 작성' }));
    await expect(dialog.getByText('임시.pdf')).toBeInTheDocument();

    // 그만두면 폼이 닫히고, 다시 열면 올린 파일이 없음
    await userEvent.click(dialog.getByRole('button', { name: '닫기' }));
    await userEvent.click(
      within(await within(document.body).findByRole('alertdialog')).getByRole('button', {
        name: '그만두고 파일 삭제',
      }),
    );
    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(),
    );

    const reopened = await openUpload(canvas);

    await expect(reopened.queryByText('임시.pdf')).not.toBeInTheDocument();
    await expect(reopened.getByRole('button', { name: '파일 고르기' })).toBeInTheDocument();
  },
};

export const UnsupportedFileIsRejected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('1층 시공도');

    const dialog = await openUpload(canvas);

    // accept를 거치지 않고 올려도(드래그 등) 형식을 걸러 냄
    await userEvent.upload(dialog.getByLabelText('문서 파일'), new File(['MZ'], '설치.exe'), {
      applyAccept: false,
    });

    await expect(await dialog.findByRole('alert')).toHaveTextContent('올릴 수 없는 파일 형식');
  },
};

// 준공 요약에는 안전·검사, 계약·공문 분류의 민감하지 않은 문서만 포함 가능
export const SummaryCheckboxNeedsEligibleDocument: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await pickRowMenu(canvas, '외장 판금 시방서', '새 판 올리기·버전 기록');

    const dialog = within(await within(document.body).findByRole('dialog'));

    // 도면·작업지시서 분류라 포함 불가
    await expect(await dialog.findByRole('checkbox', { name: /준공 요약에 넣기/ })).toBeDisabled();
  },
};

export const DetailAddVersionAndDelete: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await pickRowMenu(canvas, '외장 판금 시방서', '새 판 올리기·버전 기록');

    const dialog = within(await within(document.body).findByRole('dialog'));

    await expect(await dialog.findByText('버전 (1개)')).toBeInTheDocument();
    await userEvent.upload(
      dialog.getByLabelText('새 버전 파일'),
      new File(['%PDF-1.7'], '시방서_rev2.pdf', { type: 'application/pdf' }),
    );
    await dialog.findByText(/올려 두었습니다/);
    await userEvent.type(dialog.getByLabelText('개정 사유'), '마감 색상 변경');
    await userEvent.click(
      within(dialog.getByLabelText('새 버전 파일').closest('form')!).getByRole('button', {
        name: '저장',
      }),
    );

    // 최신본이 바뀌고 이전본이 남음
    await expect(await dialog.findByText('버전 (2개)')).toBeInTheDocument();
    await expect(dialog.getByText(/마감 색상 변경/)).toBeInTheDocument();
    await expect(dialog.getByRole('button', { name: 'v1 열기' })).toBeInTheDocument();
    await expect(dialog.getByRole('button', { name: 'v2 열기' })).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('button', { name: '문서 삭제' }));
    await userEvent.click(dialog.getByRole('button', { name: /정말 삭제/ }));

    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(canvas.queryByText('외장 판금 시방서')).not.toBeInTheDocument());
  },
};

// 검색 결과에서 진입하면(?doc=) 그 문서의 버전·기록이 바로 열리고 닫으면 주소에서 doc 제거
export const OpensDetailFromSearchLink: Story = {
  parameters: {
    router: {
      initialEntries: [`/projects/${projectId}/documents?doc=${seedDocumentId(projectId, 1)}`],
      path: '/projects/:id/documents',
    },
  },
  play: async ({ canvasElement }) => {
    const dialog = within(await within(document.body).findByRole('dialog'));

    await expect(await dialog.findByText('도급 계약서', { selector: 'h2' })).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: '닫기' }));
    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(
      within(canvasElement).getByRole('button', { name: '도급 계약서 더보기' }),
    ).toBeInTheDocument();
  },
};
