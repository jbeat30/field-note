import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { formatDay } from '../lib/dates';
import { useCompanySettings } from '../settings/useCompanySettings';

import { formatWork } from './formatWork';
import { useEmployeeWorkHistory } from './useWorkSummary';

// 직원 카드의 투입 이력: 프로젝트별 투입 기간·일수·총 공수와 이번 달·올해 공수, 저장된 작업 내역만 반영
export const EmployeeWorkHistoryPanel = ({ employeeId }: { employeeId: string }) => {
  const history = useEmployeeWorkHistory(employeeId);
  const settings = useCompanySettings();

  if (history.isError || settings.isError) {
    return <Alert>투입 이력을 불러오지 못했습니다</Alert>;
  }

  if (!history.data || !settings.data) {
    return <p className="text-sm">투입 이력을 불러오는 중</p>;
  }

  const { data } = history;
  const config = settings.data;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="history-heading">
      <h2 id="history-heading" className="text-lg font-bold">
        투입 이력
      </h2>
      <dl className="grid grid-cols-2 gap-2 rounded-xl bg-surface-subtle p-4 text-sm">
        <div>
          <dt className="text-sub">이번 달 공수</dt>
          <dd className="font-bold">{formatWork(data.thisMonthMinutes, config)}</dd>
        </div>
        <div>
          <dt className="text-sub">올해 공수</dt>
          <dd className="font-bold">{formatWork(data.thisYearMinutes, config)}</dd>
        </div>
      </dl>
      {data.projects.length === 0 ? (
        <p className="text-sm">아직 투입된 프로젝트가 없습니다</p>
      ) : (
        <ul
          className="divide-y divide-border rounded-xl border border-border"
          aria-label="프로젝트별 투입 이력"
        >
          {data.projects.map((row) => (
            <li key={row.projectId} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
              <Link
                className="min-h-touch content-center font-medium text-primary hover:text-sub"
                to={`/projects/${row.projectId}`}
              >
                {row.projectCode} {row.projectName}
              </Link>
              <span>
                {row.workedDays}일 · {formatWork(row.totalMinutes, config)}
              </span>
              <span className="text-sub">
                {row.assignedFrom && row.assignedTo
                  ? `투입 ${row.assignedFrom} ~ ${row.assignedTo}`
                  : '투입 기록 없음'}
                {row.lastWorkDate ? ` · 최근 ${formatDay(row.lastWorkDate)}` : ' · 작업 기록 없음'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
