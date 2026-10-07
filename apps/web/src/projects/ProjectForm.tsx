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
} from '@field-note/shared';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import type { ReactNode } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { useEmployees } from '../employees/useEmployees';
import { getErrorDetailMessage } from '../lib/apiError';
import { splitServerErrors } from '../lib/serverErrors';
import { useCreatePartner, usePartners } from '../partners/usePartners';
import { useCreateOption, useOptions } from '../settings/useOptions';

import { InlineAdd } from './InlineAdd';
import { useCreateProject, useUpdateProject } from './useProjects';

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

// 상태 때문에 수정할 수 없는 항목은 안의 입력과 버튼을 한꺼번에 막는다 (레이아웃은 그대로)
const Lockable = ({ locked, children }: { locked: boolean; children: ReactNode }) => (
  <fieldset disabled={locked} className="contents">
    {children}
  </fieldset>
);

/**
 * @description 프로젝트 기본정보 폼 (등록과 수정이 같은 화면을 쓴다)
 * 고객·담당자·공종은 명부·직원·선택 목록에서 고르고, 목록에 없으면 그 자리에서 추가할 수 있다
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
  // 예정 기간을 바꾸면 사유를 받는다 (시작한 뒤에는 필수, 예정 상태에서는 선택)
  const periodChanged =
    Boolean(project) &&
    (plannedStartValue !== project?.plannedStart || plannedEndValue !== project?.plannedEnd);
  const reasonRequired =
    periodChanged && project !== undefined && periodChangeNeedsReason(project.status);
  // 상태별 수정 제한 (서비스 기획서 §10.3): 종료·취소는 수정 불가, 보증 중은 담당자·메모만
  const allowed = project ? allowedProjectFields(project.status) : 'all';
  const isLocked = (field: string) => allowed !== 'all' && !allowed.includes(field);
  const isReadOnly = allowed !== 'all' && allowed.length === 0;
  const isBusy = create.isPending || update.isPending;

  // 숨긴 고객·퇴사한 직원·숨긴 공종은 새로 고를 수 없지만, 이미 고른 값이면 계속 보여 준다
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
    for (const issue of issues) {
      const field = String(issue.path[0] ?? '');

      if ((FIELDS as readonly string[]).includes(field)) {
        setError(field as keyof FormValues, { message: issue.message });
      }
    }
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

    // 막힌 항목은 보내지 않는다 (보증 중에는 담당자·메모만)
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
        message: '시작한 프로젝트의 기간을 바꿀 때는 사유를 입력해 주세요',
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
    return <p className="text-sm">입력 목록을 불러오는 중</p>;
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

      <Lockable locked={isLocked('name')}>
        <FormField label="프로젝트명" error={errors.name?.message}>
          <Input {...register('name')} />
        </FormField>
      </Lockable>

      <Lockable locked={isLocked('siteName')}>
        <fieldset className="flex flex-col gap-4 rounded-md border border-border p-3">
          <legend className="px-1 text-sm font-bold">현장</legend>
          <FormField label="현장 이름" hint="건물명이나 현장 이름" error={errors.siteName?.message}>
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
            label="출입·주의 메모"
            hint="출입 방법, 주차, 작업 시간 제한"
            error={errors.accessMemo?.message}
          >
            <Textarea {...register('accessMemo')} />
          </FormField>
        </fieldset>
      </Lockable>

      <Lockable locked={isLocked('clientId')}>
        <FormField label="고객" hint="명부의 고객(발주처·원청)" error={errors.clientId?.message}>
          {/* 제어 컴포넌트: 즉석으로 추가한 고객은 목록이 다시 그려진 뒤에야 옵션이 생기므로, 값을 먼저 넣어도 사라지지 않게 함 */}
          <Select
            value={clientId}
            onChange={(event) => setValue('clientId', event.target.value, { shouldDirty: true })}
          >
            <option value="">고객 선택</option>
            {clients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isActive ? '' : ' (숨김)'}
              </option>
            ))}
          </Select>
        </FormField>
        <InlineAdd
          label="목록에 없는 고객 추가"
          placeholder="새 고객 상호"
          isPending={createPartner.isPending}
          error={clientError}
          onAdd={addClient}
        />
        {clientId === '' && clients.length === 0 && (
          <p className="text-sm text-foreground/70">
            등록된 고객이 없습니다. 위에서 바로 추가할 수 있습니다
          </p>
        )}
      </Lockable>

      <Lockable locked={isLocked('managerId')}>
        <FormField label="담당자" hint="프로젝트 책임자(PM·소장)" error={errors.managerId?.message}>
          <Select
            value={managerId}
            onChange={(event) => setValue('managerId', event.target.value, { shouldDirty: true })}
          >
            <option value="">담당자 선택</option>
            {managers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.title ? ` (${item.title})` : ''}
                {item.status === 'LEFT' ? ' (퇴사)' : ''}
              </option>
            ))}
          </Select>
        </FormField>
      </Lockable>

      <Lockable locked={isLocked('tradeIds')}>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">공종 (여러 개 선택 가능)</legend>
          <div className="flex flex-wrap gap-2">
            {trades.map((trade) => (
              <label
                key={trade.id}
                className="flex min-h-touch items-center gap-2 rounded-md border border-border px-3"
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
        <fieldset className="flex flex-col gap-4 rounded-md border border-border p-3">
          <legend className="px-1 text-sm font-bold">일정</legend>
          <FormField label="계약일" error={errors.contractDate?.message}>
            <Input type="date" {...register('contractDate')} />
          </FormField>
          <FormField
            label="시작 예정일"
            hint="작업일지를 입력할 수 있는 기간이 됩니다"
            error={errors.plannedStart?.message}
          >
            <Input type="date" {...register('plannedStart')} />
          </FormField>
          <FormField label="종료 예정일" error={errors.plannedEnd?.message}>
            <Input type="date" {...register('plannedEnd')} />
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
        <Button type="submit" disabled={isBusy || (isEdit && !isDirty)}>
          {isBusy ? '저장 중' : isEdit ? '저장' : '프로젝트 등록'}
        </Button>
      )}
    </form>
  );
};
