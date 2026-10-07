import { Alert } from '../components/ui/alert';

import { usePeriodHistory } from './useAssignments';

const formatChangedAt = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(
    new Date(iso),
  );

// 예정 기간 변경 이력: 언제 어떻게 연장·단축했는지와 사유 (서비스 기획서 §10.2)
export const ProjectPeriodHistory = ({ projectId }: { projectId: string }) => {
  const history = usePeriodHistory(projectId);

  return (
    <section className="flex flex-col gap-2" aria-labelledby="period-history-heading">
      <h2 id="period-history-heading" className="text-lg font-bold">
        예정 기간 변경 이력
      </h2>
      {history.isPending && <p className="text-sm">이력을 불러오는 중</p>}
      {history.isError && <Alert>이력을 불러오지 못했습니다</Alert>}
      {history.data && history.data.length === 0 && (
        <p className="text-sm text-foreground/70">예정 기간을 바꾼 기록이 없습니다</p>
      )}
      {history.data && history.data.length > 0 && (
        <ol className="divide-y divide-border">
          {history.data.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5 py-2 text-sm">
              <span className="font-medium">
                {item.fromStart} ~ {item.fromEnd} → {item.toStart} ~ {item.toEnd}
              </span>
              {item.reason && <span>사유: {item.reason}</span>}
              <span className="text-foreground/70">기록 {formatChangedAt(item.changedAt)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
