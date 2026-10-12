import {
  PAY_AMOUNT_LABELS,
  PAY_TYPES,
  PAY_TYPE_LABELS,
  payRateCreateSchema,
  todayInSeoul,
  type PayType,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { formatDay } from '../lib/dates';
import { splitServerErrors } from '../lib/serverErrors';

import { formatWon } from './formatMoney';
import { useAddPayRate, usePayRates } from './useLabor';

const PayRateForm = ({ employeeId }: { employeeId: string }) => {
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
        <Select value={payType} onChange={(event) => setPayType(event.target.value as PayType)}>
          {PAY_TYPES.map((type) => (
            <option key={type} value={type}>
              {PAY_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
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
        <Input
          type="date"
          value={effectiveFrom}
          onChange={(event) => setEffectiveFrom(event.target.value)}
        />
      </FormField>
      <p className="text-sm text-foreground/70">
        이 날짜에 일한 공수부터 새 단가로 계산됩니다. 이전 날짜는 기존 단가 그대로입니다
      </p>
      <Button type="submit" disabled={add.isPending}>
        {add.isPending ? '저장 중' : '단가 저장'}
      </Button>
    </form>
  );
};

// 직원 단가표 (민감 정보): 일급·시급·월급·연봉 중 하나와 적용 시작일, 변경 이력. 이력은 고치지 않고 새로 추가한다
export const EmployeePayPanel = ({ employeeId }: { employeeId: string }) => {
  const rates = usePayRates(employeeId);

  if (rates.isError) {
    return <Alert>단가를 불러오지 못했습니다</Alert>;
  }

  if (!rates.data) {
    return <p className="text-sm">단가를 불러오는 중</p>;
  }

  const [current, ...older] = rates.data;
  const today = todayInSeoul(new Date());
  // 적용 시작일이 오늘 이후인 단가는 "예정"이므로 지금 단가는 오늘까지 시작한 것 중 가장 최근
  const active = rates.data.find((rate) => rate.effectiveFrom <= today);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="pay-heading">
      <h2 id="pay-heading" className="text-lg font-bold">
        단가
      </h2>
      <p className="text-sm text-foreground/70">
        프로젝트 인건비 추정에만 쓰입니다. 조회와 변경은 기록으로 남습니다
      </p>

      {active ? (
        <p>
          <span className="text-foreground/70">현재 </span>
          <span className="font-bold">
            {PAY_TYPE_LABELS[active.payType]} {formatWon(active.amount)}
          </span>
        </p>
      ) : (
        <p className="text-foreground/70">
          {current ? '적용 중인 단가가 없습니다' : '등록된 단가가 없습니다'}
        </p>
      )}

      <PayRateForm employeeId={employeeId} />

      {current && (
        <div className="flex flex-col gap-1">
          <h3 className="font-medium">단가 변경 이력</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {[current, ...older].map((rate) => (
              <li key={rate.id}>
                {formatDay(rate.effectiveFrom)}부터 · {PAY_TYPE_LABELS[rate.payType]}{' '}
                <span className="font-bold">{formatWon(rate.amount)}</span>
                {rate.effectiveFrom > today ? ' (적용 예정)' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
