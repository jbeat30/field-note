import { MEMO_TAGS, MEMO_TAG_LABELS, type MemoTag, VALIDATION_MESSAGES } from '@field-note/shared';
import { useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { getErrorDetailMessage } from '../lib/apiError';
import { useDraftStore } from '../stores/draftStore';

type MemoFormProps = {
  // 임시 저장 키 (저장 위치별로 다르게)
  draftKey: string;
  // 저장은 서버 확인 뒤에만 입력 초기화, 실패 시 예외로 알림
  onSubmit: (value: { content: string; tag: MemoTag }) => Promise<void>;
  // 저장 버튼 문구 (예: "메모함에 저장", "저장")
  submitLabel?: string;
  autoFocus?: boolean;
};

// 한 줄 메모 입력: 내용만 입력해도 저장, 태그는 기본 "기타", 작성 중인 글은 기기에 임시 저장해 앱을 닫아도 유지
export const MemoForm = ({
  draftKey,
  onSubmit,
  submitLabel = '저장',
  autoFocus,
}: MemoFormProps) => {
  const draft = useDraftStore((state) => state.drafts[draftKey] ?? '');
  const setDraft = useDraftStore((state) => state.setDraft);
  const removeDraft = useDraftStore((state) => state.removeDraft);
  const [tag, setTag] = useState<MemoTag>('OTHER');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!draft.trim()) {
      setError(VALIDATION_MESSAGES.required('내용'));

      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSubmit({ content: draft, tag });
      removeDraft(draftKey);
      setTag('OTHER');
    } catch (caught) {
      // 실패해도 쓴 글은 그대로 두고 사유를 알림
      setError(getErrorDetailMessage(caught));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      <FormField label="메모">
        <Textarea
          value={draft}
          maxLength={5000}
          rows={3}
          autoFocus={autoFocus}
          placeholder="예: 301호 천장 높이 다시 확인"
          onChange={(event) => setDraft(draftKey, event.target.value)}
        />
      </FormField>
      {error && <Alert>{error}</Alert>}
      <div className="flex items-end justify-between gap-2">
        <FormField label="태그" className="w-40">
          <Select
            size="sm"
            value={tag}
            onValueChange={setTag}
            options={MEMO_TAGS.map((value) => ({ value, label: MEMO_TAG_LABELS[value] }))}
          />
        </FormField>
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? '저장 중' : submitLabel}
        </Button>
      </div>
    </form>
  );
};
