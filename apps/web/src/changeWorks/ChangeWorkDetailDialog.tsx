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
import { FileText, Image as ImageIcon, Upload, X } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/confirm-dialog';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { Modal } from '../components/ui/modal';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { DOCUMENT_ACCEPT, titleFromFileName } from '../documents/documentFile';
import { DocumentUploadError } from '../documents/uploadDocument';
import { useDocuments } from '../documents/useDocuments';
import { useOpenDocument } from '../documents/useOpenDocument';
import { formatDay } from '../lib/dates';
import { splitServerErrors } from '../lib/serverErrors';
import { discardStagedFile, stageDocumentFile } from '../staging/stageApi';
import type { StagedFile } from '../staging/stagedFiles';

import {
  useAddChangeWorkEvidence,
  useChangeWorkDetail,
  useLinkChangeWorkDocument,
  useTransitionChangeWork,
  useUnlinkChangeWorkDocument,
  useUpdateChangeWork,
} from './useChangeWorks';
import { LoadingBlock } from '../components/ui/loading-block';

// 협의 중으로 이만큼 지나면 오래 방치된 것으로 표시 ("7일 경과")
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
      className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4"
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
        <DateInput
          max={today}
          value={effectiveOn}
          onChange={(event) => setEffectiveOn(event.target.value)}
        />
      </FormField>
      <FormField label={to === 'WITHDRAWN' ? '사유 (필수)' : '메모 (선택)'} error={errors.note}>
        <Textarea
          placeholder="변경 사유나 처리 내용을 입력하세요"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
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
      className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4"
      onSubmit={submit}
      noValidate
      aria-label="변경·추가 작업 수정"
    >
      {rootError && <Alert>{rootError}</Alert>}
      <FormField label="요청일" error={errors.requestedOn}>
        <DateInput
          max={today}
          value={requestedOn}
          onChange={(event) => setRequestedOn(event.target.value)}
        />
      </FormField>
      <FormField label="요청자" error={errors.requester}>
        <Input
          placeholder="요청한 사람 또는 업체"
          maxLength={CHANGE_WORK_REQUESTER_MAX_LENGTH}
          value={requester}
          onChange={(event) => setRequester(event.target.value)}
        />
      </FormField>
      <FormField label="요청 내용" error={errors.content}>
        <Textarea
          placeholder="추가 공사 내용을 입력하세요"
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

// 증빙: 대화 캡처·합의서·공문 같은 사진·PDF 바로 올리기 또는 문서함의 문서 연결, 연결을 풀어도 기록은 유지
const Evidence = ({
  detail,
  projectId,
  confirmCompleted,
  editable,
}: {
  detail: ChangeWorkDetail;
  projectId: string;
  confirmCompleted: boolean;
  editable: boolean;
}) => {
  const documents = useDocuments(projectId);
  const link = useLinkChangeWorkDocument(detail.id);
  const unlink = useUnlinkChangeWorkDocument(detail.id);
  const addEvidence = useAddChangeWorkEvidence(detail.id);
  const opener = useOpenDocument();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [documentId, setDocumentId] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const linkedIds = new Set(detail.documents.map((item) => item.documentId));
  const choices = (documents.data ?? []).filter((item) => !linkedIds.has(item.id));
  const fail = (value: unknown) => setError(splitServerErrors(value, []).root);
  const isUploading = progress !== null;

  const upload = async (file: File | undefined) => {
    if (!file) return;

    let staged: StagedFile | null = null;

    setError('');
    setProgress(0);

    try {
      // 고르는 즉시 증빙으로 등록하는 동작이라 임시 보관은 올리기부터 등록까지 잠깐뿐
      staged = await stageDocumentFile(projectId, file, setProgress);

      await addEvidence.mutateAsync({
        fileId: staged.fileId,
        title: titleFromFileName(file.name).slice(0, 100),
        ...(confirmCompleted ? { confirmCompleted: true } : {}),
      });
    } catch (caught) {
      // 등록하지 못한 임시 파일이 저장 용량을 차지하지 않게 바로 지움
      if (staged) void discardStagedFile(staged.fileId);

      setError(
        caught instanceof DocumentUploadError ? caught.message : splitServerErrors(caught, []).root,
      );
    } finally {
      setProgress(null);

      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {confirmDialog}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">
          증빙 {detail.documents.length > 0 && `(${detail.documents.length})`}
        </h3>
        {editable && (
          <>
            <Button
              type="button"
              size="sm"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload aria-hidden />
              {isUploading ? '올리는 중' : '증빙 올리기'}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              aria-label="증빙 파일"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => void upload(event.target.files?.[0])}
            />
          </>
        )}
      </div>
      {isUploading && (
        <p className="text-sm" role="status">
          올리는 중 {Math.round(progress * 100)}%
        </p>
      )}
      {(error || opener.error) && <Alert>{error || opener.error}</Alert>}
      {detail.documents.length === 0 ? (
        <p className="text-sm text-sub">
          {editable ? '대화 캡처·합의서·공문 사진이나 PDF를 올려 두세요' : '연결한 증빙이 없습니다'}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {detail.documents.map((item) => (
            <li
              key={item.documentId}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-sub [&_svg]:size-5">
                {item.contentType.startsWith('image/') ? (
                  <ImageIcon aria-hidden />
                ) : (
                  <FileText aria-hidden />
                )}
              </span>
              <button
                type="button"
                aria-label={`${item.title} 열기`}
                className="min-w-0 flex-1 text-left hover:text-primary"
                onClick={() =>
                  opener.open(
                    { id: item.documentId, title: item.title, isSensitive: item.isSensitive },
                    item.latestVersionNo,
                    'view',
                  )
                }
              >
                <span className="block truncate text-sm font-semibold">{item.title}</span>
                <span className="block truncate text-xs text-sub">
                  {DOCUMENT_CATEGORY_LABELS[item.category]}
                  {item.isSensitive ? ', 민감' : ''}, {formatDay(item.linkedAt.slice(0, 10))}
                </span>
              </button>
              {editable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${item.title} 연결 해제`}
                  disabled={unlink.isPending}
                  onClick={async () => {
                    const ok = await confirm({
                      title: '증빙 연결을 풀까요?',
                      description: `"${item.title}"은 문서함에 그대로 남고 이 추가 공사와의 연결만 풀립니다`,
                      confirmLabel: '연결 풀기',
                      danger: true,
                    });

                    if (!ok) return;

                    setError('');
                    unlink
                      .mutateAsync({ documentId: item.documentId, confirmCompleted })
                      .catch(fail);
                  }}
                >
                  <X aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormField label="문서함에서 연결">
              <Select
                value={documentId}
                onValueChange={setDocumentId}
                placeholder="이미 올린 문서 선택"
                options={choices.map((item) => ({ value: item.id, label: item.title }))}
              />
            </FormField>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!documentId || link.isPending}
            onClick={() => {
              setError('');
              link
                .mutateAsync({
                  documentId,
                  ...(confirmCompleted ? { confirmCompleted: true } : {}),
                })
                .then(() => setDocumentId(''))
                .catch(fail);
            }}
          >
            연결
          </Button>
        </div>
      )}
      {opener.dialog}
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
      <p className="text-sm text-sub">
        요청 {formatDay(detail.requestedOn)}, {detail.requester}
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

      <Evidence
        detail={detail}
        projectId={projectId}
        confirmCompleted={confirmCompleted}
        editable={editable}
      />

      <div className="flex flex-col gap-1">
        <h3 className="font-medium">상태 이력</h3>
        {detail.history.length === 0 ? (
          <p className="text-sm text-sub">상태를 바꾼 적이 없습니다</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {detail.history.map((item) => (
              <li key={item.id}>
                {formatDay(item.effectiveOn)}, {CHANGE_WORK_STATUS_LABELS[item.fromStatus]} →{' '}
                <span className="font-bold">{CHANGE_WORK_STATUS_LABELS[item.toStatus]}</span>
                {item.note ? `, ${item.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// 변경·추가 작업 상세 창: 상태 변경, 내용 수정, 증빙, 상태 이력
export const ChangeWorkDetailDialog = ({
  work,
  projectId,
  editable,
  confirmCompleted,
  onClose,
}: {
  work: ChangeWork;
  projectId: string;
  editable: boolean;
  confirmCompleted: boolean;
  onClose: () => void;
}) => {
  const detail = useChangeWorkDetail(work.id, true);
  const waited = daysInStatus(work.statusChangedOn, todayInSeoul(new Date()));
  const stale = work.status === 'NEGOTIATING' && waited >= STALE_DAYS;

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={`#${work.seq} ${CHANGE_WORK_STATUS_LABELS[work.status]}`}
      description={stale ? `${waited}일째 협의 중입니다` : undefined}
    >
      {detail.isError && <Alert>상세를 불러오지 못했습니다</Alert>}
      {!detail.data && !detail.isError && <LoadingBlock label="불러오는 중" />}
      {detail.data && (
        <Body
          detail={detail.data}
          projectId={projectId}
          editable={editable}
          confirmCompleted={confirmCompleted}
        />
      )}
    </Modal>
  );
};
