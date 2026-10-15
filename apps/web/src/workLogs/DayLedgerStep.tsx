import { LEDGER_KIND_LABELS } from '@field-note/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Section } from '../components/ui/section';
import { LedgerEntryForm } from '../ledger/LedgerEntryForm';
import { useLedgerEntriesOnDate } from '../ledger/useLedger';

const wonText = (amount: number) => amount.toLocaleString('ko-KR');

// 하루 기록의 지출·수입 (08 문서 §6.2): 그날 나간 돈을 한 줄로 바로 추가한다. 전체 내역·수정은 비용·자재 메뉴
export const DayLedgerStep = ({
  projectId,
  date,
  today,
}: {
  projectId: string;
  date: string;
  today: string;
}) => {
  const entries = useLedgerEntriesOnDate(projectId, date);
  const [open, setOpen] = useState(false);
  const expense = (entries.data ?? [])
    .filter((entry) => entry.kind === 'EXPENSE')
    .reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="rounded-xl bg-surface-subtle p-4 md:p-5">
      <Section
        title="이 날 비용"
        description="그날 나간 돈(부자재·식대 등)을 한 줄로 남깁니다"
        actions={
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            <Plus aria-hidden />
            비용 추가
          </Button>
        }
      >
        {entries.isError && <Alert>비용 기록을 불러오지 못했습니다</Alert>}
        {entries.isSuccess && entries.data.length === 0 && (
          <p className="text-sm text-foreground/70">이 날 적은 비용이 없습니다</p>
        )}
        {entries.isSuccess && entries.data.length > 0 && (
          <>
            <ul className="flex flex-col divide-y divide-line">
              {entries.data.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-foreground/65">{LEDGER_KIND_LABELS[entry.kind]}</span>{' '}
                    {entry.content ?? '-'}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {entry.kind === 'INCOME' ? '+' : ''}
                    {wonText(entry.amount)}원
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-foreground/75">이 날 지출 {wonText(expense)}원</p>
          </>
        )}
      </Section>

      <Modal open={open} onOpenChange={setOpen} title="비용 추가" size="lg">
        {open && (
          <LedgerEntryForm
            projectId={projectId}
            defaultDate={date}
            maxDate={today}
            onDone={() => setOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
};
