import {
  AUDIT_ACTION_LABELS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  SUMMARY_DOCUMENT_CATEGORIES,
  type DocumentCategory,
  type DocumentDetail,
} from '@field-note/shared';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { getErrorDetailMessage } from '../lib/apiError';
import { formatDay } from '../lib/dates';

import { DocumentUploadForm, type DocumentFormValues } from './DocumentUploadForm';
import {
  useAddDocumentVersion,
  useDeleteDocument,
  useDocument,
  useDocumentAccessLogs,
  useUpdateDocument,
} from './useDocuments';
import { useOpenDocument } from './useOpenDocument';
import { discardStagedFile } from '../staging/stageApi';
import { useLeaveConfirm } from '../staging/useLeaveConfirm';
import { useStagedFiles, type StagedFiles } from '../staging/useStagedFiles';

type DocumentDetailDialogProps = {
  documentId: string;
  onClose: () => void;
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.ceil(bytes / 1024))}KB`;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

// 문서 상세: 모든 버전(최신이 맨 앞, 이전본 보존), 새 버전 올리기, 이름·분류·민감 표시 수정, 민감 자료의 열람 기록, 삭제
const Body = ({
  document,
  staged,
  onClose,
}: {
  document: DocumentDetail;
  staged: StagedFiles;
  onClose: () => void;
}) => {
  const update = useUpdateDocument();
  const remove = useDeleteDocument();
  const addVersion = useAddDocumentVersion();
  const logs = useDocumentAccessLogs(document.id, document.isSensitive);
  const opener = useOpenDocument();
  const [title, setTitle] = useState(document.title);
  const [category, setCategory] = useState<DocumentCategory>(document.category);
  const [isSensitive, setIsSensitive] = useState(document.isSensitive);
  const [includeInSummary, setIncludeInSummary] = useState(document.includeInSummary);
  // 준공 요약에는 안전·검사, 계약·공문 분류의 민감하지 않은 문서만 포함 가능
  const canSummarize =
    (SUMMARY_DOCUMENT_CATEGORIES as readonly string[]).includes(category) && !isSensitive;
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const save = async () => {
    setError(null);

    try {
      await update.mutateAsync({
        id: document.id,
        body: { title, category, isSensitive, includeInSummary: canSummarize && includeInSummary },
      });
    } catch (caught) {
      setError(getErrorDetailMessage(caught));
    }
  };

  const uploadVersion = async (values: DocumentFormValues) => {
    await addVersion.mutateAsync({
      id: document.id,
      body: {
        fileId: values.file.fileId,
        revisionDate: values.revisionDate || undefined,
        reason: values.reason.trim() || undefined,
      },
    });
  };

  return (
    <>
      <FormField label="문서 이름">
        <Input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} />
      </FormField>
      <FormField label="분류">
        <Select
          value={category}
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
          onChange={(event) => setIsSensitive(event.target.checked)}
        />
        민감 자료 (열람·내려받기 기록이 남습니다)
      </label>
      <label className="flex min-h-touch items-start gap-3 text-base">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0"
          checked={includeInSummary}
          disabled={!canSummarize}
          onChange={(event) => setIncludeInSummary(event.target.checked)}
        />
        <span>
          준공 요약에 넣기
          <span className="block text-sm text-sub">
            안전·검사, 계약·공문 분류의 민감하지 않은 문서만 넣을 수 있습니다
          </span>
        </span>
      </label>
      {error && <Alert>{error}</Alert>}
      <Button
        type="button"
        disabled={update.isPending || !title.trim()}
        onClick={() => void save()}
      >
        저장
      </Button>

      <section className="flex flex-col gap-2" aria-labelledby="versions-heading">
        <h3 id="versions-heading" className="text-base font-bold">
          버전 ({document.versionCount}개)
        </h3>
        <ul className="flex flex-col gap-2">
          {document.versions.map((version, index) => (
            <li
              key={version.versionNo}
              className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-4"
            >
              <p className="text-sm">
                <span className="font-bold">v{version.versionNo}</span>
                {index === 0 && (
                  <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                    최신
                  </span>
                )}
                <span className="ml-2 text-sub">
                  {formatDay(version.revisionDate)} 개정
                  {version.reason ? ` · ${version.reason}` : ''}
                </span>
              </p>
              <p className="text-sm text-sub">
                {version.fileName} · {formatSize(version.size)}
              </p>
              {version.fileStatus !== 'READY' ? (
                <p className="text-sm text-sub" role="status">
                  {version.fileStatus === 'REJECTED'
                    ? '검사에서 거부된 파일입니다'
                    : '파일을 검사하는 중입니다'}
                </p>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`v${version.versionNo} 열기`}
                    onClick={() =>
                      opener.open(
                        {
                          id: document.id,
                          title: document.title,
                          isSensitive: document.isSensitive,
                        },
                        version.versionNo,
                        'view',
                      )
                    }
                  >
                    열기
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`v${version.versionNo} 내려받기`}
                    onClick={() =>
                      opener.open(
                        {
                          id: document.id,
                          title: document.title,
                          isSensitive: document.isSensitive,
                        },
                        version.versionNo,
                        'download',
                      )
                    }
                  >
                    내려받기
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {opener.error && <Alert>{opener.error}</Alert>}
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="new-version-heading">
        <h3 id="new-version-heading" className="text-base font-bold">
          새 버전 올리기
        </h3>
        <p className="text-sm text-sub">
          개정된 파일을 올리면 최신본이 바뀌고 이전본은 그대로 남습니다
        </p>
        <DocumentUploadForm
          mode="version"
          projectId={document.projectId}
          staged={staged}
          onSubmit={uploadVersion}
        />
      </section>

      {document.isSensitive && (
        <section className="flex flex-col gap-2" aria-labelledby="logs-heading">
          <h3 id="logs-heading" className="text-base font-bold">
            열람 기록
          </h3>
          {logs.isPending && <p className="text-sm">불러오는 중</p>}
          {logs.isError && <Alert>열람 기록을 불러오지 못했습니다</Alert>}
          {logs.isSuccess && logs.data.length === 0 && (
            <p className="text-sm text-sub">아직 열람 기록이 없습니다</p>
          )}
          {logs.isSuccess && logs.data.length > 0 && (
            <ul className="divide-y divide-border rounded-xl border border-border text-sm">
              {logs.data.map((log) => (
                <li key={log.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                  <span>
                    {log.actorName} · v{log.versionNo} {AUDIT_ACTION_LABELS[log.action]}
                  </span>
                  <span className="text-sub">{formatTime(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {remove.isError && <Alert>삭제하지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>}
      {isConfirmingDelete ? (
        <Button
          type="button"
          variant="danger"
          disabled={remove.isPending}
          onClick={() => void remove.mutateAsync(document.id).then(onClose)}
        >
          정말 삭제 (파일과 열람 기록은 보존)
        </Button>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setIsConfirmingDelete(true)}>
          문서 삭제
        </Button>
      )}
      {opener.dialog}
    </>
  );
};

export const DocumentDetailDialog = ({ documentId, onClose }: DocumentDetailDialogProps) => {
  const document = useDocument(documentId);
  const staged = useStagedFiles({ scope: `version:${documentId}`, discard: discardStagedFile });
  const leave = useLeaveConfirm(staged, onClose);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && void leave.requestClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 top-0 mx-auto flex max-w-xl flex-col gap-3 overflow-y-auto bg-surface p-4 sm:inset-y-6 sm:rounded-md"
        >
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-lg font-bold">
              {document.data?.title ?? '문서'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button type="button" variant="secondary">
                닫기
              </Button>
            </Dialog.Close>
          </div>
          {document.isPending && <p className="text-sm">불러오는 중</p>}
          {document.isError && <Alert>문서를 불러오지 못했습니다</Alert>}
          {document.data && (
            <Body
              key={document.data.updatedAt}
              document={document.data}
              staged={staged}
              onClose={onClose}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
      {leave.dialog}
    </Dialog.Root>
  );
};
