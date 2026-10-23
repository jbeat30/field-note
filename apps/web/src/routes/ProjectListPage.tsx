import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  PROJECT_WARNING_LABELS,
  type ProjectListQuery,
  type ProjectSortKey,
  type ProjectStatus,
} from '@field-note/shared';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Chip } from '../components/ui/chip';
import { columnHelper, DataTable } from '../components/ui/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { PageHeader } from '../components/ui/page-header';
import { Combobox } from '../components/ui/combobox';
import { Select } from '../components/ui/select';
import { cn } from '../lib/cn';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { useEmployees } from '../employees/useEmployees';
import { usePartners } from '../partners/usePartners';
import { useProjects } from '../projects/useProjects';
import { useOptions } from '../settings/useOptions';

const STATUS_TONE: Record<ProjectStatus, 'neutral' | 'primary' | 'success' | 'warning' | 'danger'> =
  {
    PLANNED: 'neutral',
    IN_PROGRESS: 'primary',
    SUSPENDED: 'warning',
    COMPLETED: 'success',
    WARRANTY: 'success',
    CLOSED: 'neutral',
    CANCELLED: 'danger',
  };

type ProjectItem = NonNullable<ReturnType<typeof useProjects>['data']>['items'][number];

// 표에 넣을 줄: 고객·담당자·공종 이름을 미리 풀어 둠 (이름 조회가 끝나면 새 줄 객체가 되어 표가 다시 계산함)
type Row = ProjectItem & { clientName?: string; managerName?: string; tradeNames: string };

// 상태로 한 번에 찾는 버튼 (나머지 상태는 자세히 찾기의 상태 선택)
const STATUS_CHIPS: { label: string; status: ProjectStatus | '' }[] = [
  { label: '전체', status: '' },
  { label: '진행 중', status: 'IN_PROGRESS' },
  { label: '예정', status: 'PLANNED' },
  { label: '중단', status: 'SUSPENDED' },
  { label: '완료', status: 'COMPLETED' },
];

// 열 → 서버 정렬 기준
const SORT_KEY: Record<string, ProjectSortKey> = {
  // 번호는 등록 순서대로 매겨지므로 등록순 정렬과 같음
  code: 'recent',
  name: 'name',
  status: 'status',
  client: 'client',
  manager: 'manager',
  period: 'plannedStart',
};

const helper = columnHelper<Row>();

// 열 정의: 머리 글자를 누르면 그 열 기준으로 정렬됨 (번호는 등록순, 이름·고객·담당자는 가나다순, 기간은 시작일순)
const columns = helper.columns([
  helper.accessor('code', {
    id: 'code',
    header: '번호',
    meta: { className: 'hidden whitespace-nowrap tabular-nums text-foreground/70 md:table-cell' },
  }),
  helper.accessor('name', {
    id: 'name',
    header: '프로젝트명',
    meta: { className: 'min-w-48' },
    cell: ({ row }) => (
      <>
        {/* 좁은 화면은 번호·현장명 열이 없어 이름 위아래에 보임 */}
        <span className="block text-xs tabular-nums text-foreground/70 md:hidden">
          {row.original.code}
        </span>
        <Link
          className="font-semibold hover:text-primary hover:underline"
          to={`/projects/${row.original.id}`}
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.name}
        </Link>
        {row.original.siteName && (
          <span className="block text-xs text-foreground/70 md:hidden">
            {row.original.siteName}
          </span>
        )}
      </>
    ),
  }),
  helper.accessor('siteName', {
    id: 'site',
    header: '현장명',
    enableSorting: false,
    meta: { className: 'hidden min-w-36 md:table-cell' },
    cell: ({ getValue }) => getValue() || '-',
  }),
  helper.accessor((row) => PROJECT_STATUS_LABELS[row.status], {
    id: 'status',
    header: '상태',
    cell: ({ row }) => (
      <Badge tone={STATUS_TONE[row.original.status]}>
        {PROJECT_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  }),
  helper.accessor((row) => row.warnings.length, {
    id: 'warnings',
    header: '경고',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.warnings.length === 0 ? (
        <span className="text-foreground/55">-</span>
      ) : (
        <span className="flex flex-wrap gap-1">
          {row.original.warnings.map((warning) => (
            <Badge key={warning} tone="danger" title={PROJECT_WARNING_LABELS[warning]}>
              {PROJECT_WARNING_LABELS[warning]}
            </Badge>
          ))}
        </span>
      ),
  }),
  helper.accessor('clientName', {
    id: 'client',
    header: '고객',
    // 이름을 못 찾은 칸(숨긴 업체 등)은 항상 맨 뒤로
    meta: { className: 'hidden lg:table-cell' },
    cell: ({ getValue }) => getValue() || '-',
  }),
  helper.accessor('managerName', {
    id: 'manager',
    header: '담당자',
    meta: { className: 'hidden lg:table-cell' },
    cell: ({ getValue }) => getValue() || '-',
  }),
  helper.accessor('plannedStart', {
    id: 'period',
    header: '기간',
    meta: { className: 'hidden whitespace-nowrap md:table-cell' },
    cell: ({ row }) => `${row.original.plannedStart} ~ ${row.original.plannedEnd}`,
  }),
  helper.accessor('tradeNames', {
    id: 'trades',
    header: '공종',
    enableSorting: false,
    meta: { className: 'hidden xl:table-cell' },
    cell: ({ getValue }) => getValue() || '-',
  }),
]);

// 프로젝트 목록: 번호·이름·현장명·상태·경고·고객·담당자·공종·기간만 표시, 경고는 진행·중단 프로젝트에만 부착되고 회사 설정의 경고 기준 적용 (현장 연락처·출입 메모는 카드에서만)
export const ProjectListPage = () => {
  // 검색·필터는 서버 조회 조건, 정렬·쪽도 서버에 넘김 (한 쪽만 받음)
  const [filter, setFilter] = useState<ProjectListQuery>({});
  const [searchText, setSearchText] = useState('');
  const [siteText, setSiteText] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  // 타이핑이 멈춘 뒤에만 검색어를 조회에 반영 (글자마다 요청이 나가지 않게)
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const debouncedSite = useDebouncedValue(siteText, 300);
  const sort = sorting[0];
  const projects = useProjects({
    ...filter,
    q: debouncedSearch,
    site: debouncedSite,
    sortBy: sort ? SORT_KEY[sort.id] : undefined,
    sortDir: sort ? (sort.desc ? 'desc' : 'asc') : undefined,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  });
  const options = useOptions();
  const partners = usePartners({});
  const employees = useEmployees({});
  const navigate = useNavigate();
  // 조건이 바뀌면 첫 쪽부터 재조회
  const goFirstPage = () => setPagination((current) => ({ ...current, pageIndex: 0 }));
  const update = (patch: Partial<ProjectListQuery>) => {
    setFilter((current) => ({ ...current, ...patch }));
    goFirstPage();
  };
  const names = useMemo(
    () =>
      new Map([
        ...(options.data ?? []).map((item) => [item.id, item.name] as const),
        ...(partners.data ?? []).map((item) => [item.id, item.name] as const),
        ...(employees.data ?? []).map((item) => [item.id, item.name] as const),
      ]),
    [options.data, partners.data, employees.data],
  );
  const rows = useMemo<Row[]>(
    () =>
      (projects.data?.items ?? []).map((project) => ({
        ...project,
        clientName: names.get(project.clientId),
        managerName: names.get(project.managerId),
        tradeNames: project.tradeIds
          .map((id) => names.get(id))
          .filter(Boolean)
          .join(', '),
      })),
    [projects.data, names],
  );
  const trades = (options.data ?? []).filter((item) => item.kind === 'TRADE');
  const isFiltered = Object.values(filter).some(Boolean) || searchText !== '' || siteText !== '';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="프로젝트"
        actions={
          <Button asChild className="md:hidden">
            <Link to="/projects/new">프로젝트 등록</Link>
          </Button>
        }
      />

      <section
        className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4"
        aria-label="검색과 필터"
      >
        <Input
          type="search"
          aria-label="프로젝트 검색"
          placeholder="프로젝트명·번호로 찾기"
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value);
            goFirstPage();
          }}
        />
        <ul className="flex flex-wrap gap-2" aria-label="상태로 찾기">
          {STATUS_CHIPS.map((chip) => (
            <li key={chip.label}>
              <Chip
                selected={(filter.status ?? '') === chip.status}
                onClick={() =>
                  update({ status: (chip.status || undefined) as ProjectStatus | undefined })
                }
              >
                {chip.label}
              </Chip>
            </li>
          ))}
          <li>
            <Chip
              selected={filter.hasWarning === 'true'}
              onClick={() =>
                update({ hasWarning: filter.hasWarning === 'true' ? undefined : 'true' })
              }
            >
              경고 있음
            </Chip>
          </li>
        </ul>
        <button
          type="button"
          aria-expanded={showAdvanced}
          className="flex min-h-touch items-center gap-1 self-start text-sm font-medium text-primary"
          onClick={() => setShowAdvanced((value) => !value)}
        >
          자세히 찾기 (현장명·고객·담당자·공종·기간)
          <ChevronDown
            aria-hidden
            className={cn('size-4 transition-transform', showAdvanced && 'rotate-180')}
          />
        </button>
        {showAdvanced && (
          <>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Select
                aria-label="상태 필터"
                value={filter.status ?? ''}
                emptyLabel="전체 상태"
                onValueChange={(status) => update({ status: status || undefined })}
                options={PROJECT_STATUSES.map((status) => ({
                  value: status,
                  label: PROJECT_STATUS_LABELS[status],
                }))}
              />
              <Combobox
                aria-label="고객 필터"
                value={filter.clientId ?? ''}
                placeholder="전체 고객"
                searchPlaceholder="고객 이름으로 찾기"
                clearable
                onValueChange={(clientId) => update({ clientId: clientId || undefined })}
                options={(partners.data ?? [])
                  .filter((item) => item.kind === 'CLIENT')
                  .map((item) => ({ value: item.id, label: item.name }))}
              />
              <Combobox
                aria-label="담당자 필터"
                value={filter.managerId ?? ''}
                placeholder="전체 담당자"
                clearable
                onValueChange={(managerId) => update({ managerId: managerId || undefined })}
                options={(employees.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
              <Select
                aria-label="공종 필터"
                value={filter.tradeId ?? ''}
                emptyLabel="전체 공종"
                onValueChange={(tradeId) => update({ tradeId: tradeId || undefined })}
                options={trades.map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <label className="col-span-2 flex flex-col gap-1 text-sm">
                현장명
                <Input
                  type="search"
                  placeholder="예: 강남 사옥"
                  value={siteText}
                  onChange={(event) => {
                    setSiteText(event.target.value);
                    goFirstPage();
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                기간 시작
                <DateInput
                  value={filter.from ?? ''}
                  onChange={(event) => update({ from: event.target.value || undefined })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                기간 끝
                <DateInput
                  value={filter.to ?? ''}
                  onChange={(event) => update({ to: event.target.value || undefined })}
                />
              </label>
            </div>
          </>
        )}
        {isFiltered && (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => {
              setFilter({});
              setSearchText('');
              setSiteText('');
              goFirstPage();
            }}
          >
            필터 지우기
          </Button>
        )}
      </section>

      {projects.isPending && <p className="text-sm">프로젝트를 불러오는 중</p>}
      {projects.isError && <Alert>프로젝트 목록을 불러오지 못했습니다</Alert>}
      {projects.data && (
        <DataTable
          aria-label="프로젝트 목록"
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          isFetching={projects.isFetching}
          server={{
            total: projects.data.total,
            sorting,
            onSortingChange: (updater) => {
              setSorting(updater);
              goFirstPage();
            },
            pagination,
            onPaginationChange: setPagination,
          }}
          onRowClick={(row) => void navigate(`/projects/${row.id}`)}
          summary={`${projects.data.total}건`}
          emptyState={
            <EmptyState
              title="조건에 맞는 프로젝트가 없습니다"
              description="필터를 바꾸거나 새 프로젝트를 등록해 보세요"
            />
          }
        />
      )}
    </div>
  );
};
