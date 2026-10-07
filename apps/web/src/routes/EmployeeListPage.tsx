import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABELS,
  type EmployeeListQuery,
  type EmployeeStatus,
} from '@field-note/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { EmployeeQuickAdd } from '../employees/EmployeeQuickAdd';
import { OptionSelect, optionNameMap } from '../employees/OptionSelect';
import { useEmployees } from '../employees/useEmployees';
import { useOptions } from '../settings/useOptions';

// 직원 목록: 이름·직책·직종·구분·상태만 보여 준다 (생년월일·연락처는 직원 카드에서만 표시)
export const EmployeeListPage = () => {
  const options = useOptions();
  const [filter, setFilter] = useState<EmployeeListQuery>({});
  const employees = useEmployees(filter);
  const names = optionNameMap(options.data ?? []);
  const update = (patch: Partial<EmployeeListQuery>) =>
    setFilter((current) => ({ ...current, ...patch }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">직원</h1>

      <EmployeeQuickAdd />

      <section className="flex flex-col gap-3" aria-labelledby="employee-list-heading">
        <h2 id="employee-list-heading" className="text-lg font-bold">
          직원 목록
        </h2>
        <Input
          type="search"
          aria-label="이름 검색"
          placeholder="이름 검색"
          value={filter.q ?? ''}
          onChange={(event) => update({ q: event.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label="상태 필터"
            value={filter.status ?? ''}
            onChange={(event) =>
              update({ status: (event.target.value || undefined) as EmployeeStatus | undefined })
            }
          >
            <option value="">전체 상태</option>
            {EMPLOYEE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {EMPLOYEE_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
          <OptionSelect
            aria-label="직종 필터"
            kind="JOB_TYPE"
            options={options.data ?? []}
            value={filter.jobTypeId ?? ''}
            emptyLabel="전체 직종"
            onChange={(event) => update({ jobTypeId: event.target.value || undefined })}
          />
        </div>

        {employees.isPending && <p className="text-sm">직원 목록을 불러오는 중</p>}
        {employees.isError && <Alert>직원 목록을 불러오지 못했습니다</Alert>}
        {employees.data && (
          <>
            <p className="text-sm text-foreground/70" aria-live="polite">
              {employees.data.length}명
            </p>
            {employees.data.length === 0 ? (
              <p className="text-sm">조건에 맞는 직원이 없습니다</p>
            ) : (
              <ul className="divide-y divide-border">
                {employees.data.map((employee) => {
                  const details = [
                    employee.title,
                    employee.jobTypeId ? names.get(employee.jobTypeId) : null,
                    employee.workerTypeId ? names.get(employee.workerTypeId) : null,
                  ].filter(Boolean);

                  return (
                    <li key={employee.id}>
                      <Link
                        className="flex min-h-touch flex-col justify-center gap-0.5 py-2"
                        to={`/employees/${employee.id}`}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          {employee.name}
                          {employee.status !== 'ACTIVE' && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal">
                              {EMPLOYEE_STATUS_LABELS[employee.status]}
                            </span>
                          )}
                        </span>
                        {details.length > 0 && (
                          <span className="text-sm text-foreground/70">{details.join(' · ')}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
};
