import { PARTNER_KINDS, PARTNER_KIND_LABELS, type PartnerListQuery } from '@field-note/shared';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { columnHelper, DataTable } from '../components/ui/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';
import { PageHeader } from '../components/ui/page-header';
import { Select } from '../components/ui/select';
import { PartnerQuickAdd } from '../partners/PartnerQuickAdd';
import { usePartners } from '../partners/usePartners';

type PartnerItem = NonNullable<ReturnType<typeof usePartners>['data']>[number];

const helper = columnHelper<PartnerItem>();

const columns = helper.columns([
  helper.accessor('name', {
    id: 'name',
    header: '상호',
    sortFn: 'text',
    sortDescFirst: false,
    cell: ({ row }) => (
      <Link
        className="font-semibold hover:text-primary hover:underline"
        to={`/partners/${row.original.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        {row.original.name}
        {!row.original.isActive && (
          <Badge className="ml-2" tone="neutral">
            숨김
          </Badge>
        )}
      </Link>
    ),
  }),
  helper.accessor((row) => PARTNER_KIND_LABELS[row.kind], {
    id: 'kind',
    header: '구분',
    sortFn: 'text',
    sortDescFirst: false,
    cell: ({ getValue }) => <span className="text-foreground/70">{getValue()}</span>,
  }),
  helper.accessor((row) => row.contactName ?? undefined, {
    id: 'contactName',
    header: '담당자',
    sortFn: 'text',
    sortDescFirst: false,
    sortUndefined: 'last',
    cell: ({ getValue }) => getValue() ?? '-',
  }),
]);

// 고객·협력업체·자재 공급처 명부: 상호와 담당자 이름만 보여 주고 연락처·메모는 카드에서만 표시
export const PartnerListPage = () => {
  const [filter, setFilter] = useState<PartnerListQuery>({});
  const [showHidden, setShowHidden] = useState(false);
  const partners = usePartners(filter);
  const navigate = useNavigate();
  const visible = (partners.data ?? []).filter((item) => showHidden || item.isActive);
  const hiddenCount = (partners.data ?? []).filter((item) => !item.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="명부"
        description="고객·협력업체·자재 공급처를 관리합니다. 금액과 거래 내역은 다루지 않습니다"
      />

      {/* xl+ 2열: 간편 등록 / 검색+필터 */}
      <div className="grid gap-5 xl:grid-cols-2">
        <PartnerQuickAdd />

        <section
          className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4"
          aria-labelledby="partner-filter-heading"
        >
          <h2 id="partner-filter-heading" className="text-base font-bold">
            업체 찾기
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              type="search"
              aria-label="상호·담당자 검색"
              placeholder="상호·담당자 검색"
              value={filter.q ?? ''}
              onChange={(event) => setFilter((current) => ({ ...current, q: event.target.value }))}
            />
            <Select
              aria-label="구분 필터"
              value={filter.kind ?? ''}
              emptyLabel="전체 구분"
              onValueChange={(kind) =>
                setFilter((current) => ({ ...current, kind: kind || undefined }))
              }
              options={PARTNER_KINDS.map((kind) => ({
                value: kind,
                label: PARTNER_KIND_LABELS[kind],
              }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={showHidden}
              onChange={(event) => setShowHidden(event.target.checked)}
            />
            숨긴 업체도 보기{hiddenCount > 0 ? ` (${hiddenCount})` : ''}
          </label>
        </section>
      </div>

      {partners.isPending && <p className="text-sm">명부를 불러오는 중</p>}
      {partners.isError && <Alert>명부를 불러오지 못했습니다</Alert>}
      {partners.data && (
        <DataTable
          aria-label="업체 목록"
          columns={columns}
          data={visible}
          getRowId={(row) => row.id}
          onRowClick={(row) => void navigate(`/partners/${row.id}`)}
          summary={`${visible.length}곳`}
          emptyState={
            <EmptyState
              title="조건에 맞는 업체가 없습니다"
              description="필터를 바꾸거나 위에서 업체를 등록해 보세요"
            />
          }
        />
      )}
    </div>
  );
};
