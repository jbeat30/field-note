import {
  LEDGER_KIND_LABELS,
  todayInSeoul,
  type LedgerEntry,
  type LedgerKind,
} from '@field-note/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/confirm-dialog';
import { DateInput } from '../components/ui/date-input';
import { EmptyState } from '../components/ui/empty-state';
import { Modal } from '../components/ui/modal';
import { SegmentedControl } from '../components/ui/segmented-control';
import { Section } from '../components/ui/section';
import { Select } from '../components/ui/select';
import { StatGroup } from '../components/ui/stat-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/table';
import { useLaborCost } from '../labor/useLabor';
import { formatDay } from '../lib/dates';
import { usePartners } from '../partners/usePartners';
import { useOptions } from '../settings/useOptions';

import { LedgerEntryForm } from './LedgerEntryForm';
import {
  useDeleteLedgerEntry,
  useLedgerEntries,
  useLedgerSummary,
  type LedgerFilter,
} from './useLedger';

type KindFilter = LedgerKind | 'ALL';

const wonText = (amount: number) => amount.toLocaleString('ko-KR');

// 비용·자재 메뉴의 첫 구역: 합계 줄(지출 · 인건비 추정 · 수입) + 내역 표 + 구분·분류·기간 필터
// 지출이 기본이고 수입은 구분 단추로 전환해 입력, 계약 금액·청구·입금은 제외
export const LedgerPanel = ({ projectId }: { projectId: string }) => {
  const today = todayInSeoul(new Date());
  const [kind, setKind] = useState<KindFilter>('ALL');
  const [categoryId, setCategoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<LedgerEntry | 'new' | null>(null);
  const filter: LedgerFilter = {
    kind: kind === 'ALL' ? undefined : kind,
    categoryId: categoryId || undefined,
    from: from || undefined,
    to: to || undefined,
  };
  const options = useOptions();
  const partners = usePartners({});
  const summary = useLedgerSummary(projectId, filter);
  const history = useLedgerEntries(projectId, filter);
  const labor = useLaborCost(projectId);
  const remove = useDeleteLedgerEntry();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const entries = history.data?.pages.flatMap((page) => page.items) ?? [];
  const categories = (options.data ?? []).filter((item) =>
    kind === 'ALL'
      ? item.kind === 'EXPENSE_CATEGORY' || item.kind === 'INCOME_CATEGORY'
      : item.kind === (kind === 'EXPENSE' ? 'EXPENSE_CATEGORY' : 'INCOME_CATEGORY'),
  );
  const categoryName = new Map((options.data ?? []).map((item) => [item.id, item.name]));
  const partnerName = new Map((partners.data ?? []).map((item) => [item.id, item.name]));
  const filtered = kind !== 'ALL' || Boolean(categoryId || from || to);

  const changeKind = (next: KindFilter) => {
    setKind(next);
    // 구분마다 분류 목록이 다르므로 선택한 분류 초기화
    setCategoryId('');
  };

  const handleDelete = async (entry: LedgerEntry) => {
    const ok = await confirm({
      title: `${formatDay(entry.entryDate)} ${LEDGER_KIND_LABELS[entry.kind]} ${wonText(entry.amount)}원 기록을 지울까요?`,
      description: '지우면 합계에서 빠지고 활동 기록에 남습니다',
      confirmLabel: '지우기',
      danger: true,
    });

    if (ok) remove.mutate(entry.id);
  };

  return (
    <div className="rounded-xl bg-surface-subtle p-4 md:p-5">
      {confirmDialog}
      <Section
        title="지출·수입"
        description="프로젝트에서 나간 돈과 가끔 생기는 수입(고철 판매 등)을 적습니다. 계약 금액·청구·입금은 다루지 않습니다"
        actions={
          <Button type="button" onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            지출·수입 기록
          </Button>
        }
      >
        <StatGroup
          items={[
            {
              label: filtered ? '지출 (조건에 맞는 것)' : '지출',
              value: wonText(summary.data?.expenseTotal ?? 0),
              unit: '원',
            },
            {
              label: '인건비 추정',
              value: labor.data ? wonText(labor.data.actual.totalAmount) : '-',
              unit: labor.data ? '원' : undefined,
              hint: '기록한 공수 × 직원 단가',
            },
            {
              label: filtered ? '수입 (조건에 맞는 것)' : '수입',
              value: wonText(summary.data?.incomeTotal ?? 0),
              unit: '원',
              tone: (summary.data?.incomeTotal ?? 0) > 0 ? 'success' : 'default',
            },
          ]}
        />

        <div className="flex flex-wrap items-end gap-3">
          <SegmentedControl
            aria-label="구분 보기"
            size="sm"
            className="w-auto"
            value={kind}
            onValueChange={changeKind}
            options={[
              { value: 'ALL', label: '전체' },
              { value: 'EXPENSE', label: '지출' },
              { value: 'INCOME', label: '수입' },
            ]}
          />
          <Select
            size="sm"
            className="w-40"
            aria-label="분류 보기"
            value={categoryId}
            onValueChange={setCategoryId}
            emptyLabel="모든 분류"
            placeholder="모든 분류"
            options={categories.map((item) => ({
              value: item.id,
              label: item.name,
              group:
                kind === 'ALL'
                  ? LEDGER_KIND_LABELS[item.kind === 'EXPENSE_CATEGORY' ? 'EXPENSE' : 'INCOME']
                  : undefined,
            }))}
          />
          <div className="flex w-full items-center gap-1.5 sm:w-auto">
            <DateInput
              size="sm"
              aria-label="시작일"
              className="min-w-0 flex-1 sm:w-40 sm:flex-none"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
            <span aria-hidden className="text-sub">
              ~
            </span>
            <DateInput
              size="sm"
              aria-label="끝일"
              className="min-w-0 flex-1 sm:w-40 sm:flex-none"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          {filtered && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setKind('ALL');
                setCategoryId('');
                setFrom('');
                setTo('');
              }}
            >
              조건 지우기
            </Button>
          )}
        </div>

        {summary.isError && <Alert>합계를 불러오지 못했습니다</Alert>}
        {remove.isError && <Alert>지우지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>}
        {history.isPending && <p className="text-sm">불러오는 중</p>}
        {history.isError && <Alert>내역을 불러오지 못했습니다</Alert>}
        {history.isSuccess && entries.length === 0 && (
          <EmptyState
            title={filtered ? '조건에 맞는 기록이 없습니다' : '아직 적은 지출·수입이 없습니다'}
            description={
              filtered ? '조건을 바꿔 보세요' : '부자재·장비·식대처럼 나간 돈을 적어 보세요'
            }
          />
        )}
        {entries.length > 0 && (
          <Table aria-label="지출·수입 내역" className="min-w-[36rem]">
            <TableHead>
              <TableRow>
                <TableHeaderCell>날짜</TableHeaderCell>
                <TableHeaderCell>구분</TableHeaderCell>
                <TableHeaderCell>분류</TableHeaderCell>
                <TableHeaderCell>내용</TableHeaderCell>
                <TableHeaderCell className="text-right">금액</TableHeaderCell>
                <TableHeaderCell className="relative">
                  <span className="sr-only">기록 작업</span>
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => {
                const label = `${formatDay(entry.entryDate)} ${entry.content ?? LEDGER_KIND_LABELS[entry.kind]}`;

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-sm text-sub">
                      {formatDay(entry.entryDate)}
                    </TableCell>
                    <TableCell>
                      <Badge tone={entry.kind === 'INCOME' ? 'success' : 'neutral'}>
                        {LEDGER_KIND_LABELS[entry.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sub">
                      {(entry.categoryId && categoryName.get(entry.categoryId)) || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{entry.content ?? '-'}</span>
                      {entry.partnerId && partnerName.get(entry.partnerId) && (
                        <span className="block text-xs text-sub">
                          {partnerName.get(entry.partnerId)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={
                        entry.kind === 'INCOME'
                          ? 'text-right font-semibold text-success tabular-nums'
                          : 'text-right font-semibold tabular-nums'
                      }
                    >
                      {entry.kind === 'INCOME' ? '+' : ''}
                      {wonText(entry.amount)}
                      <span className="ml-0.5 text-sub">원</span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`${label} 수정`}
                        onClick={() => setEditing(entry)}
                      >
                        수정
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${label} 지우기`}
                        onClick={() => void handleDelete(entry)}
                      >
                        <span className="text-sub">✕</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {history.hasNextPage && (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            disabled={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            {history.isFetchingNextPage ? '불러오는 중' : '더 보기'}
          </Button>
        )}
      </Section>

      <Modal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === 'new' || editing === null ? '지출·수입 기록' : '지출·수입 수정'}
        size="lg"
      >
        {editing !== null && (
          <LedgerEntryForm
            projectId={projectId}
            entry={editing === 'new' ? undefined : editing}
            defaultDate={today}
            defaultKind={kind === 'INCOME' ? 'INCOME' : 'EXPENSE'}
            maxDate={today}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
};
