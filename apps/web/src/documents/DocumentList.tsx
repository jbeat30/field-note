import { DOCUMENT_CATEGORY_LABELS, type Document } from '@field-note/shared';
import { Ellipsis } from 'lucide-react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
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

// 문서 목록: 문서명·분류·최신 판(개정일)·판 수·민감 표시, 행 오른쪽에 열기 버튼과 더보기(내려받기·새 판 올리기·기록)
export const DocumentList = ({ documents, onOpen, onDetail }: DocumentListProps) => (
  <Table aria-label="문서 목록">
    <TableHead>
      <TableRow>
        <TableHeaderCell>문서명</TableHeaderCell>
        <TableHeaderCell className="hidden md:table-cell">분류</TableHeaderCell>
        <TableHeaderCell>최신 판</TableHeaderCell>
        <TableHeaderCell className="hidden text-right md:table-cell">판 수</TableHeaderCell>
        <TableHeaderCell>
          <span className="sr-only">문서 작업</span>
        </TableHeaderCell>
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
              <span className="mt-0.5 block text-xs text-foreground/65 md:hidden">
                {DOCUMENT_CATEGORY_LABELS[document.category]} · {document.versionCount}판
              </span>
              {!isReady && (
                <span className="ml-2 text-xs text-foreground/55">
                  {latest.fileStatus === 'REJECTED' ? '거부됨' : '검사 중'}
                </span>
              )}
            </TableCell>
            <TableCell className="hidden text-foreground/70 md:table-cell">
              {DOCUMENT_CATEGORY_LABELS[document.category]}
            </TableCell>
            <TableCell className="whitespace-nowrap text-foreground/70">
              <span className="font-semibold tabular-nums text-foreground">
                v{latest.versionNo}
              </span>
              <span className="ml-1.5">{formatDay(latest.revisionDate)}</span>
              <span className="ml-1.5 text-xs">{formatSize(latest.size)}</span>
            </TableCell>
            <TableCell className="hidden text-right tabular-nums text-foreground/70 md:table-cell">
              {document.versionCount}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${document.title} 더보기`}
                    >
                      <Ellipsis aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      disabled={!isReady}
                      onSelect={() => onOpen(document, 'download')}
                    >
                      내려받기
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDetail(document)}>
                      새 판 올리기·버전 기록
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);
