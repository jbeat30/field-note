import {
  AUDIT_ACTION_LABELS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
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
import { uploadDocumentFile } from './uploadDocument';
import {
  useAddDocumentVersion,
  useDeleteDocument,
  useDocument,
  useDocumentAccessLogs,
  useUpdateDocument,
} from './useDocuments';
import { useOpenDocument } from './useOpenDocument';

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
const Body = ({ document, onClose }: { document: DocumentDetail; onClose: () => void }) => {
  const update = useUpdateDocument();
  const remove = useDeleteDocument();
  const addVersion = useAddDocumentVersion();
  const logs = useDocumentAccessLogs(document.id, document.isSensitive);
  const opener = useOpenDocument();
  const [title, setTitle] = useState(document.title);
  const [category, setCategory] = useState<DocumentCategory>(document.category);
  const [isSensitive, setIsSensitive] = useState(document.isSensitive);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const save = async () => {
    setError(null);

    try {
      await update.mutateAsync({ id: document.id, body: { title, category, isSensitive } });
    } catch (caught) {
      setError(getErrorDetailMessage(caught));
    }
  };

  const uploadVersion = async (values: DocumentFormValues, onProgress: (ratio: number) => void) => {
    const fileId = await uploadDocumentFile(document.projectId, values.file, onProgress);

    await addVersion.mutateAsync({
      id: document.id,
      body: {
        fileId,
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
          onChange={(event) => setIsSensitive(event.target.checked)}
        />
        민감 자료 (열람·내려받기 기록이 남습니다)
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
              className="flex flex-col gap-2 rounded-md border border-border p-3"
            >
              <p className="text-sm">
                <span className="font-bold">v{version.versionNo}</span>
                {index === 0 && (
                  <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                    최신
                  </span>
                )}
                <span className="ml-2 text-foreground/70">
                  {formatDay(version.revisionDate)} 개정
                  {version.reason ? ` · ${version.reason}` : ''}
                </span>
              </p>
              <p className="text-sm text-foreground/70">
                {version.fileName} · {formatSize(version.size)}
              </p>
              {version.fileStatus !== 'READY' ? (
                <p className="text-sm text-foreground/70" role="status">
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
        <p className="text-sm text-foreground/70">
          개정된 파일을 올리면 최신본이 바뀌고 이전본은 그대로 남습니다
        </p>
        <DocumentUploadForm mode="version" onSubmit={uploadVersion} />
      </section>

      {document.isSensitive && (
        <section className="flex flex-col gap-2" aria-labelledby="logs-heading">
          <h3 id="logs-heading" className="text-base font-bold">
            열람 기록
          </h3>
          {logs.isPending && <p className="text-sm">불러오는 중</p>}
          {logs.isError && <Alert>열람 기록을 불러오지 못했습니다</Alert>}
          {logs.isSuccess && logs.data.length === 0 && (
            <p className="text-sm text-foreground/70">아직 열람 기록이 없습니다</p>
          )}
          {logs.isSuccess && logs.data.length > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border text-sm">
              {logs.data.map((log) => (
                <li key={log.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                  <span>
                    {log.actorName} · v{log.versionNo} {AUDIT_ACTION_LABELS[log.action]}
                  </span>
                  <span className="text-foreground/70">{formatTime(log.createdAt)}</span>
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

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/50" />
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
            <Body key={document.data.updatedAt} document={document.data} onClose={onClose} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
