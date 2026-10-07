import {
  PARTNER_KIND_LABELS,
  PARTNER_MEMO_MAX_LENGTH,
  partnerUpdateSchema,
  type PartnerDetail,
} from '@field-note/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { splitServerErrors } from '../lib/serverErrors';
import { usePartner, useUpdatePartner } from '../partners/usePartners';

type CardForm = { name: string; contactName: string; phone: string; memo: string };

const FIELDS = ['name', 'contactName', 'phone', 'memo'] as const;

const toForm = (partner: PartnerDetail): CardForm => ({
  name: partner.name,
  contactName: partner.contactName ?? '',
  phone: partner.phone ?? '',
  memo: partner.memo ?? '',
});

const orNull = (value: string) => value.trim() || null;

const CardBody = ({ partner }: { partner: PartnerDetail }) => {
  const update = useUpdatePartner(partner.id);
  const [saved, setSaved] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<CardForm>({ values: toForm(partner) });

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
    const parsed = partnerUpdateSchema.safeParse({
      name: values.name,
      contactName: orNull(values.contactName),
      phone: orNull(values.phone),
      memo: values.memo.trim() ? values.memo : null,
    });

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

  const toggleActive = () => {
    setSaved('');
    update.mutate(
      { isActive: !partner.isActive },
      {
        onSuccess: (updated) => {
          reset(toForm(updated));
          setSaved(
            updated.isActive ? '다시 사용합니다' : '숨겼습니다. 이미 기록된 상호는 그대로 남습니다',
          );
        },
        onError: applyErrors,
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link className="min-h-touch content-center text-sm text-primary underline" to="/partners">
          ← 명부
        </Link>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
          {partner.name}
          <span className="rounded bg-muted px-2 py-0.5 text-sm font-normal">
            {PARTNER_KIND_LABELS[partner.kind]}
          </span>
          {!partner.isActive && (
            <span className="rounded bg-muted px-2 py-0.5 text-sm font-normal">숨김</span>
          )}
        </h1>
      </div>

      {saved && <Alert variant="info">{saved}</Alert>}
      {errors.root && <Alert>{errors.root.message}</Alert>}

      <form className="flex flex-col gap-4" onSubmit={save} noValidate>
        <FormField
          label="상호"
          hint="구분은 등록한 뒤 바꿀 수 없습니다"
          error={errors.name?.message}
        >
          <Input {...register('name')} />
        </FormField>
        <FormField label="담당자" error={errors.contactName?.message}>
          <Input {...register('contactName')} />
        </FormField>
        <FormField label="연락처" error={errors.phone?.message}>
          <Input type="tel" inputMode="tel" autoComplete="off" {...register('phone')} />
        </FormField>
        {partner.phone && (
          <a
            className="min-h-touch content-center text-sm text-primary underline"
            href={`tel:${partner.phone}`}
          >
            전화 걸기 ({partner.phone})
          </a>
        )}
        <FormField
          label="메모"
          hint={`관리자만 보는 메모입니다 (${PARTNER_MEMO_MAX_LENGTH}자까지)`}
          error={errors.memo?.message}
        >
          <Textarea {...register('memo')} />
        </FormField>
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending ? '저장 중' : '저장'}
        </Button>
      </form>

      <section className="flex flex-col gap-3" aria-labelledby="active-heading">
        <h2 id="active-heading" className="text-lg font-bold">
          사용 여부
        </h2>
        <p className="text-sm text-foreground/70">
          삭제하지 않고 숨깁니다. 숨겨도 이 업체가 쓰인 프로젝트·자재 기록의 상호는 그대로 남고,
          새로 고를 때만 보이지 않습니다
        </p>
        <Button variant="secondary" disabled={update.isPending} onClick={toggleActive}>
          {partner.isActive ? '숨기기' : '다시 사용'}
        </Button>
      </section>
    </div>
  );
};

// 명부 카드: 담당자·연락처·메모는 카드에서만 표시
export const PartnerCardPage = () => {
  const { id = '' } = useParams();
  const partner = usePartner(id);

  if (partner.isPending) {
    return <p className="text-sm">업체 정보를 불러오는 중</p>;
  }

  if (partner.isError) {
    return <Alert>업체 정보를 불러오지 못했습니다</Alert>;
  }

  if (!partner.data) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">업체를 찾을 수 없습니다</h1>
        <Link className="min-h-touch content-center text-primary underline" to="/partners">
          명부로
        </Link>
      </div>
    );
  }

  return <CardBody partner={partner.data} />;
};
