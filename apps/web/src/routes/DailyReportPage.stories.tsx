import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { DailyReportPage } from './DailyReportPage';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const routerFor = (date: string) => ({
  initialEntries: [`/projects/${projectId}/daily-report?date=${date}`],
  path: '/projects/:id/daily-report',
});

const meta = {
  title: 'Pages/작업일보 출력',
  component: DailyReportPage,
  parameters: { router: routerFor('2026-09-02') },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof DailyReportPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithWorkLog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('heading', { name: '작업일보', level: 1 }),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/외장 패널 설치/)).toBeInTheDocument();
    await expect(canvas.getByText(/합계 \(\d+명\)/)).toBeInTheDocument();
  },
};

// 일지는 없고 자재·사진만 있는 날
export const MaterialsAndPhotosDay: Story = {
  parameters: { router: routerFor('2026-10-07') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('이 날 작성한 일지가 없습니다')).toBeInTheDocument();
    // 그날 사용 기록 두 건과 반입·반출 등이 표에 나옴
    await expect(
      canvas.getAllByText('아연도강판 1.0T', { selector: 'td' }).length,
    ).toBeGreaterThanOrEqual(2);
    await expect(canvas.getAllByRole('img').length).toBeGreaterThan(0);
  },
};

export const ChangeDate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('heading', { name: '작업일보', level: 1 });
    await userEvent.click(canvas.getByRole('button', { name: '다음 날' }));

    await expect(await canvas.findByText(/2026-09-03/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '전날' }));
    await expect(await canvas.findByText(/2026-09-02/)).toBeInTheDocument();
  },
};

// 인쇄 단추는 보고서가 불러와진 뒤에만 켜지고, 누르면 인쇄 창을 연다
export const PrintButton: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const print = fn();

    window.print = print;

    const button = await canvas.findByRole('button', { name: '인쇄·PDF로 저장' });

    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    await waitFor(() => expect(print).toHaveBeenCalled());
  },
};

// 엑셀은 한 번 더 확인한 뒤에만 내려받고, 취소하면 요청하지 않음
export const ExportNeedsConfirm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('heading', { name: '작업일보', level: 1 });
    await userEvent.click(canvas.getByText('엑셀로 내보내기'));
    await userEvent.click(canvas.getByRole('button', { name: '엑셀 내려받기' }));

    const dialog = within(await within(document.body).findByRole('dialog'));

    await expect(dialog.getByText(/내보낸 사람과 기간은 기록으로 남습니다/)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(canvas.queryByText(/파일을 내려받았습니다/)).not.toBeInTheDocument();
  },
};

export const ExportDownloads: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 실제 파일 저장 창을 열지 않도록 주소 만들기를 가로챔
    URL.createObjectURL = fn(() => 'blob:mock');
    URL.revokeObjectURL = fn();
    HTMLAnchorElement.prototype.click = fn();

    await canvas.findByRole('heading', { name: '작업일보', level: 1 });
    await userEvent.click(canvas.getByText('엑셀로 내보내기'));
    await userEvent.click(canvas.getByRole('button', { name: '엑셀 내려받기' }));
    await userEvent.click(
      await within(document.body).findByRole('button', { name: '기록을 남기고 내려받기' }),
    );

    await expect(
      await canvas.findByText(
        /작업일보_2026-001_2026-09-01_2026-09-02\.xlsx 파일을 내려받았습니다/,
      ),
    ).toBeInTheDocument();
  },
};

export const ExportRejectsBadRange: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('heading', { name: '작업일보', level: 1 });
    await userEvent.click(canvas.getByText('엑셀로 내보내기'));
    // 93일을 넘는 기간
    await userEvent.clear(canvas.getByLabelText('시작일'));
    await userEvent.type(canvas.getByLabelText('시작일'), '2025-01-01');
    await userEvent.click(canvas.getByRole('button', { name: '엑셀 내려받기' }));
    await userEvent.click(
      await within(document.body).findByRole('button', { name: '기록을 남기고 내려받기' }),
    );

    // 확인 창은 닫히고 오류가 화면에 보임
    await expect(await canvas.findByRole('alert')).toHaveTextContent('93일');
    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
};
