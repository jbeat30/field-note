import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { DocumentUploadForm } from './DocumentUploadForm';
import { DocumentUploadError } from './uploadDocument';

const meta = {
  title: 'Documents/문서 올리기',
  component: DocumentUploadForm,
  args: { mode: 'create', onSubmit: fn(async () => undefined) },
} satisfies Meta<typeof DocumentUploadForm>;

export default meta;

type Story = StoryObj<typeof meta>;

const pdf = (name = '1층 시공도.pdf') => new File(['%PDF-1.7'], name, { type: 'application/pdf' });

export const CreateWithSuggestedTitle: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const file = pdf();

    await userEvent.upload(canvas.getByLabelText('문서 파일'), file);
    // 이름 칸이 비어 있으면 파일 이름으로 채워짐
    await expect(canvas.getByLabelText('문서 이름')).toHaveValue('1층 시공도');

    await userEvent.selectOptions(canvas.getByLabelText('분류'), '도면');
    await userEvent.click(canvas.getByRole('button', { name: '문서 올리기' }));

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          file,
          title: '1층 시공도',
          category: 'DRAWING',
          isSensitive: undefined,
        }),
        expect.any(Function),
      ),
    );
  },
};

// 계약·행정을 고르면 민감 자료가 자동으로 켜지고, 직접 바꾸면 그 값을 보냄
export const ContractIsSensitiveByDefault: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByLabelText(/민감 자료/);

    await expect(checkbox).not.toBeChecked();
    await userEvent.selectOptions(canvas.getByLabelText('분류'), '계약·행정');
    await expect(checkbox).toBeChecked();

    await userEvent.click(checkbox);
    await expect(checkbox).not.toBeChecked();

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf('계약서.pdf'));
    await userEvent.click(canvas.getByRole('button', { name: '문서 올리기' }));

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'CONTRACT', isSensitive: false }),
        expect.any(Function),
      ),
    );
  },
};

// 파일을 바꾸면 이름 제안도 따라 바뀌지만, 이름을 직접 고친 뒤에는 바꾸지 않음
export const SuggestionFollowsFileUntilEdited: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('문서 파일');

    await userEvent.upload(input, pdf('첫 파일.pdf'));
    await expect(canvas.getByLabelText('문서 이름')).toHaveValue('첫 파일');
    await userEvent.upload(input, pdf('둘째 파일.pdf'));
    await expect(canvas.getByLabelText('문서 이름')).toHaveValue('둘째 파일');

    await userEvent.type(canvas.getByLabelText('문서 이름'), ' 최종');
    await userEvent.upload(input, pdf('셋째 파일.pdf'));
    await expect(canvas.getByLabelText('문서 이름')).toHaveValue('둘째 파일 최종');
  },
};

export const NoFileOrTitleIsRejected: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '문서 올리기' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('올릴 파일을 골라 주세요');

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf());
    await userEvent.clear(canvas.getByLabelText('문서 이름'));
    await userEvent.click(canvas.getByRole('button', { name: '문서 올리기' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('문서 이름을 입력해 주세요');
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

// 올리는 동안 진행률을 보여 주고 입력을 막음
export const ShowsProgress: Story = {
  args: {
    onSubmit: fn(async (_values: unknown, onProgress: (ratio: number) => void) => {
      onProgress(0.4);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf());
    await userEvent.click(canvas.getByRole('button', { name: '문서 올리기' }));

    await expect(await canvas.findByText('올리는 중 40%')).toBeInTheDocument();
    await expect(canvas.getByLabelText('문서 이름')).toBeDisabled();
    await waitFor(() => expect(canvas.queryByText(/올리는 중 \d+%/)).not.toBeInTheDocument());
  },
};

export const UploadFailsKeepsInput: Story = {
  args: {
    onSubmit: fn(async () => {
      throw new DocumentUploadError('연결이 끊겼습니다. 연결을 확인하고 다시 시도해 주세요');
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf());
    await userEvent.click(canvas.getByRole('button', { name: '문서 올리기' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent('연결이 끊겼습니다');
    // 다시 시도할 수 있게 이름은 그대로
    await expect(canvas.getByLabelText('문서 이름')).toHaveValue('1층 시공도');
  },
};

// 새 버전 모드: 이름·분류 없이 파일·개정일·사유만
export const VersionMode: Story = {
  args: { mode: 'version' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByLabelText('문서 이름')).not.toBeInTheDocument();
    await userEvent.upload(canvas.getByLabelText('새 버전 파일'), pdf('시공도_rev3.pdf'));
    await userEvent.type(canvas.getByLabelText('개정 사유'), '창호 위치 변경');
    await userEvent.click(canvas.getByRole('button', { name: '새 버전 올리기' }));

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ reason: '창호 위치 변경' }),
        expect.any(Function),
      ),
    );
  },
};
