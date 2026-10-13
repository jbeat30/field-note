import { PARTNER_KINDS, PARTNER_KIND_LABELS, type PartnerListQuery } from '@field-note/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { PartnerQuickAdd } from '../partners/PartnerQuickAdd';
import { usePartners } from '../partners/usePartners';

// 고객·협력업체·자재 공급처 명부: 상호와 담당자 이름만 보여 주고 연락처·메모는 카드에서만 표시
export const PartnerListPage = () => {
  const [filter, setFilter] = useState<PartnerListQuery>({});
  const [showHidden, setShowHidden] = useState(false);
  const partners = usePartners(filter);
  const visible = (partners.data ?? []).filter((item) => showHidden || item.isActive);
  const hiddenCount = (partners.data ?? []).filter((item) => !item.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="명부" description="고객·협력업체 연락처를 관리합니다" />
      <p className="-mt-4 text-sm text-foreground/70">
        고객, 협력업체, 자재 공급처를 관리합니다. 금액과 거래 내역은 다루지 않습니다
      </p>

      <PartnerQuickAdd />

      <section className="flex flex-col gap-3" aria-labelledby="partner-list-heading">
        <h2 id="partner-list-heading" className="text-lg font-bold">
          업체 목록
        </h2>
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
          options={PARTNER_KINDS.map((kind) => ({ value: kind, label: PARTNER_KIND_LABELS[kind] }))}
        />
        <label className="flex min-h-touch items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={showHidden}
            onChange={(event) => setShowHidden(event.target.checked)}
          />
          숨긴 업체도 보기{hiddenCount > 0 ? ` (${hiddenCount})` : ''}
        </label>

        {partners.isPending && <p className="text-sm">명부를 불러오는 중</p>}
        {partners.isError && <Alert>명부를 불러오지 못했습니다</Alert>}
        {partners.data && (
          <>
            <p className="text-sm text-foreground/70" aria-live="polite">
              {visible.length}곳
            </p>
            {visible.length === 0 ? (
              <p className="text-sm">조건에 맞는 업체가 없습니다</p>
            ) : (
              PARTNER_KINDS.map((kind) => {
                const items = visible.filter((item) => item.kind === kind);

                return items.length === 0 ? null : (
                  <div key={kind} className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-foreground/70">
                      {PARTNER_KIND_LABELS[kind]}
                    </h3>
                    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {items.map((partner) => (
                        <li key={partner.id}>
                          <Link
                            className="flex min-h-touch flex-col justify-center gap-0.5 rounded-xl bg-surface-subtle px-5 py-4 transition-shadow hover:shadow-card"
                            to={`/partners/${partner.id}`}
                          >
                            <span
                              className={
                                partner.isActive
                                  ? 'flex items-center gap-2 font-medium'
                                  : 'flex items-center gap-2 font-medium text-foreground/70'
                              }
                            >
                              {partner.name}
                              {!partner.isActive && <Badge>숨김</Badge>}
                            </span>
                            {partner.contactName && (
                              <span className="text-sm text-foreground/70">
                                {partner.contactName}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </>
        )}
      </section>
    </div>
  );
};
