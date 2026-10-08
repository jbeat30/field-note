import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_HINTS,
  DOCUMENT_CATEGORY_LABELS,
  resolveSensitive,
  todayInSeoul,
  type DocumentCategory,
} from '@field-note/shared';
import { useRef, useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { getErrorDetailMessage } from '../lib/apiError';

import { DOCUMENT_ACCEPT, titleFromFileName } from './documentFile';
import { DocumentUploadError } from './uploadDocument';

export type DocumentFormValues = {
  file: File;
  title: string;
  category: DocumentCategory;
  // 직접 정하지 않았으면 undefined (분류 기본값을 서버가 적용)
  isSensitive: boolean | undefined;
  revisionDate: string;
  reason: string;
};

type DocumentUploadFormProps = {
  // 새 문서면 이름·분류·민감 표시까지, 새 버전이면 파일·개정일·사유만 받는다
  mode: 'create' | 'version';
  // 올리기와 등록을 마칠 때까지 기다림. 진행률(0~1)을 알려 주고, 실패하면 던져서 알린다
  onSubmit: (values: DocumentFormValues, onProgress: (ratio: number) => void) => Promise<void>;
};

// 문서 올리기: 파일을 고르고 이름·분류를 정한다. 계약·행정은 민감 자료가 기본으로 켜지고 직접 바꿀 수 있다
export const DocumentUploadForm = ({ mode, onSubmit }: DocumentUploadFormProps) => {
  const today = todayInSeoul(new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
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

  const isSensitive = sensitiveOverride ?? resolveSensitive(category);
  const isBusy = progress !== null;

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;

    setFile(picked);
    // 새 문서일 때 이름을 직접 고치기 전이면 파일 이름을 제안
    if (picked && mode === 'create' && !isTitleEdited) setTitle(titleFromFileName(picked.name));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError('올릴 파일을 골라 주세요');

      return;
    }

    if (mode === 'create' && !title.trim()) {
      setError('문서 이름을 입력해 주세요');

      return;
    }

    setProgress(0);

    try {
      await onSubmit(
        { file, title, category, isSensitive: sensitiveOverride, revisionDate, reason },
        setProgress,
      );
      setFile(null);
      setTitle('');
      setIsTitleEdited(false);
      setCategory('OTHER');
      setSensitiveOverride(undefined);
      setReason('');

      if (inputRef.current) inputRef.current.value = '';
    } catch (caught) {
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
      <FormField label={mode === 'create' ? '문서 파일' : '새 버전 파일'}>
        <input
          ref={inputRef}
          type="file"
          accept={DOCUMENT_ACCEPT}
          disabled={isBusy}
          className="min-h-touch w-full text-base file:mr-3 file:min-h-touch file:rounded-md file:border-0 file:bg-muted file:px-4 file:text-base"
          onChange={pick}
        />
      </FormField>
      {mode === 'create' && (
        <>
          <FormField label="문서 이름">
            <Input
              value={title}
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
              onChange={(event) => setCategory(event.target.value as DocumentCategory)}
            >
              {DOCUMENT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {DOCUMENT_CATEGORY_LABELS[value]}
                </option>
              ))}
            </Select>
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
          <Input
            type="date"
            max={today}
            value={revisionDate}
            disabled={isBusy}
            onChange={(event) => setRevisionDate(event.target.value)}
          />
        </FormField>
        <FormField label={mode === 'version' ? '개정 사유' : '메모 (선택)'}>
          <Input
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
          올리는 중 {Math.round(progress * 100)}%
        </p>
      )}
      <Button type="submit" disabled={isBusy}>
        {isBusy ? '올리는 중' : mode === 'create' ? '문서 올리기' : '새 버전 올리기'}
      </Button>
    </form>
  );
};
