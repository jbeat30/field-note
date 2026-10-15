import { type EmployeeDetail } from '@field-note/shared';
import { Link } from 'react-router';

import { useCredentials } from '../credentials/useCredentials';
import { useOptions } from '../settings/useOptions';

import { optionNameMap } from './OptionSelect';

// 직원 카드 개요 탭: 직책·직종·구분·입사일(퇴사일)과 서류 현황 요약. 연락처·생년월일·메모는 기본정보 탭에서만 보인다
export const EmployeeOverviewPanel = ({ employee }: { employee: EmployeeDetail }) => {
  const options = useOptions();
  const credentials = useCredentials(employee.id);
  const names = optionNameMap(options.data ?? []);
  const expiring = (credentials.data ?? []).filter((item) => item.status !== 'VALID').length;
  const rows: [string, string][] = [
    ['직책', employee.title ?? '-'],
    ['직종', (employee.jobTypeId && names.get(employee.jobTypeId)) || '-'],
    ['직원 구분', (employee.workerTypeId && names.get(employee.workerTypeId)) || '-'],
    ['입사일', employee.hiredOn ?? '-'],
    ...(employee.status === 'LEFT'
      ? ([['퇴사일', employee.leftOn ?? '-']] as [string, string][])
      : []),
  ];

  return (
    <section className="flex flex-col gap-3" aria-labelledby="overview-heading">
      <h2 id="overview-heading" className="text-lg font-bold">
        개요
      </h2>
      <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-foreground/70">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {credentials.data && (
        <p className="text-sm">
          <Link
            className="font-medium text-primary underline"
            to={`/employees/${employee.id}?tab=credentials`}
          >
            서류·자격 {credentials.data.length}건
          </Link>
          {expiring > 0 && (
            <span className="ml-2 font-medium text-danger">만료·만료 임박 {expiring}건</span>
          )}
        </p>
      )}
    </section>
  );
};
