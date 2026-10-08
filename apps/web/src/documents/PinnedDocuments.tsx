import { Button } from '../components/ui/button';

import { useDocuments } from './useDocuments';
import { useOpenDocument } from './useOpenDocument';

// 프로젝트 첫 화면에 고정한 문서: 현장에서 자주 여는 도면을 바로 연다 (서비스 기획서 §12.3)
export const PinnedDocuments = ({ projectId }: { projectId: string }) => {
  const documents = useDocuments(projectId, { pinned: true });
  const opener = useOpenDocument();

  if (!documents.data || documents.data.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-labelledby="pinned-heading">
      <h2 id="pinned-heading" className="text-lg font-bold">
        고정한 문서
      </h2>
      <ul className="flex flex-col gap-2">
        {documents.data.map((document) => (
          <li key={document.id}>
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-start"
              disabled={document.latest.fileStatus !== 'READY'}
              onClick={() => opener.open(document, document.latest.versionNo, 'view')}
            >
              {document.title}
              {document.isSensitive ? ' (민감)' : ''}
            </Button>
          </li>
        ))}
      </ul>
      {opener.error && (
        <p role="alert" className="text-sm text-danger">
          {opener.error}
        </p>
      )}
      {opener.dialog}
    </section>
  );
};
