import { type Device, type WorkUnitMode } from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';

import { logout } from '../api/logout';
import { useMe } from '../auth/useMe';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { getErrorMessage } from '../lib/apiError';
import { hoursToMinutes, minutesToHours } from '../lib/workTime';
import { useCompanySettings, useSaveCompanySettings } from '../settings/useCompanySettings';
import { useDevices, useRevokeDevice } from '../settings/useDevices';

const settingsFormSchema = z.object({
  standardWorkHours: z
    .number('숫자를 입력해 주세요')
    .min(1, '1시간 이상 입력해 주세요')
    .max(16, '16시간 이하로 입력해 주세요')
    .refine((hours) => Number.isInteger(hours * 2), '0.5시간 단위로 입력해 주세요'),
  monthlyWorkDays: z
    .number('숫자를 입력해 주세요')
    .int('정수로 입력해 주세요')
    .min(1, '1일 이상 입력해 주세요')
    .max(31, '31일 이하로 입력해 주세요'),
  workUnitMode: z.enum(['RATIO', 'HOURS']),
});

type SettingsForm = z.infer<typeof settingsFormSchema>;

const WORK_UNIT_OPTIONS: { value: WorkUnitMode; label: string; description: string }[] = [
  { value: 'RATIO', label: '비율', description: '하루를 1.0으로 입력합니다 (예: 1.5는 연장 근무)' },
  { value: 'HOURS', label: '시간', description: '실제 근무 시간을 입력합니다 (예: 8시간 + 4시간)' },
];

// 회사 설정: 공수 계산 기준 (저장은 항상 분 단위이므로 바꿔도 과거 기록은 변하지 않음)
const CompanySettingsSection = () => {
  const settings = useCompanySettings();
  const save = useSaveCompanySettings();
  const [isSaved, setSaved] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsFormSchema),
    // 서버 값이 도착하면 폼에 채움
    values: settings.data && {
      standardWorkHours: minutesToHours(settings.data.standardWorkMinutes),
      monthlyWorkDays: settings.data.monthlyWorkDays,
      workUnitMode: settings.data.workUnitMode,
    },
  });

  if (settings.isPending) {
    return <p className="text-sm">회사 설정을 불러오는 중</p>;
  }

  if (settings.isError) {
    return <Alert>회사 설정을 불러오지 못했습니다</Alert>;
  }

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
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      {isSaved && <Alert variant="info">저장했습니다</Alert>}
      <FormField
        label="하루 기준시간 (시간)"
        hint="공수 1.0에 해당하는 시간입니다"
        error={errors.standardWorkHours?.message}
      >
        <Input
          type="number"
          inputMode="decimal"
          step="0.5"
          {...register('standardWorkHours', { valueAsNumber: true })}
        />
      </FormField>
      <FormField
        label="월 기준일수 (일)"
        hint="맨먼스(MM) 계산에 사용합니다"
        error={errors.monthlyWorkDays?.message}
      >
        <Input
          type="number"
          inputMode="numeric"
          {...register('monthlyWorkDays', { valueAsNumber: true })}
        />
      </FormField>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">공수 입력 방식</legend>
        <Controller
          control={control}
          name="workUnitMode"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              aria-label="공수 입력 방식"
            >
              {WORK_UNIT_OPTIONS.map((option) => (
                <label key={option.value} className="flex min-h-touch items-center gap-3">
                  <RadioGroupItem value={option.value} />
                  <span>
                    {option.label}
                    <span className="block text-sm text-foreground/70">{option.description}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          )}
        />
      </fieldset>
      <Button type="submit" disabled={!isDirty || save.isPending}>
        {save.isPending ? '저장 중' : '저장'}
      </Button>
    </form>
  );
};

const formatLastActive = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

// 로그인 기기: 분실 대비 원격 로그아웃 (§6.4)
const DevicesSection = () => {
  const devices = useDevices();
  const revoke = useRevokeDevice();

  if (devices.isPending) {
    return <p className="text-sm">기기 목록을 불러오는 중</p>;
  }

  if (devices.isError) {
    return <Alert>기기 목록을 불러오지 못했습니다</Alert>;
  }

  const renderDevice = (device: Device) => (
    <li key={device.id} className="flex min-h-touch items-center justify-between gap-3 py-2">
      <div>
        <p className="font-medium">{device.label}</p>
        <p className="text-sm text-foreground/70">
          마지막 사용 {formatLastActive(device.lastActiveAt)}
        </p>
      </div>
      {!device.isCurrent && (
        <Button
          variant="secondary"
          aria-label={`${device.label} 로그아웃`}
          disabled={revoke.isPending}
          onClick={() => revoke.mutate(device.id)}
        >
          로그아웃
        </Button>
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-2">
      {revoke.isError && <Alert>기기를 로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>}
      <ul className="divide-y divide-border">{devices.data.map(renderDevice)}</ul>
    </div>
  );
};

export const SettingsPage = () => {
  const me = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const onLogout = async () => {
    await logout(queryClient);
    await navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">설정</h1>

      <section className="flex flex-col gap-2" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-lg font-bold">
          계정
        </h2>
        <dl className="grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
          <dt className="text-foreground/70">회사</dt>
          <dd>{me.data?.companyName}</dd>
          <dt className="text-foreground/70">이름</dt>
          <dd>{me.data?.displayName}</dd>
          <dt className="text-foreground/70">이메일</dt>
          <dd>{me.data?.email}</dd>
        </dl>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="company-heading">
        <h2 id="company-heading" className="text-lg font-bold">
          회사 설정
        </h2>
        <CompanySettingsSection />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="devices-heading">
        <h2 id="devices-heading" className="text-lg font-bold">
          로그인한 기기
        </h2>
        <DevicesSection />
      </section>

      <section className="flex flex-col gap-3">
        <Button variant="secondary" onClick={onLogout}>
          로그아웃
        </Button>
        <Link
          className="min-h-touch content-center text-sm text-primary underline"
          to="/legal/privacy"
        >
          개인정보 처리방침
        </Link>
      </section>
    </div>
  );
};
