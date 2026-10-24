import type { DocumentCategory } from '@field-note/shared';
import { Search, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/confirm-dialog';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { DocumentCategoryCards } from '../documents/DocumentCategoryCards';
import { DocumentDetailDialog } from '../documents/DocumentDetailDialog';
import { DocumentList } from '../documents/DocumentList';
import { DocumentUploadForm, type DocumentFormValues } from '../documents/DocumentUploadForm';
import { DocumentUploadError } from '../documents/uploadDocument';
import { useAddDocumentVersion, useCreateDocument, useDocuments } from '../documents/useDocuments';
import { useOpenDocument } from '../documents/useOpenDocument';
import { useProject } from '../projects/useProjects';
import { discardStagedFile } from '../staging/stageApi';
import { useLeaveConfirm } from '../staging/useLeaveConfirm';
import { useStagedFiles } from '../staging/useStagedFiles';

import { VALIDATION_MESSAGES } from '@field-note/shared';
import { LoadingBlock } from '../components/ui/loading-block';
// 프로젝트 문서함: 도면·작업지시서·계약서·안전 서류를 분류 폴더별로 모으고, 개정되면 새 판으로 올림 (문서)
export const ProjectDocumentsPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [category, setCategory] = useState<DocumentCategory | ''>('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [q, setQ] = useState('');
  const [params, setParams] = useSearchParams();
  // 검색 결과에서 진입하면(?doc=) 그 문서의 상세를 바로 열기
  const [detailId, setDetailId] = useState<string | null>(params.get('doc'));
  // 분류 카드의 문서 수 계산을 위해 분류는 서버 필터 없이 화면에서 필터링
  const documents = useDocuments(id, { q });
  const create = useCreateDocument(id);
  const addVersion = useAddDocumentVersion();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const staged = useStagedFiles({ scope: `document:${id}`, discard: discardStagedFile });
  const leave = useLeaveConfirm(staged, () => setIsUploadOpen(false));
  const opener = useOpenDocument();
  const all = useMemo(() => documents.data ?? [], [documents.data]);
  const counts = useMemo(() => {
    const result: Partial<Record<DocumentCategory, number>> = {};

    for (const item of all) result[item.category] = (result[item.category] ?? 0) + 1;

    return result;
  }, [all]);
  const shown = category ? all.filter((item) => item.category === category) : all;

  if (project.isPending) {
    return <LoadingBlock label="프로젝트를 불러오는 중" variant="page" />;
  }

  if (!project.data) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  const upload = async (values: DocumentFormValues) => {
    // 같은 이름 문서가 이미 있으면 새 판으로 올릴지 확인
    const same = all.find((item) => item.title.trim() === values.title.trim());
    const asVersion =
      same !== undefined &&
      (await confirm({
        title: '같은 이름의 문서가 있습니다',
        description: `"${same.title}"에 v${same.latest.versionNo + 1}판으로 올릴까요? 이전 판은 그대로 남습니다. 따로 만들려면 취소하고 문서 이름을 바꿔 주세요`,
        confirmLabel: '새 판으로 올리기',
      }));

    if (same && !asVersion) {
      throw new DocumentUploadError(VALIDATION_MESSAGES.DOCUMENT_NOT_UPLOADED_RENAME);
    }

    const { fileId } = values.file;

    if (same) {
      await addVersion.mutateAsync({
        id: same.id,
        body: {
          fileId,
          revisionDate: values.revisionDate || undefined,
          reason: values.reason.trim() || undefined,
        },
      });
    } else {
      await create.mutateAsync({
        fileId,
        title: values.title,
        category: values.category,
        isSensitive: values.isSensitive,
        revisionDate: values.revisionDate || undefined,
        reason: values.reason.trim() || undefined,
      });
    }

    setIsUploadOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        level={2}
        title="문서함"
        description="현장에서 보는 도면·작업지시서, 고객과 주고받은 계약서·공문, 안전·검사 서류를 판(버전)별로 보관합니다"
        actions={
          <Button type="button" onClick={() => setIsUploadOpen(true)}>
            <Upload aria-hidden />
            문서 올리기
          </Button>
        }
      />
      <DocumentCategoryCards
        counts={counts}
        total={all.length}
        value={category}
        onChange={setCategory}
      />
      <section
        className="flex flex-col gap-4 rounded-[30px] bg-surface-subtle p-5 sm:p-7"
        aria-label="문서 목록과 검색"
      >
        <div className="md:w-96">
          <Input
            type="search"
            aria-label="문서 이름 검색"
            placeholder="문서 이름 검색"
            startAdornment={<Search aria-hidden />}
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        {opener.error && (
          <Alert>{opener.error ?? '처리하지 못했습니다. 잠시 후 다시 시도해 주세요'}</Alert>
        )}
        {documents.isPending && <LoadingBlock label="문서를 불러오는 중" />}
        {documents.isError && <Alert>문서를 불러오지 못했습니다</Alert>}
        {documents.isSuccess && shown.length === 0 && (
          <EmptyState
            title={category || q ? '조건에 맞는 문서가 없습니다' : '아직 문서가 없습니다'}
            description={
              category || q ? undefined : '도면·작업지시서·계약서 같은 파일을 올려 보관하세요'
            }
          />
        )}
        {documents.isSuccess && shown.length > 0 && (
          <DocumentList
            documents={shown}
            onOpen={(document, mode) => opener.open(document, document.latest.versionNo, mode)}
            onDetail={(document) => setDetailId(document.id)}
          />
        )}
      </section>
      {detailId && (
        <DocumentDetailDialog
          documentId={detailId}
          onClose={() => {
            setDetailId(null);

            if (params.has('doc')) {
              const next = new URLSearchParams(params);

              next.delete('doc');
              setParams(next, { replace: true });
            }
          }}
        />
      )}
      <Modal
        open={isUploadOpen}
        onOpenChange={(open) => (open ? setIsUploadOpen(true) : void leave.requestClose())}
        title="문서 올리기"
        description="PDF·이미지 파일을 올립니다. 같은 이름의 문서가 있으면 새 판으로 올릴 수 있습니다"
        size="lg"
      >
        <DocumentUploadForm mode="create" projectId={id} staged={staged} onSubmit={upload} />
      </Modal>
      {confirmDialog}
      {leave.dialog}
      {opener.dialog}
    </div>
  );
};
