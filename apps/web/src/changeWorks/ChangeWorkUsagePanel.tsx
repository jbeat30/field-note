import { Alert } from '../components/ui/alert';
import { useCompanySettings } from '../settings/useCompanySettings';
import { formatWork } from '../workSummary/formatWork';

import { useChangeUsage } from './useChangeWorks';

// 변경·추가 작업으로 쓴 공수·자재 (§10.5): 일지와 자재 기록에 "변경·추가 작업" 표시를 한 것의 합계 (정산·협의 근거)
export const ChangeWorkUsagePanel = ({ projectId }: { projectId: string }) => {
  const usage = useChangeUsage(projectId);
  const settings = useCompanySettings();

  if (usage.isError || settings.isError) {
    return <Alert>변경·추가 작업 합계를 불러오지 못했습니다</Alert>;
  }

  if (!usage.data || !settings.data) {
    return <p className="text-sm">합계를 불러오는 중</p>;
  }

  const { workLogCount, minutes, materials } = usage.data;

  return (
    <section className="flex flex-col gap-2" aria-labelledby="change-usage-heading">
      <h2 id="change-usage-heading" className="text-lg font-bold">
        변경·추가 작업으로 쓴 공수·자재
      </h2>
      <p className="text-sm text-foreground/70">
        일지와 자재 기록에서 &quot;변경·추가 작업&quot;으로 표시한 것의 합계입니다
      </p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-foreground/70">공수 (저장된 일지)</dt>
          <dd className="font-bold">{formatWork(minutes, settings.data)}</dd>
        </div>
        <div>
          <dt className="text-foreground/70">일지 수</dt>
          <dd className="font-bold">{workLogCount}건</dd>
        </div>
      </dl>
      {materials.length === 0 ? (
        <p className="text-sm text-foreground/70">변경·추가 작업으로 표시한 자재 사용이 없습니다</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {materials.map((item) => (
            <li key={item.materialId}>
              {item.name}
              {item.spec ? ` (${item.spec})` : ''} ·{' '}
              <span className="font-bold">
                {item.quantity} {item.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
