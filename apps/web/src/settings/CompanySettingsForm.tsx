import {
  DEFAULT_COMPANY_SETTINGS,
  WORK_PATTERNS,
  type WorkUnitMode,
  VALIDATION_MESSAGES,
} from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { SegmentedControl } from '../components/ui/segmented-control';
import { Select } from '../components/ui/select';
import { getErrorMessage } from '../lib/apiError';
import { hoursToMinutes, minutesToHours } from '../lib/workTime';

import { useCompanySettings, useSaveCompanySettings } from './useCompanySettings';

const formSchema = z.object({
  standardWorkHours: z
    .number('숫자를 입력해 주세요')
    .min(1, VALIDATION_MESSAGES.WORK_HOURS_MIN)
    .max(16, VALIDATION_MESSAGES.WORK_HOURS_MAX)
    .refine((hours) => Number.isInteger(hours * 2), VALIDATION_MESSAGES.WORK_HOURS_STEP_HALF),
  monthlyWorkDays: z
    .number('숫자를 입력해 주세요')
    .min(1, VALIDATION_MESSAGES.MONTH_DAYS_MIN)
    .max(31, VALIDATION_MESSAGES.MONTH_DAYS_MAX)
    .refine((days) => Math.round(days * 10) / 10 === days, VALIDATION_MESSAGES.DECIMAL_ONE_PLACE),
  workUnitMode: z.enum(['RATIO', 'HOURS']),
});

type Form = z.infer<typeof formSchema>;

const WORK_UNIT_OPTIONS: { value: WorkUnitMode; label: string }[] = [
  { value: 'RATIO', label: '비율 — 하루를 1.0으로 입력 (예: 1.5는 연장 근무)' },
  { value: 'HOURS', label: '시간 — 실제 근무 시간을 입력 (예: 8시간 + 4시간)' },
];

const CUSTOM = 'CUSTOM';

// 근무 형태 옆에 붙는 덧말
const PATTERN_NOTE: Record<string, string> = { SIX_DAYS: ' (현장 기본)' };

const PATTERN_OPTIONS = [
  ...WORK_PATTERNS.map((item) => ({
    value: item.key as string,
    label: `${item.label} ${item.days}일${PATTERN_NOTE[item.key] ?? ''}`,
  })),
  { value: CUSTOM, label: '직접 입력' },
];

// 월 기준일수가 근무 형태 표준값과 같으면 그 형태, 아니면 직접 입력
const patternOf = (days: number | undefined) =>
  WORK_PATTERNS.find((item) => item.days === days)?.key ?? CUSTOM;

const card = 'flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5';

// 회사 관리의 기준값: 하루 기준시간 · 월 기준일수(MM 환산 기준) · 공수 입력 방식 (저장은 분 단위라 바꿔도 과거 기록은 변하지 않음)
export const CompanySettingsForm = () => {
  const settings = useCompanySettings();
  const save = useSaveCompanySettings();
  const [isSaved, setSaved] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<Form>({
    resolver: zodResolver(formSchema),
    // 서버 값이 도착하면 폼에 채움
    values: settings.data && {
      standardWorkHours: minutesToHours(settings.data.standardWorkMinutes),
      monthlyWorkDays: settings.data.monthlyWorkDays,
      workUnitMode: settings.data.workUnitMode,
    },
  });
  const days = useWatch({ control, name: 'monthlyWorkDays' });
  const hours = useWatch({ control, name: 'standardWorkHours' });

  if (settings.isPending) {
    return <p className="text-sm">회사 설정을 불러오는 중</p>;
  }

  if (settings.isError) {
    return <Alert>회사 설정을 불러오지 못했습니다</Alert>;
  }

  const pattern = patternOf(days);
  const choosePattern = (key: string) => {
    const found = WORK_PATTERNS.find((item) => item.key === key);

    // 직접 입력을 고르면 현재 값을 그대로 두고 수정 가능
    if (found) setValue('monthlyWorkDays', found.days, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false);

    try {
      const saved = await save.mutateAsync({
        standardWorkMinutes: hoursToMinutes(values.standardWorkHours),
        monthlyWorkDays: values.monthlyWorkDays,
        workUnitMode: values.workUnitMode,
      });

      reset({
        standardWorkHours: minutesToHours(saved.standardWorkMinutes),
        monthlyWorkDays: saved.monthlyWorkDays,
        workUnitMode: saved.workUnitMode,
      });
      setSaved(true);
    } catch (error) {
      setError('root', { message: getErrorMessage(error) });
    }
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate aria-label="회사 기준값">
      {errors.root && <Alert>{errors.root.message}</Alert>}
      {isSaved && <Alert variant="info">저장했습니다</Alert>}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className={card} aria-labelledby="hours-heading">
          <h3 id="hours-heading" className="text-base font-bold">
            하루 기준시간
          </h3>
          <FormField
            label="하루 기준시간 (시간)"
            hint="공수 1.0에 해당하는 시간입니다. 바꿔도 이미 기록된 공수는 변하지 않습니다"
            error={errors.standardWorkHours?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              {...register('standardWorkHours', { valueAsNumber: true })}
            />
          </FormField>
        </section>

        <section className={card} aria-labelledby="mm-heading">
          <h3 id="mm-heading" className="text-base font-bold">
            월 기준일수 (MM 환산 기준)
          </h3>
          <p className="text-sm text-sub">
            1MM(맨먼스)을 몇 일(MD)로 볼지 정합니다. 현장은 공휴일에도 일하므로 공휴일 달력은 쓰지
            않고, 근무 형태별 연평균으로 계산합니다
          </p>
          <FormField label="근무 형태">
            <Select
              value={pattern}
              onValueChange={choosePattern}
              options={PATTERN_OPTIONS}
              aria-label="근무 형태"
            />
          </FormField>
          <FormField
            label="월 기준일수 (일)"
            hint="소수 첫째 자리까지 입력할 수 있습니다 (예: 21.7)"
            error={errors.monthlyWorkDays?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              {...register('monthlyWorkDays', { valueAsNumber: true })}
            />
          </FormField>
          <p className="text-sm text-sub">
            이 값이면 1MM = {Number.isFinite(days) ? days : '-'}일, 하루{' '}
            {Number.isFinite(hours) ? hours : '-'}시간 기준으로{' '}
            {Number.isFinite(days) && Number.isFinite(hours) ? roundText(days * hours) : '-'}
            시간입니다
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a
              className="text-sm text-primary hover:text-sub"
              href="https://www.law.go.kr/법령/근로기준법"
              target="_blank"
              rel="noopener noreferrer"
            >
              근거: 월 환산 209시간(주 40시간 + 주휴 8시간) ÷ 8시간 ≈ 26.1일 (근로기준법)
            </a>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setValue('monthlyWorkDays', DEFAULT_COMPANY_SETTINGS.monthlyWorkDays, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              표준값({DEFAULT_COMPANY_SETTINGS.monthlyWorkDays}일)으로
            </Button>
          </div>
        </section>
      </div>
      <section className="flex flex-col gap-3" aria-labelledby="mode-heading">
        <h3 id="mode-heading" className="text-lg font-bold">
          공수 입력 방식
        </h3>
        <Controller
          control={control}
          name="workUnitMode"
          render={({ field }) => (
            <SegmentedControl
              value={field.value}
              onValueChange={field.onChange}
              aria-label="공수 입력 방식"
              options={WORK_UNIT_OPTIONS}
              className="w-fit max-w-full max-md:flex-col max-md:rounded-3xl"
            />
          )}
        />
      </section>
      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || save.isPending}>
          {save.isPending ? '저장 중' : '저장'}
        </Button>
      </div>
    </form>
  );
};

// 소수 첫째 자리까지 (부동소수 오차 정리)
const roundText = (value: number) => Math.round(value * 10) / 10;
