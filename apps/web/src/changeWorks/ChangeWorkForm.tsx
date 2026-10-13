import {
  CHANGE_WORK_CONTENT_MAX_LENGTH,
  CHANGE_WORK_REQUESTER_MAX_LENGTH,
  changeWorkCreateSchema,
  todayInSeoul,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { Textarea } from '../components/ui/textarea';
import { splitServerErrors } from '../lib/serverErrors';

import { useCreateChangeWork } from './useChangeWorks';

const FIELDS = ['requestedOn', 'requester', 'content', 'confirmCompleted'] as const;

// 변경·추가 작업 기록: 누가 언제 무엇을 요청했는지만 적으면 된다 (금액은 기록하지 않음). 처음에는 "협의 중"으로 저장된다
export const ChangeWorkForm = ({
  projectId,
  confirmCompleted,
}: {
  projectId: string;
  confirmCompleted: boolean;
}) => {
  const create = useCreateChangeWork(projectId);
  const today = todayInSeoul(new Date());
  const [requestedOn, setRequestedOn] = useState(today);
  const [requester, setRequester] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');
  const [saved, setSaved] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');
    setSaved('');

    // 서버와 같은 공유 스키마로 먼저 검사해 입력칸 옆에 바로 보여 줌
    const parsed = changeWorkCreateSchema.safeParse({
      requestedOn,
      requester,
      content,
      ...(confirmCompleted ? { confirmCompleted: true } : {}),
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] ??= issue.message;
      }

      setErrors(next);
      return;
    }

    void create
      .mutateAsync(parsed.data)
      .then((created) => {
        setRequester('');
        setContent('');
        setRequestedOn(today);
        setSaved(`#${created.seq} 기록했습니다 (협의 중)`);
      })
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, FIELDS);

        setErrors(byField);
        setRootError(root || byField.confirmCompleted || '');
      });
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={submit}
      noValidate
      aria-label="변경·추가 작업 기록"
    >
      {rootError && <Alert>{rootError}</Alert>}
      {saved && <p role="status">{saved}</p>}
      <FormField label="요청일" error={errors.requestedOn}>
        <DateInput
          max={today}
          value={requestedOn}
          onChange={(event) => setRequestedOn(event.target.value)}
        />
      </FormField>
      <FormField
        label="요청자"
        error={errors.requester}
        hint="고객 담당자, 현장소장 등 누가 요청했는지"
      >
        <Input
          maxLength={CHANGE_WORK_REQUESTER_MAX_LENGTH}
          value={requester}
          onChange={(event) => setRequester(event.target.value)}
        />
      </FormField>
      <FormField label="요청 내용" error={errors.content} hint="무엇이 바뀌거나 추가되는지">
        <Textarea
          maxLength={CHANGE_WORK_CONTENT_MAX_LENGTH}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </FormField>
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? '기록 중' : '기록하기'}
      </Button>
    </form>
  );
};
