import { X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getErrorDetailMessage } from '../lib/apiError';

import type { StagedFile } from './stagedFiles';
import type { StagedFiles } from './useStagedFiles';

type StagedFileFieldProps = {
  // 만료 안내 때 이 칸으로 화면을 옮기기 위한 식별자
  id: string;
  staged: StagedFiles;
  // 파일 올리기 (진행률 0~1 전달, 실패하면 예외)
  stage: (file: File, onProgress: (ratio: number) => void) => Promise<StagedFile>;
  accept: string;
  // 올리기 실패 같은 오류 문구를 폼의 오류 영역으로 전달
  onError: (message: string) => void;
  disabled?: boolean;
  // 한 칸에 올릴 수 있는 파일 수 (기본 1: 새로 고르면 이전 파일을 바꿈)
  label?: string;
};

/**
 * @description 폼의 파일 칸: 고르면 바로 올려 임시 보관하고, 올린 파일 이름·상태·지우기를 보여 줌
 * 만료된 파일은 다시 올리라는 표시만 하고, 폼 저장·닫기는 폼이 맡음
 * @param props 임시 파일 목록, 올리기 함수, 허용 형식
 * @returns 파일 칸
 */
export const StagedFileField = ({
  id,
  staged,
  stage,
  accept,
  onError,
  disabled = false,
  label = '파일',
}: StagedFileFieldProps) => {
  const [progress, setProgress] = useState<number | null>(null);
  // 같은 파일을 다시 고를 수 있도록 입력칸을 새로 그림
  const [inputKey, setInputKey] = useState(0);
  const file = staged.files[0] ?? null;
  const isExpired = file !== null && staged.expiredIds.has(file.fileId);
  const isBusy = progress !== null;

  const choose = async (picked: File | undefined) => {
    if (!picked) return;

    onError('');
    setProgress(0);

    try {
      // 올려 둔 파일이 있으면 지우고 바꿈
      if (file) await staged.remove(file.fileId);

      staged.add(await stage(picked, setProgress));
    } catch (caught) {
      onError(
        caught instanceof Error && caught.message ? caught.message : getErrorDetailMessage(caught),
      );
    } finally {
      setProgress(null);
      setInputKey((key) => key + 1);
    }
  };

  return (
    <div id={id} className="flex flex-col gap-2">
      <Input
        key={inputKey}
        type="file"
        accept={accept}
        aria-label={label}
        disabled={disabled || isBusy}
        onChange={(event) => void choose(event.target.files?.[0])}
      />
      {isBusy && (
        <p className="text-sm" role="status">
          파일 올리는 중 {Math.round(progress * 100)}%
        </p>
      )}
      {file && (
        <div
          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
            isExpired ? 'border-danger' : 'border-line'
          }`}
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className={isExpired ? 'font-semibold text-danger' : 'text-xs text-foreground/70'}>
              {isExpired
                ? '보관 시간이 지나 삭제됐습니다. 다시 올려 주세요'
                : '올려 두었습니다. 저장하면 연결됩니다'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${file.name} 올린 파일 지우기`}
            disabled={disabled || isBusy}
            onClick={() => void staged.remove(file.fileId)}
          >
            <X aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * @description 만료 안내를 보여 줄 파일 칸으로 화면을 옮김
 * @param id 파일 칸 식별자
 */
export const scrollToStagedField = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ block: 'center' });
};
