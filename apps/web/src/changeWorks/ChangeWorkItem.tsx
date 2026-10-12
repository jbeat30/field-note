import {
  CHANGE_WORK_CONTENT_MAX_LENGTH,
  CHANGE_WORK_REQUESTER_MAX_LENGTH,
  CHANGE_WORK_STATUSES,
  CHANGE_WORK_STATUS_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  changeWorkUpdateSchema,
  daysInStatus,
  todayInSeoul,
  validateChangeWorkTransition,
  type ChangeWork,
  type ChangeWorkDetail,
  type ChangeWorkStatus,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { useDocuments } from '../documents/useDocuments';
import { formatDay } from '../lib/dates';
import { splitServerErrors } from '../lib/serverErrors';

import {
  useChangeWorkDetail,
  useLinkChangeWorkDocument,
  useTransitionChangeWork,
  useUnlinkChangeWorkDocument,
  useUpdateChangeWork,
} from './useChangeWorks';

// 협의 중으로 이만큼 지나면 오래 방치된 것으로 표시 (§15.3 "7일 경과")
const STALE_DAYS = 7;

const TRANSITION_LABELS: Record<ChangeWorkStatus, string> = {
  NEGOTIATING: '다시 협의 중으로',
  AGREED: '합의됨으로',
  WITHDRAWN: '철회',
};

const StatusForm = ({
  detail,
  to,
  confirmCompleted,
  onDone,
  onClose,
}: {
  detail: ChangeWorkDetail;
  to: ChangeWorkStatus;
  confirmCompleted: boolean;
  onDone: (message: string) => void;
  onClose: () => void;
}) => {
  const transition = useTransitionChangeWork(detail.id);
  const today = todayInSeoul(new Date());
  const [effectiveOn, setEffectiveOn] = useState(today);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');

    // 서버와 같은 공유 규칙으로 먼저 검사해 입력칸 옆에 바로 보여 줌
    const checked = validateChangeWorkTransition({
      from: detail.status,
      to,
      effectiveOn,
      note: note.trim() || null,
      requestedOn: detail.requestedOn,
      today,
    });

    if (!checked.ok) {
      setErrors({ [checked.path]: checked.message });
      return;
    }

    // 성공하면 상태가 바뀌어 이 폼이 다시 그려지므로 Promise로 처리
    void transition
      .mutateAsync({
        toStatus: to,
        effectiveOn,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(confirmCompleted ? { confirmCompleted: true } : {}),
      })
      .then(() => onDone(`'${CHANGE_WORK_STATUS_LABELS[to]}' 상태로 바꿨습니다`))
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, ['effectiveOn', 'note', 'toStatus']);

        setErrors(byField);
        setRootError(root || byField.toStatus || '');
      });
  };

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-border p-3"
      onSubmit={submit}
      noValidate
      aria-label={`${TRANSITION_LABELS[to]} 확인`}
    >
      <p className="text-sm font-medium">
        &apos;{CHANGE_WORK_STATUS_LABELS[detail.status]}&apos; → &apos;
        {CHANGE_WORK_STATUS_LABELS[to]}&apos;
      </p>
      {rootError && <Alert>{rootError}</Alert>}
      <FormField label="바뀐 날" error={errors.effectiveOn}>
        <Input
          type="date"
          max={today}
          value={effectiveOn}
          onChange={(event) => setEffectiveOn(event.target.value)}
        />
      </FormField>
      <FormField label={to === 'WITHDRAWN' ? '사유 (필수)' : '메모 (선택)'} error={errors.note}>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </FormField>
      <div className="flex gap-2">
        <Button
          type="submit"
          variant={to === 'WITHDRAWN' ? 'danger' : 'primary'}
          disabled={transition.isPending}
        >
          {transition.isPending ? '처리 중' : '확인'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          닫기
        </Button>
      </div>
    </form>
  );
};

const EditForm = ({
  detail,
  confirmCompleted,
  onDone,
  onClose,
}: {
  detail: ChangeWorkDetail;
  confirmCompleted: boolean;
  onDone: () => void;
  onClose: () => void;
}) => {
  const update = useUpdateChangeWork(detail.id);
  const today = todayInSeoul(new Date());
  const [requestedOn, setRequestedOn] = useState(detail.requestedOn);
  const [requester, setRequester] = useState(detail.requester);
  const [content, setContent] = useState(detail.content);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');

    const parsed = changeWorkUpdateSchema.safeParse({
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

    void update
      .mutateAsync(parsed.data)
      .then(onDone)
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, ['requestedOn', 'requester', 'content']);

        setErrors(byField);
        setRootError(root);
      });
  };

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-border p-3"
      onSubmit={submit}
      noValidate
      aria-label="변경·추가 작업 수정"
    >
      {rootError && <Alert>{rootError}</Alert>}
      <FormField label="요청일" error={errors.requestedOn}>
        <Input
          type="date"
          max={today}
          value={requestedOn}
          onChange={(event) => setRequestedOn(event.target.value)}
        />
      </FormField>
      <FormField label="요청자" error={errors.requester}>
        <Input
          maxLength={CHANGE_WORK_REQUESTER_MAX_LENGTH}
          value={requester}
          onChange={(event) => setRequester(event.target.value)}
        />
      </FormField>
      <FormField label="요청 내용" error={errors.content}>
        <Textarea
          maxLength={CHANGE_WORK_CONTENT_MAX_LENGTH}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? '저장 중' : '저장'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          닫기
        </Button>
      </div>
    </form>
  );
};

// 증빙: 문서함의 문서(대화 캡처, 합의서 등)를 연결한다. 연결을 풀어도 기록은 남는다
const Evidence = ({
  detail,
  projectId,
  confirmCompleted,
}: {
  detail: ChangeWorkDetail;
  projectId: string;
  confirmCompleted: boolean;
}) => {
  const documents = useDocuments(projectId);
  const link = useLinkChangeWorkDocument(detail.id);
  const unlink = useUnlinkChangeWorkDocument(detail.id);
  const [documentId, setDocumentId] = useState('');
  const [error, setError] = useState('');
  const linkedIds = new Set(detail.documents.map((item) => item.documentId));
  const choices = (documents.data ?? []).filter((item) => !linkedIds.has(item.id));
  const fail = (value: unknown) => setError(splitServerErrors(value, []).root);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medium">증빙</h3>
      {error && <Alert>{error}</Alert>}
      {detail.documents.length === 0 ? (
        <p className="text-sm text-foreground/70">연결한 증빙이 없습니다</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {detail.documents.map((item) => (
            <li key={item.documentId} className="flex items-center justify-between gap-2">
              <span>
                {item.title} · {DOCUMENT_CATEGORY_LABELS[item.category]}
                {item.isSensitive ? ' · 민감' : ''}
              </span>
              <Button
                type="button"
                variant="secondary"
                aria-label={`${item.title} 연결 해제`}
                disabled={unlink.isPending}
                onClick={() => {
                  setError('');
                  unlink.mutateAsync({ documentId: item.documentId, confirmCompleted }).catch(fail);
                }}
              >
                해제
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FormField label="문서함에서 연결">
            <Select value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
              <option value="">문서 선택</option>
              {choices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <Button
          type="button"
          disabled={!documentId || link.isPending}
          onClick={() => {
            setError('');
            link
              .mutateAsync({ documentId, ...(confirmCompleted ? { confirmCompleted: true } : {}) })
              .then(() => setDocumentId(''))
              .catch(fail);
          }}
        >
          연결
        </Button>
      </div>
      <p className="text-sm text-foreground/70">
        대화 캡처나 합의서는 문서함에 올린 뒤 여기서 연결합니다
      </p>
    </div>
  );
};

const Body = ({
  detail,
  projectId,
  editable,
  confirmCompleted,
}: {
  detail: ChangeWorkDetail;
  projectId: string;
  editable: boolean;
  confirmCompleted: boolean;
}) => {
  const [pending, setPending] = useState<ChangeWorkStatus | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      {message && <p role="status">{message}</p>}
      <p className="whitespace-pre-wrap">{detail.content}</p>
      <p className="text-sm text-foreground/70">
        요청 {formatDay(detail.requestedOn)} · {detail.requester}
      </p>

      {editable && (
        <div className="flex flex-wrap gap-2">
          {CHANGE_WORK_STATUSES.filter((status) => status !== detail.status).map((status) => (
            <Button
              key={status}
              type="button"
              variant={status === 'WITHDRAWN' ? 'danger' : 'secondary'}
              onClick={() => {
                setMessage('');
                setEditing(false);
                setPending(status);
              }}
            >
              {TRANSITION_LABELS[status]}
            </Button>
          ))}
          {detail.status === 'NEGOTIATING' && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMessage('');
                setPending(null);
                setEditing(true);
              }}
            >
              내용 수정
            </Button>
          )}
        </div>
      )}

      {pending && (
        <StatusForm
          key={`${detail.status}-${pending}`}
          detail={detail}
          to={pending}
          confirmCompleted={confirmCompleted}
          onDone={(done) => {
            setPending(null);
            setMessage(done);
          }}
          onClose={() => setPending(null)}
        />
      )}
      {editing && (
        <EditForm
          detail={detail}
          confirmCompleted={confirmCompleted}
          onDone={() => {
            setEditing(false);
            setMessage('수정했습니다');
          }}
          onClose={() => setEditing(false)}
        />
      )}

      {editable ? (
        <Evidence detail={detail} projectId={projectId} confirmCompleted={confirmCompleted} />
      ) : (
        <p className="text-sm text-foreground/70">연결한 증빙 {detail.documents.length}건</p>
      )}

      <div className="flex flex-col gap-1">
        <h3 className="font-medium">상태 이력</h3>
        {detail.history.length === 0 ? (
          <p className="text-sm text-foreground/70">상태를 바꾼 적이 없습니다</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {detail.history.map((item) => (
              <li key={item.id}>
                {formatDay(item.effectiveOn)} · {CHANGE_WORK_STATUS_LABELS[item.fromStatus]} →{' '}
                <span className="font-bold">{CHANGE_WORK_STATUS_LABELS[item.toStatus]}</span>
                {item.note ? ` · ${item.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// 변경·추가 작업 한 건: 요약 한 줄과 펼쳐 보는 상세(상태 변경, 수정, 증빙, 이력)
export const ChangeWorkItem = ({
  work,
  projectId,
  editable,
  confirmCompleted,
}: {
  work: ChangeWork;
  projectId: string;
  editable: boolean;
  confirmCompleted: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const detail = useChangeWorkDetail(work.id, open);
  const waited = daysInStatus(work.statusChangedOn, todayInSeoul(new Date()));
  const stale = work.status === 'NEGOTIATING' && waited >= STALE_DAYS;

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">#{work.seq}</span>
        <span className="rounded bg-muted px-2 py-0.5 text-sm">
          {CHANGE_WORK_STATUS_LABELS[work.status]}
        </span>
        {stale && <span className="text-sm font-medium text-danger">{waited}일째 협의 중</span>}
        {work.documentCount > 0 && (
          <span className="text-sm text-foreground/70">증빙 {work.documentCount}건</span>
        )}
      </div>
      <p className="line-clamp-2">{work.content}</p>
      <p className="text-sm text-foreground/70">
        {formatDay(work.requestedOn)} · {work.requester}
      </p>
      <Button
        type="button"
        variant="secondary"
        aria-expanded={open}
        aria-label={`#${work.seq} ${open ? '접기' : '자세히 보기'}`}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? '접기' : '자세히'}
      </Button>
      {open && detail.isError && <Alert>상세를 불러오지 못했습니다</Alert>}
      {open && !detail.data && !detail.isError && <p className="text-sm">불러오는 중</p>}
      {open && detail.data && (
        <Body
          detail={detail.data}
          projectId={projectId}
          editable={editable}
          confirmCompleted={confirmCompleted}
        />
      )}
    </li>
  );
};
