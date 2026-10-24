import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABELS,
  type EmployeeListQuery,
} from '@field-note/shared';
import { useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { pillButtonClass, pillIconButtonClass } from '../components/ui/button';
import { columnHelper, DataTable } from '../components/ui/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { Modal } from '../components/ui/modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PageHeader } from '../components/ui/page-header';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { EmployeeQuickAdd } from '../employees/EmployeeQuickAdd';
import { EmployeePayTable, rateText } from '../employees/EmployeePayTable';
import { OptionSelect, optionNameMap } from '../employees/OptionSelect';
import { useEmployees } from '../employees/useEmployees';
import { usePayRateSummaries } from '../labor/useLabor';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { useOptions } from '../settings/useOptions';

type EmployeeItem = NonNullable<ReturnType<typeof useEmployees>['data']>[number];

// 표에 넣을 줄: 직종·구분 이름을 미리 변환
type Row = EmployeeItem & { jobTypeName?: string; workerTypeName?: string; rateLabel?: string };

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
        className="font-semibold hover:text-sub"
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
  helper.accessor('rateLabel', {
    id: 'rate',
    header: '현재 단가',
    sortFn: 'text',
    sortDescFirst: false,
    sortUndefined: 'last',
    cell: ({ row }) =>
      row.original.rateLabel ? (
        <span className="tabular-nums">{row.original.rateLabel}</span>
      ) : row.original.status === 'LEFT' ? (
        '-'
      ) : (
        <Badge tone="warning">단가 없음</Badge>
      ),
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

// 직원 목록 (09): `직원 목록 | 단가표` 탭, 목록은 이름·직책·직종·구분·현재 단가·상태만 표시 (생년월일·연락처는 직원 카드에서만 표시)
export const EmployeeListPage = () => {
  const options = useOptions();
  const [filter, setFilter] = useState<EmployeeListQuery>({});
  // 이름 검색은 타이핑이 멈춘 뒤에만 조회에 반영
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const employees = useEmployees({ ...filter, q: debouncedSearch });
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const summaries = usePayRateSummaries();
  const tab = params.get('tab') === 'rates' ? 'rates' : 'list';
  const names = useMemo(() => optionNameMap(options.data ?? []), [options.data]);
  const update = (patch: Partial<EmployeeListQuery>) =>
    setFilter((current) => ({ ...current, ...patch }));
  const rateById = useMemo(
    () =>
      new Map(
        (summaries.data ?? []).flatMap((item) =>
          item.current ? [[item.employeeId, rateText(item.current)] as const] : [],
        ),
      ),
    [summaries.data],
  );
  const rows = useMemo<Row[]>(
    () =>
      (employees.data ?? []).map((employee) => ({
        ...employee,
        rateLabel: rateById.get(employee.id),
        jobTypeName: employee.jobTypeId ? names.get(employee.jobTypeId) : undefined,
        workerTypeName: employee.workerTypeId ? names.get(employee.workerTypeId) : undefined,
      })),
    [employees.data, names, rateById],
  );

  return (
    <Tabs
      value={tab}
      className="flex flex-col gap-5"
      onValueChange={(next) =>
        setParams(next === 'rates' ? { tab: 'rates' } : {}, { replace: true })
      }
    >
      <PageHeader
        title="직원"
        actions={
          <>
            <Link to="/staffing" className={pillButtonClass}>
              인력 배치 보기
            </Link>
            <Link to="/monthly-hours" className={pillButtonClass}>
              월 공수표
            </Link>
            <button type="button" className={pillIconButtonClass} onClick={() => setAdding(true)}>
              <UserPlus aria-hidden />
              간편 등록
            </button>
          </>
        }
        tabs={
          <TabsList aria-label="직원 화면">
            <TabsTrigger value="list">직원 목록</TabsTrigger>
            <TabsTrigger value="rates">단가표</TabsTrigger>
          </TabsList>
        }
      />

      <TabsContent value="list" className="flex flex-col gap-4 pt-0">
        <div className="grid gap-4 rounded-3xl bg-surface-subtle p-5 sm:grid-cols-3">
          <FormField label="이름">
            <Input
              type="search"
              aria-label="이름 검색"
              placeholder="이름 검색"
              startAdornment={<Search aria-hidden />}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </FormField>
          <FormField label="상태">
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
          </FormField>
          <FormField label="직종">
            <OptionSelect
              aria-label="직종 필터"
              kind="JOB_TYPE"
              options={options.data ?? []}
              value={filter.jobTypeId ?? ''}
              emptyLabel="전체 직종"
              onValueChange={(jobTypeId) => update({ jobTypeId: jobTypeId || undefined })}
            />
          </FormField>
        </div>

        {employees.isPending && <p className="text-sm">직원 목록을 불러오는 중</p>}
        {employees.isError && <Alert>직원 목록을 불러오지 못했습니다</Alert>}
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
                description="필터를 바꾸거나 위의 간편 등록으로 직원을 등록해 보세요"
              />
            }
          />
        )}
      </TabsContent>

      <TabsContent value="rates" className="pt-0">
        <EmployeePayTable />
      </TabsContent>

      <Modal
        open={adding}
        onOpenChange={setAdding}
        title="간편 등록"
        description="이름과 직종만 넣으면 됩니다. 나머지는 직원 카드에서 채웁니다"
      >
        {adding && <EmployeeQuickAdd className="" />}
      </Modal>
    </Tabs>
  );
};
