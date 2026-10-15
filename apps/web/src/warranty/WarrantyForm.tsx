import {
  WARRANTY_MONTHS_MAX,
  WARRANTY_REASON_MAX_LENGTH,
  WARRANTY_START_BASES,
  WARRANTY_START_BASIS_LABELS,
  computeWarrantyEnd,
  resolveWarrantyUpdate,
  warrantyUpdateSchema,
  type ProjectDetail,
  type ProjectWarranty,
  type WarrantyStartBasis,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { splitServerErrors } from '../lib/serverErrors';

import { useSaveWarranty } from './useWarranty';

const FIELDS = ['months', 'startBasis', 'startOn', 'endOn', 'reason', 'projectId'] as const;

// 보증 설정: 기간(개월)과 시작 기준을 정하면 종료 예정일 계산, 이미 설정이 있거나 종료 예정일을 직접 바꾸면 사유 기록
export const WarrantyForm = ({
  project,
  warranty,
  editable,
}: {
  project: ProjectDetail;
  warranty: ProjectWarranty;
  editable: boolean;
}) => {
  const save = useSaveWarranty(project.id);
  const [months, setMonths] = useState(String(warranty.months));
  const [startBasis, setStartBasis] = useState<WarrantyStartBasis>(warranty.startBasis);
  const [startOn, setStartOn] = useState(
    warranty.startBasis === 'ACTUAL_END' ? '' : (warranty.startOn ?? ''),
  );
  const [endOn, setEndOn] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');
  const [saved, setSaved] = useState('');
  const monthsNumber = months.trim() === '' ? Number.NaN : Number(months);
  const effectiveStart = startBasis === 'ACTUAL_END' ? project.actualEnd : startOn || null;
  // 입력 중에 계산되는 종료 예정일을 바로 보여 준다 (직접 지정한 값이 있으면 그 값)
  const preview =
    Number.isInteger(monthsNumber) && monthsNumber >= 0 && effectiveStart
      ? monthsNumber === 0
        ? effectiveStart
        : endOn || computeWarrantyEnd(effectiveStart, monthsNumber)
      : null;
  const needsReason = warranty.configured || (monthsNumber > 0 && endOn !== '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');
    setSaved('');

    // 서버와 같은 공유 규칙으로 먼저 검사해 입력칸 옆에 바로 보여 줌
    const parsed = warrantyUpdateSchema.safeParse({
      months: monthsNumber,
      startBasis,
      ...(startBasis === 'ACTUAL_END' ? {} : { startOn: startOn || null }),
      ...(endOn ? { endOn } : {}),
      reason: reason.trim() || null,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] ??= issue.message;
      }

      setErrors(next);
      return;
    }

    const checked = resolveWarrantyUpdate({
      input: parsed.data,
      actualEnd: project.actualEnd,
      hasRecord: warranty.configured,
    });

    if (!checked.ok) {
      setErrors({ [checked.path]: checked.message });
      return;
    }

    void save
      .mutateAsync(parsed.data)
      .then(() => {
        setEndOn('');
        setReason('');
        setSaved('보증 설정을 저장했습니다');
      })
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, FIELDS);

        setErrors(byField);
        setRootError(root || byField.projectId || '');
      });
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate aria-label="보증 설정">
      {rootError && <Alert>{rootError}</Alert>}
      {saved && <p role="status">{saved}</p>}
      <FormField
        label="보증 기간 (개월)"
        error={errors.months}
        hint={`0이면 보증 없음 · 최대 ${WARRANTY_MONTHS_MAX}개월 · 회사 기본값은 ${warranty.defaultMonths}개월`}
      >
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={WARRANTY_MONTHS_MAX}
          value={months}
          disabled={!editable}
          onChange={(event) => setMonths(event.target.value)}
        />
      </FormField>
      <FormField label="시작 기준" error={errors.startBasis}>
        <Select
          value={startBasis}
          disabled={!editable}
          onValueChange={setStartBasis}
          options={WARRANTY_START_BASES.map((value) => ({
            value: value,
            label: WARRANTY_START_BASIS_LABELS[value],
          }))}
        />
      </FormField>
      {startBasis === 'ACTUAL_END' ? (
        <p className="text-sm text-foreground/70">
          시작일: {project.actualEnd ?? '아직 완료 전'} (프로젝트 실제 완료일)
        </p>
      ) : (
        <FormField
          label={`${WARRANTY_START_BASIS_LABELS[startBasis]}(시작일)`}
          error={errors.startOn}
        >
          <DateInput
            value={startOn}
            disabled={!editable}
            onChange={(event) => setStartOn(event.target.value)}
          />
        </FormField>
      )}
      {monthsNumber !== 0 && (
        <FormField
          label="종료 예정일 직접 지정 (선택)"
          error={errors.endOn}
          hint="비우면 시작일 + 보증 기간으로 계산합니다. 재보수로 연장할 때 입력하며 사유가 필요합니다"
        >
          <DateInput
            value={endOn}
            disabled={!editable}
            onChange={(event) => setEndOn(event.target.value)}
          />
        </FormField>
      )}
      <p className="text-sm font-medium">종료 예정일: {preview ?? '-'}</p>
      <FormField
        label={needsReason ? '변경 사유 (필수)' : '변경 사유 (선택)'}
        error={errors.reason}
      >
        <Textarea
          maxLength={WARRANTY_REASON_MAX_LENGTH}
          value={reason}
          disabled={!editable}
          onChange={(event) => setReason(event.target.value)}
        />
      </FormField>
      {editable && (
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? '저장 중' : '보증 설정 저장'}
        </Button>
      )}
    </form>
  );
};
