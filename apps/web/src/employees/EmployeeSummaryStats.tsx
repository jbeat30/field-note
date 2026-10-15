import {
  EMPLOYEE_STATUS_LABELS,
  PAY_TYPE_LABELS,
  todayInSeoul,
  type EmployeeDetail,
} from '@field-note/shared';

import { StatGroup } from '../components/ui/stat-group';
import { usePayRates } from '../labor/useLabor';
import { useCompanySettings } from '../settings/useCompanySettings';
import { useOptions } from '../settings/useOptions';
import { formatWork } from '../workSummary/formatWork';
import { useEmployeeWorkHistory } from '../workSummary/useWorkSummary';

import { optionNameMap } from './OptionSelect';

// 직원 카드 머리의 수치 줄 (09 §7): 상태 · 직종 · 현재 단가 · 이번 달 공수
export const EmployeeSummaryStats = ({ employee }: { employee: EmployeeDetail }) => {
  const options = useOptions();
  const rates = usePayRates(employee.id);
  const history = useEmployeeWorkHistory(employee.id);
  const settings = useCompanySettings();
  const today = todayInSeoul(new Date());
  const active = rates.data?.find((rate) => rate.effectiveFrom <= today);
  const jobType = employee.jobTypeId
    ? optionNameMap(options.data ?? []).get(employee.jobTypeId)
    : undefined;

  return (
    <StatGroup
      items={[
        {
          label: '상태',
          value: EMPLOYEE_STATUS_LABELS[employee.status],
          tone: employee.status === 'ACTIVE' ? 'success' : 'default',
        },
        { label: '직종', value: jobType ?? '-' },
        {
          label: '현재 단가',
          value: active ? active.amount.toLocaleString('ko-KR') : rates.isPending ? '…' : '없음',
          unit: active ? '원' : undefined,
          hint: active ? PAY_TYPE_LABELS[active.payType] : '단가 탭에서 등록',
          tone: !active && rates.isSuccess && employee.status !== 'LEFT' ? 'warning' : 'default',
        },
        {
          label: '이번 달 공수',
          value:
            history.data && settings.data
              ? formatWork(history.data.thisMonthMinutes, settings.data)
              : '…',
        },
      ]}
    />
  );
};
