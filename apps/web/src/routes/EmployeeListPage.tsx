import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABELS,
  type EmployeeListQuery,
} from '@field-note/shared';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { columnHelper, DataTable } from '../components/ui/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { PageHeader } from '../components/ui/page-header';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { EmployeeQuickAdd } from '../employees/EmployeeQuickAdd';
import { OptionSelect, optionNameMap } from '../employees/OptionSelect';
import { useEmployees } from '../employees/useEmployees';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { useOptions } from '../settings/useOptions';

type EmployeeItem = NonNullable<ReturnType<typeof useEmployees>['data']>[number];

// 표에 넣을 줄: 직종·구분 이름을 미리 풀어 둔다
type Row = EmployeeItem & { jobTypeName?: string; workerTypeName?: string };

const helper = columnHelper<Row>();

// 열 머리를 누르면 그 열 기준으로 정렬 (받아 둔 직원 전체를 화면에서 정렬: 직원은 회사당 상한이 있음)
const columns = helper.columns([
  helper.accessor('name', {
    id: 'name',
    header: '이름',
    sortFn: 'text',
    sortDescFirst: false,
    meta: { className: 'min-w-32' },
    cell: ({ row }) => (
      <Link
        className="font-semibold hover:text-primary hover:underline"
        to={`/employees/${row.original.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        {row.original.name}
      </Link>
    ),
  }),
  helper.accessor((row) => row.title ?? undefined, {
    id: 'title',
    header: '직책',
    sortFn: 'text',
    sortDescFirst: false,
    sortUndefined: 'last',
    cell: ({ getValue }) => getValue() ?? '-',
  }),
  helper.accessor('jobTypeName', {
    id: 'jobType',
    header: '직종',
    sortFn: 'text',
    sortDescFirst: false,
    sortUndefined: 'last',
    cell: ({ getValue }) => getValue() ?? '-',
  }),
  helper.accessor('workerTypeName', {
    id: 'workerType',
    header: '구분',
    sortFn: 'text',
    sortDescFirst: false,
    sortUndefined: 'last',
    meta: { className: 'hidden md:table-cell' },
    cell: ({ getValue }) => getValue() ?? '-',
  }),
  helper.accessor((row) => EMPLOYEE_STATUS_LABELS[row.status], {
    id: 'status',
    header: '상태',
    sortFn: 'text',
    sortDescFirst: false,
    cell: ({ row }) => (
      <Badge tone={row.original.status === 'ACTIVE' ? 'success' : 'neutral'}>
        {EMPLOYEE_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  }),
  helper.accessor((row) => row.hiredOn ?? undefined, {
    id: 'hiredOn',
    header: '입사일',
    sortFn: 'text',
    sortUndefined: 'last',
    meta: { className: 'hidden whitespace-nowrap lg:table-cell' },
    cell: ({ getValue }) => getValue() ?? '-',
  }),
]);

// 직원 목록: 이름·직책·직종·구분·상태만 보여 준다 (생년월일·연락처는 직원 카드에서만 표시)
export const EmployeeListPage = () => {
  const options = useOptions();
  const [filter, setFilter] = useState<EmployeeListQuery>({});
  // 이름 검색은 타이핑이 멈춘 뒤에만 조회에 반영
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const employees = useEmployees({ ...filter, q: debouncedSearch });
  const navigate = useNavigate();
  const names = useMemo(() => optionNameMap(options.data ?? []), [options.data]);
  const update = (patch: Partial<EmployeeListQuery>) =>
    setFilter((current) => ({ ...current, ...patch }));
  const rows = useMemo<Row[]>(
    () =>
      (employees.data ?? []).map((employee) => ({
        ...employee,
        jobTypeName: employee.jobTypeId ? names.get(employee.jobTypeId) : undefined,
        workerTypeName: employee.workerTypeId ? names.get(employee.workerTypeId) : undefined,
      })),
    [employees.data, names],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="직원"
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/staffing">인력 배치 보기</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/monthly-hours">월 공수표</Link>
            </Button>
          </>
        }
      />

      {/* xl+ 2열: 간편 등록 / 직원 찾기 */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <EmployeeQuickAdd />

        <section
          className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
          aria-labelledby="employee-list-heading"
        >
          <h2 id="employee-list-heading" className="text-base font-bold">
            직원 찾기
          </h2>
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              type="search"
              aria-label="이름 검색"
              placeholder="이름 검색"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <Select
              aria-label="상태 필터"
              value={filter.status ?? ''}
              emptyLabel="전체 상태"
              onValueChange={(status) => update({ status: status || undefined })}
              options={EMPLOYEE_STATUSES.map((status) => ({
                value: status,
                label: EMPLOYEE_STATUS_LABELS[status],
              }))}
            />
            <OptionSelect
              aria-label="직종 필터"
              kind="JOB_TYPE"
              options={options.data ?? []}
              value={filter.jobTypeId ?? ''}
              emptyLabel="전체 직종"
              onValueChange={(jobTypeId) => update({ jobTypeId: jobTypeId || undefined })}
            />
          </div>

          {employees.isPending && <p className="text-sm">직원 목록을 불러오는 중</p>}
          {employees.isError && <Alert>직원 목록을 불러오지 못했습니다</Alert>}
        </section>
      </div>

      {employees.data && (
        <DataTable
          aria-label="직원 목록"
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          onRowClick={(row) => void navigate(`/employees/${row.id}`)}
          summary={`${employees.data.length}명`}
          emptyState={
            <EmptyState
              title="조건에 맞는 직원이 없습니다"
              description="필터를 바꾸거나 위에서 직원을 등록해 보세요"
            />
          }
        />
      )}
    </div>
  );
};
