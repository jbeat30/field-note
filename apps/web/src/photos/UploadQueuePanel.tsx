import { Button } from '../components/ui/button';

import type { UploadItem, UploadStatus, UploadStep } from './uploadQueue';

type UploadQueuePanelProps = {
  items: readonly UploadItem[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onClearDone: () => void;
};

const STEP_LABELS: Record<UploadStep, string> = {
  REQUEST: '준비 중',
  PUT: '올리는 중',
  COMPLETE: '확인 중',
  REGISTER: '등록 중',
};

// 상태 문구: 올리는 중에는 단계까지, 기다리는 중에는 다시 시도한다는 점을 알림
const statusLabel = (item: UploadItem) => {
  const labels: Record<UploadStatus, string> = {
    QUEUED: '대기 중',
    RUNNING: STEP_LABELS[item.step],
    WAITING: '연결을 기다리는 중 (자동으로 다시 시도)',
    FAILED: '올리지 못함',
    DONE: '완료',
  };

  return labels[item.status];
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(bytes / 1024)}KB`;

// 업로드 대기열 목록: 선택 즉시 보이고 진행 상태·실패 사유를 알려 주며, 멈춘 항목은 다시 시도하거나 취소
export const UploadQueuePanel = ({
  items,
  onRetry,
  onCancel,
  onClearDone,
}: UploadQueuePanelProps) => {
  if (items.length === 0) return null;

  const doneCount = items.filter((item) => item.status === 'DONE').length;
  const remaining = items.length - doneCount;

  return (
    <section
      className="flex flex-col gap-2 rounded-md border border-border p-3"
      aria-label="사진 올리기 현황"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold" aria-live="polite">
          {remaining > 0 ? `올리는 중 ${remaining}장` : `${doneCount}장을 모두 올렸습니다`}
        </h2>
        {doneCount > 0 && (
          <Button type="button" variant="secondary" onClick={onClearDone}>
            완료 항목 지우기
          </Button>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 py-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{item.name}</span>
              <span className="text-xs text-foreground/70">
                {formatSize(item.size)} · {statusLabel(item)}
                {item.status !== 'DONE' && item.attempts > 0 && item.status !== 'FAILED'
                  ? ` · ${item.attempts}번째 재시도`
                  : ''}
              </span>
              {item.status === 'FAILED' && item.error && (
                <span className="text-xs text-danger">{item.error}</span>
              )}
            </div>
            {item.status === 'FAILED' && (
              <Button type="button" variant="secondary" onClick={() => onRetry(item.id)}>
                다시 시도
              </Button>
            )}
            {item.status !== 'DONE' && (
              <Button type="button" variant="secondary" onClick={() => onCancel(item.id)}>
                취소
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
