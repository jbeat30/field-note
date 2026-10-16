import {
  LEDGER_AMOUNT_MAX,
  LEDGER_CONTENT_MAX_LENGTH,
  LEDGER_KIND_LABELS,
  LEDGER_KINDS,
  type LedgerEntry,
  type LedgerKind,
  type OptionKind,
} from '@field-note/shared';
import { useState } from 'react';

import { useChangeWorks } from '../changeWorks/useChangeWorks';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { DateInput } from '../components/ui/date-input';
import { FormField } from '../components/ui/form-field';
import { FormNotice } from '../components/ui/form-notice';
import { Input } from '../components/ui/input';
import { MoneyInput } from '../components/ui/money-input';
import { SegmentedControl } from '../components/ui/segmented-control';
import { Select } from '../components/ui/select';
import { useDocuments } from '../documents/useDocuments';
import { usePartners } from '../partners/usePartners';
import { useOptions } from '../settings/useOptions';

import { useCreateLedgerEntry, useUpdateLedgerEntry } from './useLedger';

// 구분마다 쓰는 분류 목록이 다름 (서버와 같은 규칙)
export const LEDGER_CATEGORY_KIND: Record<LedgerKind, OptionKind> = {
  EXPENSE: 'EXPENSE_CATEGORY',
  INCOME: 'INCOME_CATEGORY',
};

type Props = {
  projectId: string;
  // 있으면 수정, 없으면 새 기록
  entry?: LedgerEntry;
  defaultDate: string;
  defaultKind?: LedgerKind;
  maxDate: string;
  onDone: () => void;
};

// 지출·수입 한 건 입력 (08 문서 §6.2): 지출이 기본이고 수입은 구분 단추로 전환, 분류·거래처·추가 공사·증빙 문서는 선택
export const LedgerEntryForm = ({
  projectId,
  entry,
  defaultDate,
  defaultKind = 'EXPENSE',
  maxDate,
  onDone,
}: Props) => {
  const options = useOptions();
  const partners = usePartners({});
  const changeWorks = useChangeWorks(projectId);
  const documents = useDocuments(projectId);
  const create = useCreateLedgerEntry(projectId);
  const update = useUpdateLedgerEntry();
  const [kind, setKind] = useState<LedgerKind>(entry?.kind ?? defaultKind);
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? defaultDate);
  const [amount, setAmount] = useState<number | null>(entry?.amount ?? null);
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [partnerId, setPartnerId] = useState(entry?.partnerId ?? '');
  const [changeWorkId, setChangeWorkId] = useState(entry?.changeWorkId ?? '');
  const [documentId, setDocumentId] = useState(entry?.documentId ?? '');
  const [notice, setNotice] = useState<string | null>(null);

  const categories = (options.data ?? []).filter(
    (item) =>
      item.kind === LEDGER_CATEGORY_KIND[kind] && (item.isActive || item.id === entry?.categoryId),
  );
  const saving = create.isPending || update.isPending;
  const failed = create.isError || update.isError;

  const changeKind = (next: LedgerKind) => {
    setKind(next);
    // 구분마다 분류 목록이 다르므로 이전 구분의 분류 초기화
    setCategoryId('');
  };

  const submit = async () => {
    if (!entryDate) return setNotice('날짜를 입력해 주세요');
    if (amount === null || amount < 1) return setNotice('금액을 입력해 주세요');
    if (amount > LEDGER_AMOUNT_MAX) return setNotice('금액이 너무 큽니다');

    setNotice(null);

    try {
      if (entry) {
        await update.mutateAsync({
          id: entry.id,
          body: {
            entryDate,
            kind,
            amount,
            categoryId: categoryId || null,
            content: content.trim() || null,
            partnerId: partnerId || null,
            changeWorkId: changeWorkId || null,
            documentId: documentId || null,
          },
        });
      } else {
        await create.mutateAsync({
          entryDate,
          kind,
          amount,
          categoryId: categoryId || undefined,
          content: content.trim() || undefined,
          partnerId: partnerId || undefined,
          changeWorkId: changeWorkId || undefined,
          documentId: documentId || undefined,
        });
      }

      onDone();
    } catch {
      // 저장 오류는 아래 Alert로 안내
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <SegmentedControl
        aria-label="구분"
        value={kind}
        onValueChange={changeKind}
        options={LEDGER_KINDS.map((value) => ({ value, label: LEDGER_KIND_LABELS[value] }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="날짜">
          <DateInput
            value={entryDate}
            max={maxDate}
            onChange={(event) => setEntryDate(event.target.value)}
          />
        </FormField>
        <FormField label="금액">
          <MoneyInput value={amount} onValueChange={setAmount} placeholder="0" />
        </FormField>
        <FormField label="분류">
          <Select
            value={categoryId}
            onValueChange={setCategoryId}
            emptyLabel="분류 안 함"
            placeholder="분류 안 함"
            options={categories.map((item) => ({ value: item.id, label: item.name }))}
          />
        </FormField>
        <FormField label="거래처">
          <Select
            value={partnerId}
            onValueChange={setPartnerId}
            emptyLabel="선택 안 함"
            placeholder="선택 안 함"
            options={(partners.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
        </FormField>
      </div>

      <FormField label="내용·메모">
        <Input
          value={content}
          maxLength={LEDGER_CONTENT_MAX_LENGTH}
          placeholder={kind === 'EXPENSE' ? '예: 실리콘 코킹 20개' : '예: 철거 고철 판매'}
          onChange={(event) => setContent(event.target.value)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="추가 공사 연결" hint="추가 공사에 들어간 돈이면 골라 주세요">
          <Select
            value={changeWorkId}
            onValueChange={setChangeWorkId}
            emptyLabel="연결 안 함"
            placeholder="연결 안 함"
            options={(changeWorks.data ?? []).map((item) => ({
              value: item.id,
              label: `#${item.seq} ${item.content}`,
            }))}
          />
        </FormField>
        <FormField label="증빙 문서" hint="영수증은 문서함에 올린 뒤 고릅니다">
          <Select
            value={documentId}
            onValueChange={setDocumentId}
            emptyLabel="연결 안 함"
            placeholder="연결 안 함"
            options={(documents.data ?? []).map((item) => ({
              value: item.id,
              label: item.title,
            }))}
          />
        </FormField>
      </div>

      <FormNotice message={notice} />
      {failed && <Alert>저장하지 못했습니다. 입력을 확인하고 다시 시도해 주세요</Alert>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          취소
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? '저장 중' : entry ? '수정 저장' : '저장'}
        </Button>
      </div>
    </form>
  );
};
