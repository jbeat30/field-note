import {
  CHANGE_WORK_STATUS_LABELS,
  daysInStatus,
  todayInSeoul,
  type ChangeWork,
  type ChangeWorkStatus,
} from '@field-note/shared';

import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/table';
import { formatDay } from '../lib/dates';

// 협의 중으로 이만큼 지나면 오래 방치된 것으로 표시 (§15.3 "7일 경과")
const STALE_DAYS = 7;

const TONE: Record<ChangeWorkStatus, 'warning' | 'success' | 'neutral'> = {
  NEGOTIATING: 'warning',
  AGREED: 'success',
  WITHDRAWN: 'neutral',
};

type ChangeWorkTableProps = {
  works: readonly ChangeWork[];
  onOpen: (work: ChangeWork) => void;
};

// 추가 공사 목록 표: 번호·내용·요청자·요청일·상태·증빙 수. 내용을 누르면 상세 창이 열린다 (좁은 화면은 요청자·요청일을 내용 아래로)
export const ChangeWorkTable = ({ works, onOpen }: ChangeWorkTableProps) => {
  const today = todayInSeoul(new Date());

  return (
    <Table aria-label="추가 공사 목록">
      <TableHead>
        <TableRow>
          <TableHeaderCell>번호</TableHeaderCell>
          <TableHeaderCell className="w-full">내용</TableHeaderCell>
          <TableHeaderCell className="hidden md:table-cell">요청자</TableHeaderCell>
          <TableHeaderCell className="hidden md:table-cell">요청일</TableHeaderCell>
          <TableHeaderCell>상태</TableHeaderCell>
          <TableHeaderCell className="text-right">증빙</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {works.map((work) => {
          const waited = daysInStatus(work.statusChangedOn, today);
          const stale = work.status === 'NEGOTIATING' && waited >= STALE_DAYS;

          return (
            <TableRow key={work.id}>
              <TableCell className="font-semibold tabular-nums">#{work.seq}</TableCell>
              <TableCell className="max-w-0">
                <button
                  type="button"
                  aria-label={`#${work.seq} 자세히 보기`}
                  onClick={() => onOpen(work)}
                  className="block w-full text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="line-clamp-2">{work.content}</span>
                  <span className="mt-0.5 block text-xs text-foreground/65 md:hidden">
                    {formatDay(work.requestedOn)} · {work.requester}
                  </span>
                </button>
                {stale && (
                  <span className="mt-0.5 block text-xs font-medium text-danger">
                    {waited}일째 협의 중
                  </span>
                )}
              </TableCell>
              <TableCell className="hidden whitespace-nowrap text-foreground/75 md:table-cell">
                {work.requester}
              </TableCell>
              <TableCell className="hidden whitespace-nowrap text-foreground/75 md:table-cell">
                {formatDay(work.requestedOn)}
              </TableCell>
              <TableCell>
                <Badge tone={TONE[work.status]}>{CHANGE_WORK_STATUS_LABELS[work.status]}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums text-foreground/75">
                {work.documentCount}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
