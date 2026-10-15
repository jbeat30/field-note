import {
  REPAIR_CONTENT_MAX_LENGTH,
  REPAIR_LOCATION_MAX_LENGTH,
  REPAIR_REQUESTER_MAX_LENGTH,
  repairCreateSchema,
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

import { useCreateRepair } from './useRepairs';

const FIELDS = ['receivedOn', 'requester', 'content', 'location', 'projectId'] as const;

// 보수 요청 접수: 누가 언제 어디의 무엇을 요청했는지 입력, 처음에는 "접수"로 저장
export const RepairForm = ({ projectId }: { projectId: string }) => {
  const create = useCreateRepair(projectId);
  const today = todayInSeoul(new Date());
  const [receivedOn, setReceivedOn] = useState(today);
  const [requester, setRequester] = useState('');
  const [location, setLocation] = useState('');
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
    const parsed = repairCreateSchema.safeParse({
      receivedOn,
      requester,
      content,
      location: location.trim() || null,
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
        setLocation('');
        setReceivedOn(today);
        setSaved(`#${created.seq} 접수했습니다`);
      })
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, FIELDS);

        setErrors(byField);
        setRootError(root || byField.projectId || '');
      });
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate aria-label="보수 요청 접수">
      {rootError && <Alert>{rootError}</Alert>}
      {saved && <p role="status">{saved}</p>}
      <FormField label="접수일" error={errors.receivedOn}>
        <DateInput
          max={today}
          value={receivedOn}
          onChange={(event) => setReceivedOn(event.target.value)}
        />
      </FormField>
      <FormField label="요청자" error={errors.requester} hint="고객 담당자, 관리사무소 등">
        <Input
          maxLength={REPAIR_REQUESTER_MAX_LENGTH}
          value={requester}
          onChange={(event) => setRequester(event.target.value)}
        />
      </FormField>
      <FormField label="위치 (선택)" error={errors.location} hint="구역, 층, 호실 등">
        <Input
          maxLength={REPAIR_LOCATION_MAX_LENGTH}
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
      </FormField>
      <FormField label="요청 내용" error={errors.content} hint="어디가 어떻게 문제인지">
        <Textarea
          maxLength={REPAIR_CONTENT_MAX_LENGTH}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </FormField>
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? '접수 중' : '접수하기'}
      </Button>
    </form>
  );
};
