import { DOCUMENT_CATEGORY_LABELS, type Document } from '@field-note/shared';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/table';
import { formatDay } from '../lib/dates';

type DocumentListProps = {
  documents: readonly Document[];
  onOpen: (document: Document, mode: 'view' | 'download') => void;
  onDetail: (document: Document) => void;
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.ceil(bytes / 1024))}KB`;

// 문서 목록: 테이블 형태로 보여 주고 열기·내려받기·버전기록 버튼을 오른쪽에 배치
export const DocumentList = ({ documents, onOpen, onDetail }: DocumentListProps) => (
  <Table aria-label="문서 목록">
    <TableHead>
      <TableRow>
        <TableHeaderCell>문서명</TableHeaderCell>
        <TableHeaderCell>분류</TableHeaderCell>
        <TableHeaderCell className="text-right">판·크기</TableHeaderCell>
        <TableHeaderCell>개정일</TableHeaderCell>
        <TableHeaderCell />
      </TableRow>
    </TableHead>
    <TableBody>
      {documents.map((document) => {
        const { latest } = document;
        const isReady = latest.fileStatus === 'READY';

        return (
          <TableRow key={document.id}>
            <TableCell>
              <span className="font-semibold">{document.title}</span>
              {document.isSensitive && (
                <Badge tone="danger" className="ml-2">
                  민감
                </Badge>
              )}
              {!isReady && (
                <span className="ml-2 text-xs text-foreground/55">
                  {latest.fileStatus === 'REJECTED' ? '거부됨' : '검사 중'}
                </span>
              )}
            </TableCell>
            <TableCell className="text-foreground/70">
              {DOCUMENT_CATEGORY_LABELS[document.category]}
            </TableCell>
            <TableCell className="text-right tabular-nums text-foreground/70">
              v{latest.versionNo}
              {document.versionCount > 1 && (
                <span className="text-xs"> /{document.versionCount}</span>
              )}
              <span className="ml-1 text-xs">{formatSize(latest.size)}</span>
            </TableCell>
            <TableCell className="whitespace-nowrap text-foreground/70">
              {formatDay(latest.revisionDate)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!isReady}
                  aria-label={`${document.title} 열기`}
                  onClick={() => onOpen(document, 'view')}
                >
                  열기
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!isReady}
                  aria-label={`${document.title} 내려받기`}
                  onClick={() => onOpen(document, 'download')}
                >
                  내려받기
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`${document.title} 버전·기록`}
                  onClick={() => onDetail(document)}
                >
                  버전·기록
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);
