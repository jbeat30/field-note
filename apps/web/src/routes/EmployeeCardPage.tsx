import {
  EMPLOYEE_MEMO_MAX_LENGTH,
  employeeUpdateSchema,
  type EmployeeDetail,
} from '@field-note/shared';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { BackLink } from '../components/ui/back-link';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/ui/page-header';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { splitServerErrors } from '../lib/serverErrors';
import { EmployeeCredentialsPanel } from '../credentials/EmployeeCredentialsPanel';
import { EmployeePayPanel } from '../labor/EmployeePayPanel';
import { EmployeeOverviewPanel } from '../employees/EmployeeOverviewPanel';
import { EmployeeSummaryStats } from '../employees/EmployeeSummaryStats';
import { OptionSelect } from '../employees/OptionSelect';
import { useEmployee, useUpdateEmployee } from '../employees/useEmployees';
import { useOptions } from '../settings/useOptions';
import { EmployeeWorkHistoryPanel } from '../workSummary/EmployeeWorkHistoryPanel';

// 입력칸은 모두 문자열로 다루고, 비어 있으면 null로 보냄 (항목 지우기)
type CardForm = {
  name: string;
  title: string;
  jobTypeId: string;
  workerTypeId: string;
  hiredOn: string;
  leftOn: string;
  birthDate: string;
  phone: string;
  memo: string;
};

const FIELDS = [
  'name',
  'title',
  'jobTypeId',
  'workerTypeId',
  'hiredOn',
  'leftOn',
  'birthDate',
  'phone',
  'memo',
] as const;

const toForm = (employee: EmployeeDetail): CardForm => ({
  name: employee.name,
  title: employee.title ?? '',
  jobTypeId: employee.jobTypeId ?? '',
  workerTypeId: employee.workerTypeId ?? '',
  hiredOn: employee.hiredOn ?? '',
  leftOn: employee.leftOn ?? '',
  birthDate: employee.birthDate ?? '',
  phone: employee.phone ?? '',
  memo: employee.memo ?? '',
});

const orNull = (value: string) => value.trim() || null;

const TABS = ['overview', 'history', 'pay', 'credentials', 'info'] as const;

// 상태 처리 한 번에 하나만 확인 단계를 염 (퇴사·휴직은 실수로 누르기 쉬운 버튼)
type PendingStatus = 'LEFT' | 'ON_LEAVE' | null;

const CardBody = ({ employee }: { employee: EmployeeDetail }) => {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab = TABS.find((item) => item === requested) ?? 'overview';
  const options = useOptions();
  const update = useUpdateEmployee(employee.id);
  const [saved, setSaved] = useState('');
  const [pending, setPending] = useState<PendingStatus>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<CardForm>({ values: toForm(employee) });
  const jobTypeId = useWatch({ control, name: 'jobTypeId' });
  const workerTypeId = useWatch({ control, name: 'workerTypeId' });

  const applyErrors = (error: unknown) => {
    const { byField, root } = splitServerErrors(error, FIELDS);

    for (const [field, message] of Object.entries(byField)) {
      setError(field as keyof CardForm, { message });
    }

    if (root) {
      setError('root', { message: root });
    }
  };

  const save = handleSubmit((values) => {
    setSaved('');

    // 서버와 같은 공유 스키마로 먼저 검사해 입력칸 옆에 바로 보여 줌
    const body = {
      name: values.name,
      title: orNull(values.title),
      jobTypeId: values.jobTypeId || null,
      workerTypeId: values.workerTypeId || null,
      hiredOn: values.hiredOn || null,
      // 퇴사 상태가 아닐 때는 퇴사일을 보내지 않음 (서버가 퇴사일을 상태에 맞춰 관리)
      ...(employee.status === 'LEFT' ? { leftOn: values.leftOn || null } : {}),
      birthDate: values.birthDate || null,
      phone: orNull(values.phone),
      memo: values.memo.trim() ? values.memo : null,
    };
    const parsed = employeeUpdateSchema.safeParse(body);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? '');

        if ((FIELDS as readonly string[]).includes(field)) {
          setError(field as keyof CardForm, { message: issue.message });
        }
      }

      return;
    }

    update.mutate(parsed.data, {
      onSuccess: (updated) => {
        reset(toForm(updated));
        setSaved('저장했습니다');
      },
      onError: applyErrors,
    });
  });

  const changeStatus = (status: 'ACTIVE' | 'ON_LEAVE' | 'LEFT') => {
    setSaved('');
    update.mutate(
      { status },
      {
        onSuccess: (updated) => {
          reset(toForm(updated));
          setPending(null);
          setSaved(
            status === 'LEFT'
              ? '퇴사 처리했습니다. 과거 투입·작업 기록은 그대로 남습니다'
              : status === 'ON_LEAVE'
                ? '휴직 처리했습니다'
                : '재직 상태로 돌렸습니다',
          );
        },
        onError: (error) => {
          setPending(null);
          applyErrors(error);
        },
      },
    );
  };

  return (
    <Tabs
      value={tab}
      className="flex flex-col gap-5"
      onValueChange={(next) =>
        setParams(next === 'overview' ? {} : { tab: next }, { replace: true })
      }
    >
      <PageHeader
        title={employee.name}
        eyebrow={employee.title ?? undefined}
        back={<BackLink to="/employees">직원 목록</BackLink>}
        tabs={
          <TabsList aria-label="직원 카드">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="history">투입 이력</TabsTrigger>
            <TabsTrigger value="pay">단가</TabsTrigger>
            <TabsTrigger value="credentials">서류·자격</TabsTrigger>
            <TabsTrigger value="info">기본정보</TabsTrigger>
          </TabsList>
        }
      />

      <EmployeeSummaryStats employee={employee} />

      <TabsContent value="overview" className="grid items-start gap-5 pt-0 xl:grid-cols-2">
        <Panel>
          <EmployeeOverviewPanel employee={employee} />
        </Panel>
        <Panel>
          <section className="flex flex-col gap-3" aria-labelledby="status-heading">
            <h2 id="status-heading" className="text-lg font-bold">
              재직 상태
            </h2>
            {employee.status === 'LEFT' ? (
              <>
                <p className="text-sm text-foreground/70">
                  퇴사한 직원은 새 투입·작업 내역 입력에서 빠지고, 과거 기록은 그대로 남습니다.
                  재입사하면 같은 카드를 다시 재직으로 바꿉니다
                </p>
                <Button
                  variant="secondary"
                  disabled={update.isPending}
                  onClick={() => changeStatus('ACTIVE')}
                >
                  재입사 (재직으로 변경)
                </Button>
              </>
            ) : (
              <>
                {employee.status === 'ON_LEAVE' && (
                  <Button
                    variant="secondary"
                    disabled={update.isPending}
                    onClick={() => changeStatus('ACTIVE')}
                  >
                    복직 (재직으로 변경)
                  </Button>
                )}
                {employee.status === 'ACTIVE' && pending !== 'ON_LEAVE' && (
                  <Button variant="secondary" onClick={() => setPending('ON_LEAVE')}>
                    휴직 처리
                  </Button>
                )}
                {pending === 'ON_LEAVE' && (
                  <div className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-4">
                    <p className="text-sm">{employee.name}님을 휴직으로 바꿀까요?</p>
                    <div className="flex gap-2">
                      <Button disabled={update.isPending} onClick={() => changeStatus('ON_LEAVE')}>
                        휴직 확인
                      </Button>
                      <Button variant="secondary" onClick={() => setPending(null)}>
                        취소
                      </Button>
                    </div>
                  </div>
                )}
                {pending !== 'LEFT' && (
                  <Button variant="secondary" onClick={() => setPending('LEFT')}>
                    퇴사 처리
                  </Button>
                )}
                {pending === 'LEFT' && (
                  <div className="flex flex-col gap-2 rounded-xl border border-danger p-4">
                    <p className="text-sm">
                      {employee.name}님을 퇴사 처리할까요? 퇴사일은 오늘로 기록되고 새 투입에서
                      빠집니다. 과거 기록은 그대로 남습니다
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        disabled={update.isPending}
                        onClick={() => changeStatus('LEFT')}
                      >
                        퇴사 확인
                      </Button>
                      <Button variant="secondary" onClick={() => setPending(null)}>
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </Panel>
      </TabsContent>

      <TabsContent value="history" className="pt-0">
        <Panel>
          <EmployeeWorkHistoryPanel employeeId={employee.id} />
        </Panel>
      </TabsContent>

      <TabsContent value="pay" className="pt-0">
        <Panel>
          <EmployeePayPanel employeeId={employee.id} />
        </Panel>
      </TabsContent>

      <TabsContent value="credentials" className="pt-0">
        <Panel>
          <EmployeeCredentialsPanel employeeId={employee.id} />
        </Panel>
      </TabsContent>

      {/* 고치던 내용이 탭을 옮겨도 남도록 닫아 두기만 하고 지우지 않음 */}
      <TabsContent value="info" forceMount className="pt-0 data-[state=inactive]:hidden">
        <Panel>
          {saved && <Alert variant="info">{saved}</Alert>}
          {errors.root && <Alert>{errors.root.message}</Alert>}

          <h2 className="mb-4 text-lg font-bold">기본정보</h2>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={save} noValidate>
            <FormField label="이름" error={errors.name?.message}>
              <Input {...register('name')} />
            </FormField>
            <FormField
              label="직책"
              hint="표시용입니다 (예: 반장, 기공, 조공)"
              error={errors.title?.message}
            >
              <Input {...register('title')} />
            </FormField>
            <FormField label="직종" error={errors.jobTypeId?.message}>
              <OptionSelect
                kind="JOB_TYPE"
                options={options.data ?? []}
                keepId={employee.jobTypeId}
                value={jobTypeId}
                onValueChange={(value) => setValue('jobTypeId', value, { shouldDirty: true })}
              />
            </FormField>
            <FormField
              label="직원 구분"
              hint="목록과 필터에 쓰는 표시입니다 (공수 계산에는 쓰지 않습니다)"
              error={errors.workerTypeId?.message}
            >
              <OptionSelect
                kind="WORKER_TYPE"
                options={options.data ?? []}
                keepId={employee.workerTypeId}
                value={workerTypeId}
                onValueChange={(value) => setValue('workerTypeId', value, { shouldDirty: true })}
              />
            </FormField>
            <FormField label="입사일" error={errors.hiredOn?.message}>
              <DateInput {...register('hiredOn')} />
            </FormField>
            {employee.status === 'LEFT' && (
              <FormField label="퇴사일" error={errors.leftOn?.message}>
                <DateInput {...register('leftOn')} />
              </FormField>
            )}
            <FormField label="생년월일" error={errors.birthDate?.message}>
              <DateInput {...register('birthDate')} />
            </FormField>
            <FormField label="연락처" error={errors.phone?.message}>
              <Input type="tel" inputMode="tel" autoComplete="off" {...register('phone')} />
            </FormField>
            <FormField
              className="md:col-span-2"
              label="메모"
              hint={`관리자만 보는 메모입니다 (${EMPLOYEE_MEMO_MAX_LENGTH}자까지)`}
              error={errors.memo?.message}
            >
              <Textarea {...register('memo')} />
            </FormField>
            <p className="text-sm text-foreground/70 md:col-span-2">
              주민등록번호·계좌번호는 저장하지 않습니다. 급여는 단가만 기록합니다
            </p>
            <Button
              type="submit"
              className="md:col-span-2 md:justify-self-start md:px-10"
              disabled={!isDirty || update.isPending}
            >
              {update.isPending ? '저장 중' : '저장'}
            </Button>
          </form>
        </Panel>
      </TabsContent>
    </Tabs>
  );
};

// 패널 하나를 카드로 감쌈
const Panel = ({ children }: { children: ReactNode }) => (
  <div className="rounded-3xl bg-surface-subtle p-5">{children}</div>
);

// 직원 카드: 기본정보(생년월일·연락처 포함), 재직 상태, 투입 이력, 서류·자격
export const EmployeeCardPage = () => {
  const { id = '' } = useParams();
  const employee = useEmployee(id);
  const options = useOptions();

  // 선택 목록이 도착하기 전에 폼을 그리면 직종·구분 선택칸이 현재 값을 찾지 못해 비어 보임
  if (employee.isPending || options.isPending) {
    return <p className="text-sm">직원 정보를 불러오는 중</p>;
  }

  if (employee.isError || options.isError) {
    return <Alert>직원 정보를 불러오지 못했습니다</Alert>;
  }

  if (!employee.data) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">직원을 찾을 수 없습니다</h1>
        <Link className="min-h-touch content-center text-primary underline" to="/employees">
          직원 목록으로
        </Link>
      </div>
    );
  }

  return <CardBody employee={employee.data} />;
};
