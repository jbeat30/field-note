import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_HINTS,
  DOCUMENT_CATEGORY_LABELS,
  resolveSensitive,
  todayInSeoul,
  type DocumentCategory,
  ERROR_MESSAGES,
  VALIDATION_MESSAGES,
} from '@field-note/shared';
import { FileUp, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { Select } from '../components/ui/select';
import { getErrorCode, getErrorDetailMessage } from '../lib/apiError';
import { cn } from '../lib/cn';
import { LeaveGuard } from '../staging/LeaveGuard';
import { stageDocumentFile } from '../staging/stageApi';
import type { StagedFile } from '../staging/stagedFiles';
import type { StagedFiles } from '../staging/useStagedFiles';

import { DOCUMENT_ACCEPT, titleFromFileName } from './documentFile';
import { DocumentUploadError } from './uploadDocument';

export type DocumentFormValues = {
  // 올려 둔 임시 파일 (저장하면 서버가 문서에 연결해 확정)
  file: StagedFile;
  title: string;
  category: DocumentCategory;
  // 직접 정하지 않았으면 undefined (분류 기본값을 서버가 적용)
  isSensitive: boolean | undefined;
  revisionDate: string;
  reason: string;
};

export type DocumentUploadFormProps = {
  // 새 문서는 이름·분류·민감 표시까지, 새 버전은 파일·개정일·사유만 입력
  mode: 'create' | 'version';
  projectId: string;
  // 올려 둔 임시 파일 목록 (닫기·이탈 확인을 위해 폼을 여는 쪽이 들고 있음)
  staged: StagedFiles;
  // 파일 올리기 (시험·스토리에서 교체)
  stage?: (file: File, onProgress: (ratio: number) => void) => Promise<StagedFile>;
  // 문서 등록 완료까지 대기, 실패 시 예외로 알림
  onSubmit: (values: DocumentFormValues) => Promise<void>;
};

// 문서 올리기: 파일을 고르면 바로 올려 임시 보관하고, 저장하면 문서에 연결됨, 계약·공문은 민감 자료가 기본 켜짐이며 직접 변경 가능
export const DocumentUploadForm = ({
  mode,
  projectId,
  staged,
  stage = (file, onProgress) => stageDocumentFile(projectId, file, onProgress),
  onSubmit,
}: DocumentUploadFormProps) => {
  const today = todayInSeoul(new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const fileAreaRef = useRef<HTMLDivElement>(null);
  const file = staged.files[0] ?? null;
  const isExpired = file !== null && staged.expiredIds.has(file.fileId);
  const [title, setTitle] = useState('');
  // 이름을 직접 고쳤는지 (고치기 전에는 파일을 바꿀 때마다 파일 이름으로 제안)
  const [isTitleEdited, setIsTitleEdited] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>('OTHER');
  // 사용자가 민감 표시를 직접 건드렸는지 (건드리기 전에는 분류에 따라 자동)
  const [sensitiveOverride, setSensitiveOverride] = useState<boolean | undefined>(undefined);
  const [revisionDate, setRevisionDate] = useState(today);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isSensitive = sensitiveOverride ?? resolveSensitive(category);
  const isBusy = progress !== null;
  // 새 문서일 때 이름을 직접 고치기 전이면 파일 이름을 제안
  const shownTitle = isTitleEdited || !file ? title : titleFromFileName(file.name);

  // 만료된 파일 쪽으로 화면을 옮겨 어느 파일을 다시 올려야 하는지 보여 줌
  const showExpired = (fileId: string) => {
    staged.markExpired(fileId);
    setError(ERROR_MESSAGES.STAGED_FILE_EXPIRED);
    fileAreaRef.current?.scrollIntoView({ block: 'center' });
  };

  const choose = async (picked: File | null) => {
    if (!picked) return;

    setError(null);
    setProgress(0);

    try {
      // 새 파일이 올라간 뒤에 이전 파일을 지움 (새 업로드가 실패해도 이전 파일은 그대로)
      const next = await stage(picked, setProgress);

      if (file) await staged.remove(file.fileId);

      staged.add(next);
    } catch (caught) {
      setError(
        caught instanceof DocumentUploadError ? caught.message : getErrorDetailMessage(caught),
      );
    } finally {
      setProgress(null);
    }
  };

  const drop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    if (!isBusy) void choose(event.dataTransfer.files[0] ?? null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError(VALIDATION_MESSAGES.UPLOAD_FILE_REQUIRED);

      return;
    }

    if (isExpired) {
      showExpired(file.fileId);

      return;
    }

    if (mode === 'create' && !shownTitle.trim()) {
      setError(VALIDATION_MESSAGES.required('문서 이름'));

      return;
    }

    setProgress(0);

    try {
      await onSubmit({
        file,
        title: shownTitle,
        category,
        isSensitive: sensitiveOverride,
        revisionDate,
        reason,
      });
      staged.release();
      setTitle('');
      setIsTitleEdited(false);
      setCategory('OTHER');
      setSensitiveOverride(undefined);
      setReason('');

      if (inputRef.current) inputRef.current.value = '';
    } catch (caught) {
      // 저장 때 서버가 보관 만료로 판정하면 그 파일만 다시 올리게 하고 나머지 입력은 유지
      if (getErrorCode(caught) === 'STAGED_FILE_EXPIRED') {
        showExpired(file.fileId);

        return;
      }

      // 올리기 단계의 오류는 사유 문구가 이미 있고, 그 밖에는 서버 오류 형식
      setError(
        caught instanceof DocumentUploadError ? caught.message : getErrorDetailMessage(caught),
      );
    } finally {
      setProgress(null);
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      <LeaveGuard active={staged.files.length > 0} onLeave={staged.discardAll} />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={drop}
        ref={fileAreaRef}
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
          isDragging ? 'border-primary bg-primary-subtle' : 'border-control-border bg-surface',
          isExpired && 'border-danger',
        )}
      >
        <FileUp aria-hidden className="size-6 text-sub" />
        {file ? (
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-semibold break-all">{file.name}</p>
            {isExpired ? (
              <p className="text-sm font-semibold text-danger">
                보관 시간이 지나 삭제됐습니다. 다시 올려 주세요
              </p>
            ) : (
              <p className="text-xs text-sub">올려 두었습니다. 저장하면 문서로 등록됩니다</p>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isBusy}
              onClick={() => void staged.remove(file.fileId)}
            >
              <X aria-hidden />
              올린 파일 지우기
            </Button>
          </div>
        ) : (
          <p className="text-sm text-sub">
            {mode === 'create' ? '문서 파일을' : '새 버전 파일을'} 여기에 끌어 놓으세요 (PDF·이미지)
          </p>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          {file ? '다른 파일 고르기' : '파일 고르기'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={DOCUMENT_ACCEPT}
          disabled={isBusy}
          aria-label={mode === 'create' ? '문서 파일' : '새 버전 파일'}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            void choose(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />
      </div>
      {mode === 'create' && (
        <>
          <FormField label="문서 이름">
            <Input
              placeholder="문서 이름을 입력하세요"
              value={shownTitle}
              maxLength={100}
              disabled={isBusy}
              onChange={(event) => {
                setTitle(event.target.value);
                setIsTitleEdited(true);
              }}
            />
          </FormField>
          <FormField label="분류" hint={DOCUMENT_CATEGORY_HINTS[category] || undefined}>
            <Select
              value={category}
              disabled={isBusy}
              onValueChange={setCategory}
              options={DOCUMENT_CATEGORIES.map((value) => ({
                value,
                label: DOCUMENT_CATEGORY_LABELS[value],
              }))}
            />
          </FormField>
          <label className="flex min-h-touch items-center gap-3 text-base">
            <input
              type="checkbox"
              className="size-5"
              checked={isSensitive}
              disabled={isBusy}
              onChange={(event) => setSensitiveOverride(event.target.checked)}
            />
            민감 자료 (열람·내려받기 기록이 남습니다)
          </label>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="개정일">
          <DateInput
            max={today}
            value={revisionDate}
            disabled={isBusy}
            onChange={(event) => setRevisionDate(event.target.value)}
          />
        </FormField>
        <FormField label={mode === 'version' ? '개정 사유' : '메모 (선택)'}>
          <Input
            placeholder="사유를 입력하세요"
            value={reason}
            maxLength={200}
            disabled={isBusy}
            onChange={(event) => setReason(event.target.value)}
          />
        </FormField>
      </div>
      {error && <Alert>{error}</Alert>}
      {progress !== null && (
        <p className="text-sm" role="status">
          파일 올리는 중 {Math.round(progress * 100)}%
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isBusy}>
          {isBusy ? '처리 중' : '저장'}
        </Button>
      </div>
    </form>
  );
};
