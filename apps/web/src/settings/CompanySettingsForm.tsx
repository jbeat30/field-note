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
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Select } from '../components/ui/select';
import { getErrorMessage } from '../lib/apiError';
import { cn } from '../lib/cn';
import { hoursToMinutes, minutesToHours } from '../lib/workTime';

import { useCompanySettings, useSaveCompanySettings } from './useCompanySettings';
import { LoadingBlock } from '../components/ui/loading-block';

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

const WORK_UNIT_OPTIONS: {
  value: WorkUnitMode;
  title: string;
  description: string;
  example: string;
}[] = [
  {
    value: 'RATIO',
    title: '비율',
    description: '하루를 1.0으로 입력합니다',
    example: '예: 1.5는 연장 근무',
  },
  {
    value: 'HOURS',
    title: '시간',
    description: '실제 근무 시간을 입력합니다',
    example: '예: 8시간 + 4시간',
  },
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
    return <LoadingBlock label="회사 설정을 불러오는 중" variant="page" />;
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
    <form
      className="flex flex-col gap-5 rounded-[30px] bg-surface-subtle p-5 sm:p-7"
      onSubmit={onSubmit}
      noValidate
      aria-label="회사 기준값"
    >
      {errors.root && <Alert>{errors.root.message}</Alert>}
      {isSaved && <Alert variant="info">저장했습니다</Alert>}

      <section className="flex flex-col gap-4" aria-labelledby="hours-heading">
        <div className="flex flex-col gap-1">
          <h3 id="hours-heading" className="text-[17px] font-extrabold tracking-tight">
            하루 기준시간
          </h3>
          <p className="text-sm text-sub">
            공수 1.0에 해당하는 시간입니다. 바꿔도 이미 기록된 공수는 변하지 않습니다
          </p>
        </div>
        <FormField
          className="sm:max-w-xs"
          label="하루 기준시간 (시간)"
          error={errors.standardWorkHours?.message}
        >
          <Input
            placeholder="예: 8"
            type="number"
            inputMode="decimal"
            step="0.5"
            {...register('standardWorkHours', { valueAsNumber: true })}
          />
        </FormField>
      </section>

      <hr className="border-line" />

      <section className="flex flex-col gap-4" aria-labelledby="mm-heading">
        <div className="flex flex-col gap-1">
          <h3 id="mm-heading" className="text-[17px] font-extrabold tracking-tight">
            월 기준일수
          </h3>
          <p className="text-sm text-sub">
            1MM(맨먼스)을 몇 일(MD)로 볼지 정합니다. 현장은 공휴일에도 일하므로 공휴일 달력은 쓰지
            않고, 근무 형태별 연평균으로 계산합니다
          </p>
        </div>
        <div className="grid items-start gap-x-4 gap-y-4 sm:grid-cols-2">
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
              placeholder="예: 26"
              type="number"
              inputMode="decimal"
              step="0.1"
              {...register('monthlyWorkDays', { valueAsNumber: true })}
            />
          </FormField>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--surface-nested)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-bold">
              이 값이면 1MM = {Number.isFinite(days) ? days : '-'}일, 하루{' '}
              {Number.isFinite(hours) ? hours : '-'}시간 기준으로{' '}
              {Number.isFinite(days) && Number.isFinite(hours) ? roundText(days * hours) : '-'}
              시간입니다
            </p>
            <a
              className="text-sub hover:text-foreground"
              href="https://www.law.go.kr/법령/근로기준법"
              target="_blank"
              rel="noopener noreferrer"
            >
              근거: 월 환산 209시간(주 40시간 + 주휴 8시간) ÷ 8시간 ≈ 26.1일 (근로기준법)
            </a>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 self-start sm:self-center"
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

      <hr className="border-line" />

      <section className="flex flex-col gap-4" aria-labelledby="mode-heading">
        <div className="flex flex-col gap-1">
          <h3 id="mode-heading" className="text-[17px] font-extrabold tracking-tight">
            공수 입력 방식
          </h3>
          <p className="text-sm text-sub">
            작업일 입력에서 사람마다 일한 양을 어떻게 적을지 정합니다
          </p>
        </div>
        <Controller
          control={control}
          name="workUnitMode"
          render={({ field }) => (
            <RadioGroup
              value={field.value ?? 'RATIO'}
              onValueChange={field.onChange}
              aria-label="공수 입력 방식"
              className="grid gap-3 sm:grid-cols-2"
            >
              {WORK_UNIT_OPTIONS.map((option) => {
                const isChecked = (field.value ?? 'RATIO') === option.value;

                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors',
                      isChecked
                        ? 'border-foreground bg-surface'
                        : 'border-input-border bg-transparent hover:border-foreground',
                    )}
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{option.title}</span>
                      <span className="text-sm">{option.description}</span>
                      <span className="text-[13px] text-sub">{option.example}</span>
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          )}
        />
      </section>

      <div className="flex justify-end">
        <Button
          type="submit"
          className="h-14 rounded-[17px] px-10 text-base font-extrabold"
          disabled={!isDirty || save.isPending}
        >
          {save.isPending ? '저장 중' : '저장'}
        </Button>
      </div>
    </form>
  );
};

// 소수 첫째 자리까지 (부동소수 오차 정리)
const roundText = (value: number) => Math.round(value * 10) / 10;
