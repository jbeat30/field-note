import {
  EMPLOYEE_MEMO_MAX_LENGTH,
  EMPLOYEE_STATUS_LABELS,
  employeeUpdateSchema,
  type EmployeeDetail,
} from '@field-note/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { splitServerErrors } from '../employees/errors';
import { OptionSelect } from '../employees/OptionSelect';
import { useEmployee, useUpdateEmployee } from '../employees/useEmployees';
import { useOptions } from '../settings/useOptions';

// 입력칸은 모두 문자열로 다루고, 비어 있으면 null로 보낸다 (항목 지우기)
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

// 상태 처리 한 번에 하나만 확인 단계를 연다 (퇴사·휴직은 실수로 누르기 쉬운 버튼)
type PendingStatus = 'LEFT' | 'ON_LEAVE' | null;

const CardBody = ({ employee }: { employee: EmployeeDetail }) => {
  const options = useOptions();
  const update = useUpdateEmployee(employee.id);
  const [saved, setSaved] = useState('');
  const [pending, setPending] = useState<PendingStatus>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<CardForm>({ values: toForm(employee) });

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link className="min-h-touch content-center text-sm text-primary underline" to="/employees">
          ← 직원 목록
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {employee.name}
          <span className="rounded bg-muted px-2 py-0.5 text-sm font-normal">
            {EMPLOYEE_STATUS_LABELS[employee.status]}
          </span>
        </h1>
      </div>

      {saved && <Alert variant="info">{saved}</Alert>}
      {errors.root && <Alert>{errors.root.message}</Alert>}

      <form className="flex flex-col gap-4" onSubmit={save} noValidate>
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
            {...register('jobTypeId')}
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
            {...register('workerTypeId')}
          />
        </FormField>
        <FormField label="입사일" error={errors.hiredOn?.message}>
          <Input type="date" {...register('hiredOn')} />
        </FormField>
        {employee.status === 'LEFT' && (
          <FormField label="퇴사일" error={errors.leftOn?.message}>
            <Input type="date" {...register('leftOn')} />
          </FormField>
        )}
        <FormField label="생년월일" error={errors.birthDate?.message}>
          <Input type="date" {...register('birthDate')} />
        </FormField>
        <FormField label="연락처" error={errors.phone?.message}>
          <Input type="tel" inputMode="tel" autoComplete="off" {...register('phone')} />
        </FormField>
        <FormField
          label="메모"
          hint={`관리자만 보는 메모입니다 (${EMPLOYEE_MEMO_MAX_LENGTH}자까지)`}
          error={errors.memo?.message}
        >
          <Textarea {...register('memo')} />
        </FormField>
        <p className="text-sm text-foreground/70">주민등록번호·계좌번호·급여는 저장하지 않습니다</p>
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending ? '저장 중' : '저장'}
        </Button>
      </form>

      <section className="flex flex-col gap-3" aria-labelledby="status-heading">
        <h2 id="status-heading" className="text-lg font-bold">
          재직 상태
        </h2>
        {employee.status === 'LEFT' ? (
          <>
            <p className="text-sm text-foreground/70">
              퇴사한 직원은 새 투입·일지 입력에서 빠지고, 과거 기록은 그대로 남습니다. 재입사하면
              같은 카드를 다시 재직으로 바꿉니다
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
              <div className="flex flex-col gap-2 rounded-md border border-border p-3">
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
              <div className="flex flex-col gap-2 rounded-md border border-danger p-3">
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
    </div>
  );
};

// 직원 카드: 기본정보(생년월일·연락처 포함)와 재직 상태. 투입 이력과 서류는 이후 단계에서 추가
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
