import { Alert } from '../components/ui/alert';
import { useEmployees } from '../employees/useEmployees';
import { useCompanySettings } from '../settings/useCompanySettings';
import { formatWork } from '../workSummary/formatWork';

import { formatWon } from './formatMoney';
import { useLaborCost } from './useLabor';

// 프로젝트 인건비 (최소 추정): 저장된 작업 내역의 공수 × 근무일 단가, 급여 계산이 아니며
// 4대보험·수당·퇴직금·세금은 제외, 단가가 없는 직원의 공수는 합계에서 제외
export const ProjectLaborCostPanel = ({ projectId }: { projectId: string }) => {
  const cost = useLaborCost(projectId);
  const settings = useCompanySettings();
  const employees = useEmployees({});

  if (cost.isError || settings.isError) {
    return <Alert>인건비를 불러오지 못했습니다</Alert>;
  }

  if (!cost.data || !settings.data) {
    return <p className="text-sm">인건비를 불러오는 중</p>;
  }

  const { actual, planned } = cost.data;
  const names = new Map((employees.data ?? []).map((item) => [item.id, item.name]));

  return (
    <section className="flex flex-col gap-3" aria-labelledby="labor-heading">
      <h2 id="labor-heading" className="text-lg font-bold">
        인건비 (최소 추정)
      </h2>
      <p className="text-sm text-sub">
        기록된 공수에 근무일의 직원 단가를 곱한 금액입니다. 4대보험·수당·퇴직금·세금은 포함하지 않아
        실제 인건비는 이보다 크거나 같습니다
      </p>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-sub">지금까지 인건비</dt>
          <dd className="text-lg font-bold">{formatWon(actual.totalAmount)}</dd>
        </div>
        <div>
          <dt className="text-sub">계획 공수 기준 예상</dt>
          <dd className="text-lg font-bold">
            {planned.totalMinutes === 0 && planned.unpricedMinutes === 0
              ? '계획 없음'
              : formatWon(planned.totalAmount)}
          </dd>
        </div>
      </dl>

      {actual.unpricedMinutes > 0 && (
        <Alert>
          단가가 없어 합계에서 빠진 공수가 {formatWork(actual.unpricedMinutes, settings.data)}{' '}
          있습니다. 직원 카드에서 단가를 입력하면 합계가 늘어납니다
        </Alert>
      )}
      {planned.unpricedMinutes > 0 && (
        <p className="text-sm text-sub">
          계획 공수 중 단가가 없어 예상에서 빠진 공수:{' '}
          {formatWork(planned.unpricedMinutes, settings.data)}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <h3 className="font-medium">직원별 (지금까지)</h3>
        {actual.employees.length === 0 ? (
          <p className="text-sm text-sub">저장된 작업 내역이 없습니다</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {actual.employees.map((row) => (
              <li key={row.employeeId}>
                <span className="font-medium">{names.get(row.employeeId) ?? '(알 수 없음)'}</span>
                {' · '}
                {formatWork(row.minutes + row.unpricedMinutes, settings.data)}
                {' · '}
                {row.minutes === 0 ? (
                  <span className="text-sub">단가 미등록</span>
                ) : (
                  <span className="font-bold">{formatWon(row.amount)}</span>
                )}
                {row.minutes > 0 && row.unpricedMinutes > 0 && (
                  <span className="text-sub">
                    {' '}
                    (단가 없는 {formatWork(row.unpricedMinutes, settings.data)} 제외)
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
