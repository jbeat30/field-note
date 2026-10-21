import { FILE_STAGED_TTL_SECONDS } from '@field-note/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { chooseOption } from '../lib/storyActions';
import type { StagedFile } from '../staging/stagedFiles';
import { useStagedFiles } from '../staging/useStagedFiles';

import { DocumentUploadForm, type DocumentUploadFormProps } from './DocumentUploadForm';
import { DocumentUploadError } from './uploadDocument';

// 스토리 공통: 파일 올리기는 서버 대신 가짜로 처리하고(업로드 시각만 바꿔 만료를 흉내), 지우기 호출은 기록만 남김
type StoryArgs = Omit<DocumentUploadFormProps, 'staged' | 'projectId'> & {
  // 올린 파일의 업로드 시각 (기본은 지금, 만료 상황은 과거 시각으로)
  uploadedAt?: () => string;
  discard: (fileId: string) => Promise<unknown>;
};

const fakeStage =
  (uploadedAt: () => string = () => new Date().toISOString()) =>
  async (file: File, onProgress: (ratio: number) => void): Promise<StagedFile> => {
    onProgress(1);

    return {
      fileId: `file-${file.name}`,
      name: file.name,
      size: file.size,
      uploadedAt: uploadedAt(),
    };
  };

const StoryForm = ({ uploadedAt, discard, stage, ...rest }: StoryArgs) => {
  // 이전 스토리에서 기기에 남은 초안을 이어받지 않도록 렌더마다 다른 구분자를 씀
  const [scope] = useState(() => `story:${crypto.randomUUID()}`);
  const staged = useStagedFiles({ scope, discard });

  return (
    <DocumentUploadForm
      {...rest}
      projectId="project-1"
      staged={staged}
      stage={stage ?? fakeStage(uploadedAt)}
    />
  );
};

const meta = {
  title: 'Documents/문서 올리기',
  component: StoryForm,
  args: {
    mode: 'create',
    onSubmit: fn(async () => undefined),
    discard: fn(async () => undefined),
  },
} satisfies Meta<typeof StoryForm>;

export default meta;

type Story = StoryObj<typeof meta>;

const pdf = (name = '1층 시공도.pdf') => new File(['%PDF-1.7'], name, { type: 'application/pdf' });
const ago = (seconds: number) => () => new Date(Date.now() - seconds * 1000).toISOString();

// 파일을 고르면 바로 올려 임시 보관하고, 저장하면 올려 둔 파일 ID로 등록
export const CreateWithSuggestedTitle: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf());
    // 이름 칸이 비어 있으면 파일 이름으로 채워짐
    await expect(canvas.getByLabelText('문서 이름')).toHaveValue('1층 시공도');
    await expect(await canvas.findByText(/올려 두었습니다/)).toBeInTheDocument();

    await chooseOption(canvas.getByLabelText('분류'), '도면');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          file: expect.objectContaining({ fileId: 'file-1층 시공도.pdf' }),
          title: '1층 시공도',
          category: 'DRAWING',
          isSensitive: undefined,
        }),
      ),
    );
  },
};

// 계약·공문을 고르면 민감 자료가 자동으로 켜지고, 직접 바꾸면 그 값을 보냄
export const ContractIsSensitiveByDefault: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByLabelText(/민감 자료/);

    await expect(checkbox).not.toBeChecked();
    await chooseOption(canvas.getByLabelText('분류'), '계약·공문');
    await expect(checkbox).toBeChecked();

    await userEvent.click(checkbox);
    await expect(checkbox).not.toBeChecked();

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf('계약서.pdf'));
    await canvas.findByText(/올려 두었습니다/);
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'CONTRACT', isSensitive: false }),
      ),
    );
  },
};

// 파일을 바꾸면 이전 파일은 서버에서 지우고, 이름 제안도 따라 바뀌지만 직접 고친 뒤에는 바꾸지 않음
export const ReplacingFileDiscardsPrevious: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('문서 파일');

    await userEvent.upload(input, pdf('첫 파일.pdf'));
    await expect(await canvas.findByText(/올려 두었습니다/)).toBeInTheDocument();
    await expect(canvas.getByLabelText('문서 이름')).toHaveValue('첫 파일');

    await userEvent.upload(input, pdf('둘째 파일.pdf'));
    await waitFor(() => expect(args.discard).toHaveBeenCalledWith('file-첫 파일.pdf'));
    await waitFor(() => expect(canvas.getByLabelText('문서 이름')).toHaveValue('둘째 파일'));

    await userEvent.type(canvas.getByLabelText('문서 이름'), ' 최종');
    await userEvent.upload(input, pdf('셋째 파일.pdf'));
    await waitFor(() => expect(canvas.getByText('셋째 파일.pdf')).toBeInTheDocument());
    await expect(canvas.getByLabelText('문서 이름')).toHaveValue('둘째 파일 최종');
  },
};

// 올린 파일 지우기: 목록에서 빠지고 서버 임시 파일도 지움
export const RemoveStagedFile: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf());
    await userEvent.click(await canvas.findByRole('button', { name: '올린 파일 지우기' }));

    await waitFor(() => expect(args.discard).toHaveBeenCalledWith('file-1층 시공도.pdf'));
    await expect(canvas.queryByText('1층 시공도.pdf')).not.toBeInTheDocument();
  },
};

export const NoFileOrTitleIsRejected: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '저장' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('올릴 파일을 골라 주세요');

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf());
    await canvas.findByText(/올려 두었습니다/);
    await userEvent.clear(canvas.getByLabelText('문서 이름'));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('문서 이름을 입력해 주세요');
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

// 올리는 동안 진행률을 보여 주고 입력을 막음
export const ShowsUploadProgress: Story = {
  args: {
    stage: async (file, onProgress) => {
      onProgress(0.4);
      await new Promise((resolve) => setTimeout(resolve, 600));

      return {
        fileId: 'file-1',
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf());

    await expect(await canvas.findByText('파일 올리는 중 40%')).toBeInTheDocument();
    await expect(canvas.getByLabelText('문서 이름')).toBeDisabled();
    await waitFor(() => expect(canvas.queryByText(/파일 올리는 중 \d+%/)).not.toBeInTheDocument());
  },
};

// 올리기가 실패하면 사유를 보여 주고 다시 고를 수 있음
export const UploadFails: Story = {
  args: {
    stage: async () => {
      throw new DocumentUploadError('연결이 끊겼습니다. 연결을 확인하고 다시 시도해 주세요');
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf());
    await expect(await canvas.findByRole('alert')).toHaveTextContent('연결이 끊겼습니다');
  },
};

// 저장 때 등록이 실패하면 입력과 올려 둔 파일은 그대로 두고 다시 시도할 수 있음
export const SaveFailsKeepsInput: Story = {
  args: {
    onSubmit: fn(async () => {
      throw new DocumentUploadError('연결이 끊겼습니다. 연결을 확인하고 다시 시도해 주세요');
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf());
    await canvas.findByText(/올려 두었습니다/);
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent('연결이 끊겼습니다');
    await expect(canvas.getByLabelText('문서 이름')).toHaveValue('1층 시공도');
    await expect(canvas.getByText(/올려 두었습니다/)).toBeInTheDocument();
  },
};

// 서버가 저장 때 보관 만료로 판정하면 해당 파일만 다시 올리게 안내하고 나머지 입력은 유지
export const ServerSaysExpired: Story = {
  args: {
    onSubmit: fn(async () => {
      throw { error: { code: 'STAGED_FILE_EXPIRED', message: '만료' } };
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf());
    await userEvent.type(canvas.getByLabelText('메모 (선택)'), '창호 위치 변경');
    await canvas.findByText(/올려 두었습니다/);
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/보관 시간이 지나 삭제됐습니다/)).toBeInTheDocument();
    await expect(canvas.getByRole('alert')).toHaveTextContent('해당 파일만 다시 올려 주세요');
    await expect(canvas.getByLabelText('메모 (선택)')).toHaveValue('창호 위치 변경');
  },
};

// 브라우저를 한참 두었다 돌아오면(화면이 다시 보임) 업로드 시각으로 만료를 알려 줌
export const ExpiredWhenReturning: Story = {
  args: { uploadedAt: ago(FILE_STAGED_TTL_SECONDS + 60) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.upload(canvas.getByLabelText('문서 파일'), pdf());
    await canvas.findByText(/올려 두었습니다/);
    document.dispatchEvent(new Event('visibilitychange'));

    await expect(await canvas.findByText(/보관 시간이 지나 삭제됐습니다/)).toBeInTheDocument();

    // 저장을 눌러도 서버로 보내지 않고 해당 파일을 다시 올리게 안내
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

// 새 버전 모드: 이름·분류 없이 파일·개정일·사유만
export const VersionMode: Story = {
  args: { mode: 'version' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByLabelText('문서 이름')).not.toBeInTheDocument();
    await userEvent.upload(canvas.getByLabelText('새 버전 파일'), pdf('시공도_rev3.pdf'));
    await canvas.findByText(/올려 두었습니다/);
    await userEvent.type(canvas.getByLabelText('개정 사유'), '창호 위치 변경');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          file: expect.objectContaining({ name: '시공도_rev3.pdf' }),
          reason: '창호 위치 변경',
        }),
      ),
    );
  },
};
