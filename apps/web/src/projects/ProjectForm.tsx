import {
  PROJECT_MEMO_MAX_LENGTH,
  PROJECT_STATUS_LABELS,
  allowedProjectFields,
  periodChangeNeedsReason,
  partnerNameSchema,
  optionNameSchema,
  projectCreateSchema,
  projectUpdateSchema,
  type ProjectDetail,
  VALIDATION_MESSAGES,
} from '@field-note/shared';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import type { ReactNode } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { Combobox } from '../components/ui/combobox';
import { Textarea } from '../components/ui/textarea';
import { useEmployees } from '../employees/useEmployees';
import { getErrorDetailMessage } from '../lib/apiError';
import { splitServerErrors } from '../lib/serverErrors';
import { useCreatePartner, usePartners } from '../partners/usePartners';
import { useCreateOption, useOptions } from '../settings/useOptions';

import { InlineAdd } from './InlineAdd';
import { useCreateProject, useUpdateProject } from './useProjects';
import { LoadingBlock } from '../components/ui/loading-block';

type FormValues = {
  name: string;
  siteName: string;
  siteAddress: string;
  siteMapUrl: string;
  siteContactName: string;
  siteContactPhone: string;
  accessMemo: string;
  clientId: string;
  managerId: string;
  tradeIds: string[];
  contractDate: string;
  plannedStart: string;
  plannedEnd: string;
  memo: string;
  // 예정 기간을 바꿀 때의 사유 (시작한 프로젝트는 필수)
  periodChangeReason: string;
};

const FIELDS = [
  'name',
  'siteName',
  'siteAddress',
  'siteMapUrl',
  'siteContactName',
  'siteContactPhone',
  'accessMemo',
  'clientId',
  'managerId',
  'tradeIds',
  'contractDate',
  'plannedStart',
  'plannedEnd',
  'memo',
  'periodChangeReason',
] as const;

const EMPTY: FormValues = {
  name: '',
  siteName: '',
  siteAddress: '',
  siteMapUrl: '',
  siteContactName: '',
  siteContactPhone: '',
  accessMemo: '',
  clientId: '',
  managerId: '',
  tradeIds: [],
  contractDate: '',
  plannedStart: '',
  plannedEnd: '',
  memo: '',
  periodChangeReason: '',
};

const toValues = (project: ProjectDetail): FormValues => ({
  name: project.name,
  siteName: project.siteName,
  siteAddress: project.siteAddress ?? '',
  siteMapUrl: project.siteMapUrl ?? '',
  siteContactName: project.siteContactName ?? '',
  siteContactPhone: project.siteContactPhone ?? '',
  accessMemo: project.accessMemo ?? '',
  clientId: project.clientId,
  managerId: project.managerId,
  tradeIds: project.tradeIds,
  contractDate: project.contractDate,
  plannedStart: project.plannedStart,
  plannedEnd: project.plannedEnd,
  memo: project.memo ?? '',
  periodChangeReason: '',
});

const orNull = (value: string) => value.trim() || null;

// 입력칸 값을 서버에 보낼 형태로 바꿈 (비어 있으면 null)
const toBody = (values: FormValues) => ({
  name: values.name,
  siteName: values.siteName,
  siteAddress: orNull(values.siteAddress),
  siteMapUrl: orNull(values.siteMapUrl),
  siteContactName: orNull(values.siteContactName),
  siteContactPhone: orNull(values.siteContactPhone),
  accessMemo: values.accessMemo.trim() ? values.accessMemo : null,
  clientId: values.clientId,
  managerId: values.managerId,
  tradeIds: values.tradeIds,
  contractDate: values.contractDate,
  plannedStart: values.plannedStart,
  plannedEnd: values.plannedEnd,
  memo: values.memo.trim() ? values.memo : null,
  periodChangeReason: orNull(values.periodChangeReason),
});

// 상태 때문에 수정할 수 없는 항목은 안의 입력과 버튼을 한꺼번에 막음 (레이아웃은 그대로)
const Lockable = ({ locked, children }: { locked: boolean; children: ReactNode }) => (
  <fieldset disabled={locked} className="contents">
    {children}
  </fieldset>
);

/**
 * @description 프로젝트 기본정보 폼 (등록과 수정이 같은 화면 사용)
 * 고객·담당자·공종은 명부·직원·선택 목록에서 선택, 목록에 없으면 그 자리에서 추가 가능
 * @param props project가 있으면 수정, 없으면 등록
 */
export const ProjectForm = ({ project }: { project?: ProjectDetail }) => {
  const navigate = useNavigate();
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? '');
  const createPartner = useCreatePartner();
  const createOption = useCreateOption();
  const options = useOptions();
  const partners = usePartners({ kind: 'CLIENT' });
  const employees = useEmployees({});
  const [saved, setSaved] = useState('');
  const [clientError, setClientError] = useState('');
  const [tradeError, setTradeError] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ values: project ? toValues(project) : EMPTY });
  const tradeIds = useWatch({ control, name: 'tradeIds' });
  const clientId = useWatch({ control, name: 'clientId' });
  const managerId = useWatch({ control, name: 'managerId' });
  const plannedStartValue = useWatch({ control, name: 'plannedStart' });
  const plannedEndValue = useWatch({ control, name: 'plannedEnd' });
  const isEdit = Boolean(project);
  // 예정 기간을 바꾸면 사유를 받음 (시작한 뒤에는 필수, 예정 상태에서는 선택)
  const periodChanged =
    Boolean(project) &&
    (plannedStartValue !== project?.plannedStart || plannedEndValue !== project?.plannedEnd);
  const reasonRequired =
    periodChanged && project !== undefined && periodChangeNeedsReason(project.status);
  // 상태별 수정 제한: 종료·취소는 수정 불가, 보증 중은 담당자·메모만
  const allowed = project ? allowedProjectFields(project.status) : 'all';
  const isLocked = (field: string) => allowed !== 'all' && !allowed.includes(field);
  const isReadOnly = allowed !== 'all' && allowed.length === 0;
  const isBusy = create.isPending || update.isPending;

  // 숨긴 고객·퇴사한 직원·숨긴 공종은 새로 선택할 수 없지만 이미 선택한 값이면 계속 표시
  const clients = (partners.data ?? []).filter(
    (item) => item.isActive || item.id === project?.clientId,
  );
  const managers = (employees.data ?? []).filter(
    (item) => item.status !== 'LEFT' || item.id === project?.managerId,
  );
  const trades = (options.data ?? []).filter(
    (item) => item.kind === 'TRADE' && (item.isActive || project?.tradeIds.includes(item.id)),
  );

  const applyErrors = (error: unknown) => {
    const { byField, root } = splitServerErrors(error, FIELDS);

    for (const [field, message] of Object.entries(byField)) {
      setError(field as keyof FormValues, { message });
    }

    if (root) {
      setError('root', { message: root });
    }
  };

  const showSchemaErrors = (issues: { path: PropertyKey[]; message: string }[]) => {
    const shown = new Set<string>();

    // 같은 칸에 문제가 여러 개면 가장 먼저 걸린 것만 보여 줌
    for (const issue of issues) {
      const field = String(issue.path[0] ?? '');

      if ((FIELDS as readonly string[]).includes(field) && !shown.has(field)) {
        shown.add(field);
        setError(field as keyof FormValues, { message: issue.message });
      }
    }

    // 긴 입력 화면에서 버튼 아래에서는 오류가 보이지 않으므로 가장 위의 오류 칸으로 이동
    // (오류 표시가 화면에 반영된 뒤에 찾아야 하므로 잠시 뒤에 실행)
    window.setTimeout(
      () => document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus(),
      50,
    );
  };

  const submit = handleSubmit((values) => {
    setSaved('');

    // 서버와 같은 공유 스키마로 먼저 검사해 입력칸 옆에 바로 보여 줌
    if (!isEdit) {
      const parsed = projectCreateSchema.safeParse(toBody(values));

      if (!parsed.success) {
        showSchemaErrors(parsed.error.issues);
        return;
      }

      create.mutate(parsed.data, {
        onSuccess: (created) => void navigate(`/projects/${created.id}`),
        onError: applyErrors,
      });

      return;
    }

    // 막힌 항목은 보내지 않음 (보증 중에는 담당자·메모만)
    const body = toBody({ ...toValues(project!), ...values });

    // 기간을 바꾸지 않았다면 사유는 보내지 않음
    if (!periodChanged) {
      delete (body as Partial<typeof body>).periodChangeReason;
    }

    const sendable =
      allowed === 'all'
        ? body
        : Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
    const parsed = projectUpdateSchema.safeParse(sendable);

    if (!parsed.success) {
      showSchemaErrors(parsed.error.issues);
      return;
    }

    // 기간 순서 같은 입력 오류를 먼저 보여 주고, 그다음에 사유 누락을 확인
    if (periodChanged && reasonRequired && !body.periodChangeReason) {
      setError('periodChangeReason', {
        message: VALIDATION_MESSAGES.required('시작한 프로젝트의 기간을 바꿀 때는 사유'),
      });
      return;
    }

    update.mutate(parsed.data, {
      onSuccess: (updated) => {
        reset(toValues(updated));
        setSaved('저장했습니다');
      },
      onError: applyErrors,
    });
  });

  const toggleTrade = (id: string) =>
    setValue(
      'tradeIds',
      tradeIds.includes(id) ? tradeIds.filter((item) => item !== id) : [...tradeIds, id],
      {
        shouldDirty: true,
      },
    );

  const addClient = async (name: string) => {
    const parsed = partnerNameSchema.safeParse(name);

    if (!parsed.success) {
      setClientError(parsed.error.issues[0]?.message ?? '');
      return false;
    }

    try {
      const added = await createPartner.mutateAsync({ kind: 'CLIENT', name: parsed.data });

      setClientError('');
      setValue('clientId', added.id, { shouldDirty: true });

      return true;
    } catch (error) {
      setClientError(getErrorDetailMessage(error));
      return false;
    }
  };

  const addTrade = async (name: string) => {
    const parsed = optionNameSchema.safeParse(name);

    if (!parsed.success) {
      setTradeError(parsed.error.issues[0]?.message ?? '');
      return false;
    }

    try {
      const added = await createOption.mutateAsync({ kind: 'TRADE', name: parsed.data });

      setTradeError('');
      setValue('tradeIds', [...tradeIds, added.id], { shouldDirty: true });

      return true;
    } catch (error) {
      setTradeError(getErrorDetailMessage(error));
      return false;
    }
  };

  if (options.isPending || partners.isPending || employees.isPending) {
    return <LoadingBlock label="입력 목록을 불러오는 중" />;
  }

  if (options.isError || partners.isError || employees.isError) {
    return <Alert>입력 목록을 불러오지 못했습니다</Alert>;
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      {saved && <Alert variant="info">{saved}</Alert>}
      {errors.root && <Alert>{errors.root.message}</Alert>}
      {isReadOnly && (
        <Alert>
          &apos;{PROJECT_STATUS_LABELS[project!.status]}&apos; 상태의 프로젝트는 수정할 수 없습니다.
          기록은 그대로 조회할 수 있습니다
        </Alert>
      )}

      {/* 프로젝트명 — 전체 폭 */}
      <Lockable locked={isLocked('name')}>
        <FormField label="프로젝트명" error={errors.name?.message}>
          <Input {...register('name')} />
        </FormField>
      </Lockable>

      {/* xl+ 2열: 왼쪽 현장 / 오른쪽 고객·담당자·공종·일정 */}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {/* 왼쪽: 현장 */}
        <Lockable locked={isLocked('siteName')}>
          <fieldset className="grid gap-4 rounded-2xl bg-surface-subtle p-4 md:grid-cols-2">
            <legend className="px-1 text-sm font-bold">현장</legend>
            <FormField
              label="현장 이름"
              hint="건물명이나 현장 이름"
              error={errors.siteName?.message}
            >
              <Input {...register('siteName')} />
            </FormField>
            <FormField label="주소" error={errors.siteAddress?.message}>
              <Input {...register('siteAddress')} />
            </FormField>
            <FormField
              label="지도 링크"
              hint="http:// 또는 https://로 시작하는 주소"
              error={errors.siteMapUrl?.message}
            >
              <Input type="url" inputMode="url" {...register('siteMapUrl')} />
            </FormField>
            <FormField
              label="현장 담당자"
              hint="현장소장·고객 담당자"
              error={errors.siteContactName?.message}
            >
              <Input {...register('siteContactName')} />
            </FormField>
            <FormField label="현장 연락처" error={errors.siteContactPhone?.message}>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                {...register('siteContactPhone')}
              />
            </FormField>
            <FormField
              className="md:col-span-2"
              label="출입·주의 메모"
              hint="출입 방법, 주차, 작업 시간 제한"
              error={errors.accessMemo?.message}
            >
              <Textarea {...register('accessMemo')} />
            </FormField>
          </fieldset>
        </Lockable>

        {/* 오른쪽: 고객·담당자·공종·일정 */}
        <div className="flex flex-col gap-4">
          <Lockable locked={isLocked('clientId')}>
            <div className="flex flex-col gap-2">
              <FormField
                label="고객"
                hint="명부의 고객(발주처·원청)"
                error={errors.clientId?.message}
              >
                <Combobox
                  value={clientId}
                  placeholder="고객 선택"
                  searchPlaceholder="고객 이름으로 찾기"
                  onValueChange={(value) => setValue('clientId', value, { shouldDirty: true })}
                  options={clients.map((item) => ({
                    value: item.id,
                    label: item.isActive ? item.name : `${item.name} (숨김)`,
                  }))}
                />
              </FormField>
              <InlineAdd
                label="목록에 없는 고객 추가"
                placeholder="새 고객 상호"
                isPending={createPartner.isPending}
                error={clientError}
                onAdd={addClient}
              />
              {clientId === '' && clients.length === 0 && (
                <p className="text-sm text-sub">
                  등록된 고객이 없습니다. 위에서 바로 추가할 수 있습니다
                </p>
              )}
            </div>
          </Lockable>

          <Lockable locked={isLocked('managerId')}>
            <FormField
              label="담당자"
              hint="프로젝트 책임자(PM·소장)"
              error={errors.managerId?.message}
            >
              <Combobox
                value={managerId}
                placeholder="담당자 선택"
                onValueChange={(value) => setValue('managerId', value, { shouldDirty: true })}
                options={managers.map((item) => ({
                  value: item.id,
                  label: item.status === 'LEFT' ? `${item.name} (퇴사)` : item.name,
                  description: item.title ?? undefined,
                }))}
              />
            </FormField>
          </Lockable>

          <Lockable locked={isLocked('tradeIds')}>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">공종 (여러 개 선택 가능)</legend>
              <div className="flex flex-wrap gap-2">
                {trades.map((trade) => (
                  <label
                    key={trade.id}
                    className="flex min-h-touch items-center gap-2 rounded-xl bg-field px-3"
                  >
                    <input
                      type="checkbox"
                      className="size-5"
                      checked={tradeIds.includes(trade.id)}
                      onChange={() => toggleTrade(trade.id)}
                    />
                    {trade.name}
                    {trade.isActive ? '' : ' (숨김)'}
                  </label>
                ))}
              </div>
              {errors.tradeIds?.message && (
                <p className="text-sm text-danger">{errors.tradeIds.message}</p>
              )}
              <InlineAdd
                label="목록에 없는 공종 추가"
                placeholder="새 공종 이름"
                isPending={createOption.isPending}
                error={tradeError}
                onAdd={addTrade}
              />
            </fieldset>
          </Lockable>

          <Lockable locked={isLocked('contractDate')}>
            <fieldset className="grid gap-4 rounded-2xl bg-surface-subtle p-4 sm:grid-cols-2">
              <legend className="px-1 text-sm font-bold">일정</legend>
              <FormField label="계약일" error={errors.contractDate?.message}>
                <DateInput {...register('contractDate')} />
              </FormField>
              <FormField
                label="시작 예정일"
                hint="작업 내역을 입력할 수 있는 기간이 됩니다"
                error={errors.plannedStart?.message}
              >
                <DateInput {...register('plannedStart')} />
              </FormField>
              <FormField label="종료 예정일" error={errors.plannedEnd?.message}>
                <DateInput {...register('plannedEnd')} />
              </FormField>
            </fieldset>
          </Lockable>

          {periodChanged && (
            <Lockable locked={isLocked('plannedStart')}>
              <FormField
                label={reasonRequired ? '기간 변경 사유 (필수)' : '기간 변경 사유 (선택)'}
                hint="연장·단축한 이유를 남기면 기간 변경 이력에 기록됩니다"
                error={errors.periodChangeReason?.message}
              >
                <Textarea {...register('periodChangeReason')} />
              </FormField>
            </Lockable>
          )}
        </div>
      </div>

      {/* 메모 — 전체 폭 */}
      <Lockable locked={isLocked('memo')}>
        <FormField
          label="메모"
          hint={`관리자만 보는 메모입니다 (${PROJECT_MEMO_MAX_LENGTH}자까지)`}
          error={errors.memo?.message}
        >
          <Textarea {...register('memo')} />
        </FormField>
      </Lockable>

      {!isReadOnly && (
        <Button
          type="submit"
          className="self-start px-10"
          disabled={isBusy || (isEdit && !isDirty)}
        >
          {isBusy ? '저장 중' : isEdit ? '저장' : '프로젝트 등록'}
        </Button>
      )}
    </form>
  );
};
