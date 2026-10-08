import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  type Document,
  type DocumentCategory,
} from '@field-note/shared';

import { Button } from '../components/ui/button';
import { formatDay } from '../lib/dates';

type DocumentListProps = {
  documents: readonly Document[];
  onOpen: (document: Document, mode: 'view' | 'download') => void;
  onDetail: (document: Document) => void;
  onTogglePin: (document: Document) => void;
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.ceil(bytes / 1024))}KB`;

const DocumentItem = ({
  document,
  onOpen,
  onDetail,
  onTogglePin,
}: { document: Document } & Omit<DocumentListProps, 'documents'>) => {
  const { latest } = document;
  const isReady = latest.fileStatus === 'READY';

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-bold">{document.title}</span>
        {document.isSensitive && (
          <span className="rounded bg-danger px-1.5 py-0.5 text-xs text-primary-foreground">
            민감
          </span>
        )}
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
          최신 v{latest.versionNo}
          {document.versionCount > 1 ? ` (전체 ${document.versionCount}개)` : ''}
        </span>
      </div>
      <p className="text-sm text-foreground/70">
        {latest.fileName} · {formatSize(latest.size)} · {formatDay(latest.revisionDate)} 개정
        {latest.reason ? ` · ${latest.reason}` : ''}
      </p>
      {!isReady && (
        <p className="text-sm text-foreground/70" role="status">
          {latest.fileStatus === 'REJECTED'
            ? '검사에서 거부된 파일입니다'
            : '파일을 검사하는 중입니다'}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!isReady}
          aria-label={`${document.title} 열기`}
          onClick={() => onOpen(document, 'view')}
        >
          열기
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!isReady}
          aria-label={`${document.title} 내려받기`}
          onClick={() => onOpen(document, 'download')}
        >
          내려받기
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label={`${document.title} 상세`}
          onClick={() => onDetail(document)}
        >
          버전·기록
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-pressed={document.isPinned}
          aria-label={`${document.title} ${document.isPinned ? '고정 해제' : '첫 화면에 고정'}`}
          onClick={() => onTogglePin(document)}
        >
          {document.isPinned ? '★ 고정됨' : '☆ 고정'}
        </Button>
      </div>
    </li>
  );
};

// 문서 목록: 고정한 문서를 맨 위에 모으고 나머지는 분류별로 (분류 안에서는 받은 순서 = 최근 수정순)
export const DocumentList = ({ documents, ...handlers }: DocumentListProps) => {
  const pinned = documents.filter((document) => document.isPinned);
  const groups: [string, readonly Document[]][] = [
    ...(pinned.length > 0 ? ([['고정한 문서', pinned]] as [string, readonly Document[]][]) : []),
    ...DOCUMENT_CATEGORIES.map((category: DocumentCategory): [string, readonly Document[]] => [
      DOCUMENT_CATEGORY_LABELS[category],
      documents.filter((document) => !document.isPinned && document.category === category),
    ]).filter(([, items]) => items.length > 0),
  ];

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([label, items]) => (
        <section key={label} className="flex flex-col gap-2" aria-label={label}>
          <h2 className="text-base font-bold">{label}</h2>
          <ul className="flex flex-col gap-2">
            {items.map((document) => (
              <DocumentItem key={document.id} document={document} {...handlers} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
