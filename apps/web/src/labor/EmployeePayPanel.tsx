import {
  PAY_AMOUNT_LABELS,
  PAY_TYPES,
  PAY_TYPE_LABELS,
  payRateCreateSchema,
  ratePerMinute,
  todayInSeoul,
  type CompanySettings,
  type PayRate,
  type PayType,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { DateInput } from '../components/ui/date-input';
import { Select } from '../components/ui/select';
import { splitServerErrors } from '../lib/serverErrors';
import { useCompanySettings } from '../settings/useCompanySettings';

import { formatWon } from './formatMoney';
import { useAddPayRate, usePayRates } from './useLabor';

// 단가 변경 폼: 종류·금액·적용 시작일, 이력은 수정 없이 새로 추가
export const PayRateForm = ({
  employeeId,
  onSaved,
}: {
  employeeId: string;
  onSaved?: () => void;
}) => {
  const add = useAddPayRate(employeeId);
  const today = todayInSeoul(new Date());
  const [payType, setPayType] = useState<PayType>('DAILY');
  const [amount, setAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');

    // 서버와 같은 공유 스키마로 먼저 검사해 입력칸 옆에 바로 보여 줌
    const parsed = payRateCreateSchema.safeParse({
      payType,
      amount: amount.trim() === '' ? Number.NaN : Number(amount),
      effectiveFrom,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] ??=
          issue.path[0] === 'amount' && amount.trim() === ''
            ? '금액을 입력해 주세요'
            : issue.message;
      }

      setErrors(next);
      return;
    }

    void add
      .mutateAsync(parsed.data)
      .then(() => {
        setAmount('');
        setEffectiveFrom(today);
        onSaved?.();
      })
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, ['payType', 'amount', 'effectiveFrom']);

        setErrors(byField);
        setRootError(root);
      });
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate aria-label="단가 변경">
      {rootError && <Alert>{rootError}</Alert>}
      <FormField label="단가 종류" error={errors.payType}>
        <Select
          value={payType}
          onValueChange={setPayType}
          options={PAY_TYPES.map((type) => ({ value: type, label: PAY_TYPE_LABELS[type] }))}
        />
      </FormField>
      <FormField label={PAY_AMOUNT_LABELS[payType]} error={errors.amount}>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </FormField>
      <FormField label="적용 시작일" error={errors.effectiveFrom}>
        <DateInput
          value={effectiveFrom}
          onChange={(event) => setEffectiveFrom(event.target.value)}
        />
      </FormField>
      <p className="text-sm text-sub">
        이 날짜에 일한 공수부터 새 단가로 계산됩니다. 이전 날짜는 기존 단가 그대로입니다
      </p>
      <Button type="submit" disabled={add.isPending}>
        {add.isPending ? '저장 중' : '단가 저장'}
      </Button>
    </form>
  );
};

// 일 환산 (시급제·월급제·연봉제일 때): 회사 설정의 하루 기준시간·월 기준일수로 계산
const dailyEquivalent = (rate: PayRate, settings: CompanySettings) =>
  rate.payType === 'DAILY'
    ? null
    : Math.round(ratePerMinute(rate, settings) * settings.standardWorkMinutes);

// 직원 카드의 단가 탭 (09): 현재 단가 강조, 일 환산, 변경 이력 타임라인, 이력은 수정 없이 추가하며 `단가 변경`은 창에서 수행
export const EmployeePayPanel = ({ employeeId }: { employeeId: string }) => {
  const rates = usePayRates(employeeId);
  const settings = useCompanySettings();
  const [open, setOpen] = useState(false);

  if (rates.isError || settings.isError) {
    return <Alert>단가를 불러오지 못했습니다</Alert>;
  }

  if (!rates.data || !settings.data) {
    return <p className="text-sm">단가를 불러오는 중</p>;
  }

  const today = todayInSeoul(new Date());
  // 적용 시작일이 오늘 이후인 단가는 "예정"이므로 지금 단가는 오늘까지 시작한 것 중 가장 최근
  const active = rates.data.find((rate) => rate.effectiveFrom <= today);
  const daily = active ? dailyEquivalent(active, settings.data) : null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="pay-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="pay-heading" className="text-lg font-bold">
            단가
          </h2>
          <p className="text-sm text-sub">
            프로젝트 인건비 추정에만 쓰입니다. 단가를 바꾸면 변경 기록으로 남습니다
          </p>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          단가 변경
        </Button>
      </div>

      {active ? (
        <div className="flex flex-col gap-1 rounded-3xl bg-surface-subtle p-5">
          <span className="text-sm text-sub">현재 단가</span>
          <span className="text-3xl font-bold tabular-nums">
            {formatWon(active.amount)}
            <span className="ml-2 text-base font-medium text-sub">
              {PAY_TYPE_LABELS[active.payType]}
            </span>
          </span>
          {daily !== null && (
            <span className="text-sm text-sub">
              일 환산 약 {formatWon(daily)} (하루 {settings.data.standardWorkMinutes / 60}시간 기준)
            </span>
          )}
          <span className="text-sm text-sub">{active.effectiveFrom}부터 적용</span>
        </div>
      ) : (
        <p className="rounded-3xl bg-surface-subtle p-5 text-sub">
          {rates.data.length > 0 ? '적용 중인 단가가 없습니다' : '등록된 단가가 없습니다'}
        </p>
      )}

      {rates.data.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">단가 변경 이력</h3>
          <ol className="flex flex-col border-l-2 border-line pl-4">
            {rates.data.map((rate) => (
              <li key={rate.id} className="relative flex flex-col gap-0.5 pb-4 text-sm last:pb-0">
                <span
                  aria-hidden
                  className={`absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full ${rate.id === active?.id ? 'bg-primary' : 'bg-line'}`}
                />
                <span className="font-semibold tabular-nums">
                  {formatWon(rate.amount)}{' '}
                  <span className="font-normal text-sub">{PAY_TYPE_LABELS[rate.payType]}</span>
                  {rate.effectiveFrom > today && (
                    <span className="ml-2 text-xs font-normal text-primary">적용 예정</span>
                  )}
                </span>
                <span className="text-sub">
                  {rate.effectiveFrom}부터 · {rate.createdAt.slice(0, 10)}에 입력
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <Modal open={open} onOpenChange={setOpen} title="단가 변경">
        {open && <PayRateForm employeeId={employeeId} onSaved={() => setOpen(false)} />}
      </Modal>
    </section>
  );
};
