import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS } from '@field-note/shared';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { DocumentDetailDialog } from '../documents/DocumentDetailDialog';
import { DocumentList } from '../documents/DocumentList';
import { DocumentUploadForm, type DocumentFormValues } from '../documents/DocumentUploadForm';
import { uploadDocumentFile } from '../documents/uploadDocument';
import { useCreateDocument, useDocuments, useUpdateDocument } from '../documents/useDocuments';
import { useOpenDocument } from '../documents/useOpenDocument';
import { useProject } from '../projects/useProjects';

// 프로젝트 문서함: 도면·시방서·작업지시서·계약서를 분류별로 모으고, 개정되면 새 버전으로 올린다 (서비스 기획서 §12.3)
export const ProjectDocumentsPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [params, setParams] = useSearchParams();
  // 검색 결과에서 들어오면(?doc=) 그 문서의 상세를 바로 연다
  const [detailId, setDetailId] = useState<string | null>(params.get('doc'));
  const documents = useDocuments(id, { category, q });
  const create = useCreateDocument(id);
  const update = useUpdateDocument();
  const opener = useOpenDocument();

  if (project.isPending) {
    return <p className="text-sm">프로젝트를 불러오는 중</p>;
  }

  if (!project.data) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  const upload = async (values: DocumentFormValues, onProgress: (ratio: number) => void) => {
    const fileId = await uploadDocumentFile(id, values.file, onProgress);

    await create.mutateAsync({
      fileId,
      title: values.title,
      category: values.category,
      isSensitive: values.isSensitive,
      revisionDate: values.revisionDate || undefined,
      reason: values.reason.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Link
        className="min-h-touch content-center text-sm text-primary underline"
        to={`/projects/${id}`}
      >
        ← {project.data.name}
      </Link>
      <h1 className="text-2xl font-bold">문서함</h1>
      <section
        className="flex flex-col gap-3 rounded-md border border-border p-3"
        aria-labelledby="upload-heading"
      >
        <h2 id="upload-heading" className="text-lg font-bold">
          문서 올리기
        </h2>
        <DocumentUploadForm mode="create" onSubmit={upload} />
      </section>
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-0 flex-1"
          aria-label="문서 이름 검색"
          placeholder="문서 이름 검색"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <Select
          className="w-auto"
          aria-label="분류로 거르기"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">모든 분류</option>
          {DOCUMENT_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {DOCUMENT_CATEGORY_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>
      {(opener.error || update.isError) && (
        <Alert>{opener.error ?? '처리하지 못했습니다. 잠시 후 다시 시도해 주세요'}</Alert>
      )}
      {documents.isPending && <p className="text-sm">문서를 불러오는 중</p>}
      {documents.isError && <Alert>문서를 불러오지 못했습니다</Alert>}
      {documents.isSuccess && documents.data.length === 0 && (
        <p className="text-sm text-foreground/70">
          {category || q
            ? '조건에 맞는 문서가 없습니다'
            : '아직 문서가 없습니다. 위에서 파일을 올려 보세요'}
        </p>
      )}
      {documents.isSuccess && documents.data.length > 0 && (
        <DocumentList
          documents={documents.data}
          onOpen={(document, mode) => opener.open(document, document.latest.versionNo, mode)}
          onDetail={(document) => setDetailId(document.id)}
          onTogglePin={(document) =>
            update.mutate({ id: document.id, body: { isPinned: !document.isPinned } })
          }
        />
      )}
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
      {opener.dialog}
    </div>
  );
};
