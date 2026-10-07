import type { EmployeeSummary, OptionItem, WorkLogSnapshot } from '@field-note/shared';
import { WORK_LOG_STATUS_LABELS, minutesToHours, roundTo } from '@field-note/shared';
import { useState } from 'react';

import { Alert } from '../components/ui/alert';

import { useWorkLogRevisions } from './useWorkLogs';

const formatChangedAt = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

// 고치기 전 값(수정 이력)을 접어 두었다가 펼치면 보여 준다 (서비스 기획서 §9.1, 분쟁 때 기록의 신뢰성)
export const WorkLogRevisionsPanel = ({
  projectId,
  workDate,
  employees,
  categories,
}: {
  projectId: string;
  workDate: string;
  employees: readonly EmployeeSummary[];
  categories: readonly OptionItem[];
}) => {
  const [open, setOpen] = useState(false);
  const revisions = useWorkLogRevisions(projectId, workDate, open);
  const names = new Map([...employees, ...categories].map((item) => [item.id, item.name] as const));

  const entryText = (snapshot: WorkLogSnapshot) =>
    snapshot.entries.length === 0
      ? '공수 없음'
      : snapshot.entries
          .map(
            (entry) =>
              `${names.get(entry.employeeId) ?? '직원'} ${names.get(entry.categoryId) ?? '작업'} ${roundTo(minutesToHours(entry.minutes), 2)}시간`,
          )
          .join(', ');

  return (
    <details
      className="rounded-md border border-border p-3"
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="min-h-touch cursor-pointer content-center text-sm font-bold">
        수정 이력 보기
      </summary>
      {revisions.isPending && open && <p className="text-sm">이력을 불러오는 중</p>}
      {revisions.isError && <Alert>이력을 불러오지 못했습니다</Alert>}
      {revisions.data && revisions.data.length === 0 && (
        <p className="text-sm text-foreground/70">저장한 뒤 고친 기록이 없습니다</p>
      )}
      {revisions.data && revisions.data.length > 0 && (
        <ol className="divide-y divide-border" aria-label="수정 이력">
          {revisions.data.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5 py-2 text-sm">
              <span className="font-medium">
                버전 {item.version}의 내용 ({WORK_LOG_STATUS_LABELS[item.snapshot.status]})
              </span>
              <span>작업 내용: {item.snapshot.content || '(비어 있음)'}</span>
              {item.snapshot.area && <span>작업 구역: {item.snapshot.area}</span>}
              <span>공수: {entryText(item.snapshot)}</span>
              <span className="text-foreground/70">
                고친 시각 {formatChangedAt(item.changedAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
};
