import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
  type PaginationState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

import { Pagination } from './pagination';
import { Select } from './select';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './table';

type ColumnMeta = {
  // 셀·머리 칸에 붙일 클래스 (좁은 화면에서 숨기기 등)
  className?: string;
};

// 정렬(머리 글자를 누르면 오름→내림→원래 순서)과 쪽 나누기를 지원하는 목록 표, 라이브러리: TanStack Table
// 두 가지 방식 지원, features는 모듈 값으로 고정해 렌더마다 재생성 방지
//  - 서버 방식(`server`를 넘김): 정렬·쪽 나누기를 서버가 하므로 표는 상태만 들고, 바뀌면 부모가 서버에 다시 조회한다 (프로젝트처럼 많아질 수 있는 목록)
//  - 화면 방식(`server` 없음): 받아 둔 전체 줄을 표가 직접 정렬·쪽 나눔 (직원처럼 회사당 상한이 정해진 목록)
export const dataTableFeatures = tableFeatures({
  columnMeta: metaHelper<ColumnMeta>(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text, alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

// 화면에서 `const columns = columnHelper<Row>().columns([...])`로 열 생성
export const columnHelper = <TData extends object>() =>
  createColumnHelper<typeof dataTableFeatures, TData>();

type ServerState = {
  // 조건에 맞는 전체 건수 (쪽 수 계산)
  total: number;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  pagination: PaginationState;
  onPaginationChange: (updater: Updater<PaginationState>) => void;
};

type DataTableProps<TData extends object> = {
  // columnHelper<TData>().columns(...)의 결과, 화면 바깥(모듈 값)에 두어 렌더마다 재생성 방지
  columns: Parameters<typeof useTable<typeof dataTableFeatures, TData>>[0]['columns'];
  // 서버 방식이면 지금 쪽의 줄들, 화면 방식이면 전체 줄들
  data: TData[];
  getRowId: (row: TData) => string;
  server?: ServerState;
  // 화면 방식의 처음 쪽당 개수
  initialPageSize?: number;
  // 줄을 누르면 실행 (줄 안의 링크를 누른 것은 따로 처리)
  onRowClick?: (row: TData) => void;
  pageSizes?: number[];
  emptyState: ReactNode;
  // 표 위쪽 왼쪽에 보여 줄 문구 (예: 총 건수)
  summary?: ReactNode;
  // 새 쪽을 불러오는 중 (이전 쪽을 흐리게 보여 줌)
  isFetching?: boolean;
  'aria-label': string;
};

export const DataTable = <TData extends object>({
  columns,
  data,
  getRowId,
  server,
  initialPageSize = 10,
  onRowClick,
  pageSizes = [10, 20, 50],
  emptyState,
  summary,
  isFetching = false,
  'aria-label': ariaLabel,
}: DataTableProps<TData>) => {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    initialState: { pagination: { pageIndex: 0, pageSize: initialPageSize } },
    ...(server
      ? {
          manualSorting: true,
          manualPagination: true,
          rowCount: server.total,
          state: { sorting: server.sorting, pagination: server.pagination },
          onSortingChange: server.onSortingChange,
          onPaginationChange: server.onPaginationChange,
        }
      : {}),
  });
  const total = server ? server.total : data.length;
  const { pageIndex, pageSize } = table.state.pagination;
  const changePagination = (next: PaginationState) =>
    server ? server.onPaginationChange(next) : table.setPagination(next);

  return (
    <section
      className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
      aria-label={ariaLabel}
      aria-busy={isFetching}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-foreground/70" aria-live="polite">
          {summary}
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground/70">
          쪽당
          <Select
            aria-label="쪽당 개수"
            size="sm"
            className="w-24"
            value={String(pageSize)}
            onValueChange={(value) =>
              // 개수를 바꾸면 첫 쪽부터 재조회
              changePagination({ pageIndex: 0, pageSize: Number(value) })
            }
            options={pageSizes.map((size) => ({ value: String(size), label: `${size}개` }))}
          />
        </label>
      </div>

      {total === 0 && !isFetching ? (
        emptyState
      ) : (
        <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
          <Table>
            <TableHead>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    const className = header.column.columnDef.meta?.className;

                    return (
                      <TableHeaderCell
                        key={header.id}
                        className={className}
                        aria-sort={
                          sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : undefined
                        }
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className={cn(
                              '-mx-2 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-semibold hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary',
                              sorted && 'text-foreground',
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <table.FlexRender header={header} />
                            {sorted === 'asc' ? (
                              <ArrowUp aria-hidden className="size-4" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown aria-hidden className="size-4" />
                            ) : (
                              <ArrowUpDown aria-hidden className="size-4 opacity-50" />
                            )}
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </TableHeaderCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-muted/60',
                  )}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={pageIndex + 1}
        pageCount={Math.max(1, Math.ceil(total / pageSize))}
        onPageChange={(page) => changePagination({ pageIndex: page - 1, pageSize })}
      />
    </section>
  );
};
