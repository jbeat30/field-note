import { type WorkUnitMode } from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { logout } from '../api/logout';
import { useMe } from '../auth/useMe';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { getErrorMessage } from '../lib/apiError';
import { hoursToMinutes, minutesToHours } from '../lib/workTime';
import { ClosureSection } from '../settings/ClosureSection';
import { SocialLoginSection } from '../settings/SocialLoginSection';
import { useCompanySettings, useSaveCompanySettings } from '../settings/useCompanySettings';
import { DevicesSection } from '../settings/DevicesSection';
import { SecurityRows } from '../settings/SecurityRows';

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

const SETTINGS_TABS = [
  { value: 'account', label: '내 계정' },
  { value: 'company', label: '회사 관리' },
  { value: 'etc', label: '기타' },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]['value'];

export const SettingsPage = () => {
  const me = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  // 선택한 탭은 주소(?tab=)에 담아 새로고침·뒤로 가기에서도 유지
  const requestedTab = searchParams.get('tab');
  const tab: SettingsTab =
    SETTINGS_TABS.find((item) => item.value === requestedTab)?.value ?? 'account';
  const changeTab = (value: string) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);

        next.set('tab', value);
        return next;
      },
      { replace: true },
    );

  const onLogout = async () => {
    await logout(queryClient);
    await navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="설정"
        description="계정과 회사 운영에 필요한 설정을 관리합니다"
        actions={
          <Button variant="secondary" onClick={onLogout}>
            로그아웃
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList aria-label="설정 구분">
          {SETTINGS_TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="account">
          <p className="mb-4 text-sm text-foreground/70">로그인과 보안에 관한 설정</p>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <section
                className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
                aria-labelledby="account-heading"
              >
                <h2 id="account-heading" className="text-lg font-bold">
                  계정
                </h2>
                <dl className="grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
                  <dt className="text-foreground/70">회사</dt>
                  <dd>{me.data?.companyName}</dd>
                  <dt className="text-foreground/70">이름</dt>
                  <dd>{me.data?.displayName}</dd>
                </dl>
              </section>
              <section
                className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
                aria-labelledby="security-heading"
              >
                <h2 id="security-heading" className="text-lg font-bold">
                  보안
                </h2>
                <SecurityRows email={me.data?.email} />
              </section>
              <section
                className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
                aria-labelledby="social-heading"
              >
                <h2 id="social-heading" className="text-lg font-bold">
                  소셜 로그인
                </h2>
                <SocialLoginSection />
              </section>
            </div>
            <section
              className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
              aria-labelledby="devices-heading"
            >
              <h2 id="devices-heading" className="text-lg font-bold">
                로그인한 기기
              </h2>
              <DevicesSection />
            </section>
          </div>
        </TabsContent>
        <TabsContent value="company">
          <p className="mb-4 text-sm text-foreground/70">회사 단위 설정과 기록</p>
          <div className="gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
            <section
              className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
              aria-labelledby="company-heading"
            >
              <h2 id="company-heading" className="text-lg font-bold">
                회사 설정
              </h2>
              <CompanySettingsSection />
            </section>
            <section
              className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
              aria-labelledby="lists-heading"
            >
              <h2 id="lists-heading" className="text-lg font-bold">
                목록 관리
              </h2>
              <p className="text-sm text-foreground/70">
                직종, 작업 구분, 공종, 직원 구분을 회사에 맞게 바꿉니다
              </p>
              <Button variant="secondary" asChild>
                <Link to="/settings/lists">목록 관리 열기</Link>
              </Button>
            </section>
            <section
              className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
              aria-labelledby="alerts-heading"
            >
              <h2 id="alerts-heading" className="text-lg font-bold">
                알림
              </h2>
              <p className="text-sm text-foreground/70">
                홈 화면에 보여 줄 알림(작업 내역 미입력, 공수 소진, 일정 지연 등)을 종류별로 켜고
                끕니다
              </p>
              <Button variant="secondary" asChild>
                <Link to="/settings/alerts">알림 설정 열기</Link>
              </Button>
            </section>
            <section
              className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
              aria-labelledby="records-heading"
            >
              <h2 id="records-heading" className="text-lg font-bold">
                기록 조회
              </h2>
              <p className="text-sm text-foreground/70">
                민감 자료·직원 서류 열람, 내보내기, 단가·인건비 조회, 월 공수 확정·재오픈 기록을
                봅니다 (조회만 가능하고 수정·삭제할 수 없습니다)
              </p>
              <Button variant="secondary" asChild>
                <Link to="/settings/records">기록 조회 열기</Link>
              </Button>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="etc">
          <p className="mb-4 text-sm text-foreground/70">약관과 계정 해지</p>
          <div className="gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
            <section
              className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
              aria-labelledby="closure-heading"
            >
              <h2 id="closure-heading" className="text-lg font-bold">
                계정 해지
              </h2>
              <ClosureSection />
            </section>
            <section className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5">
              <p className="text-lg font-bold">안내</p>
              <Link
                className="flex min-h-touch items-center text-sm text-primary underline"
                to="/legal/privacy"
              >
                개인정보 처리방침
              </Link>
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
