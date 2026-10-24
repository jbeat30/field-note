import {
  PARTNER_KIND_LABELS,
  PARTNER_MEMO_MAX_LENGTH,
  partnerUpdateSchema,
  type PartnerDetail,
} from '@field-note/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';

import { BackLink } from '../components/ui/back-link';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/ui/page-header';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { splitServerErrors } from '../lib/serverErrors';
import { getErrorDetailMessage } from '../lib/apiError';
import { useDeletePartner, usePartner, useUpdatePartner } from '../partners/usePartners';
import { LoadingBlock } from '../components/ui/loading-block';

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
  const remove = useDeletePartner(partner.id);
  const navigate = useNavigate();
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
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
      <PageHeader
        title={partner.name}
        back={<BackLink to="/partners">명부</BackLink>}
        eyebrow={
          <>
            <Badge tone="primary">{PARTNER_KIND_LABELS[partner.kind]}</Badge>
            {!partner.isActive && <Badge>숨김</Badge>}
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[3fr_2fr]">
        <div className="rounded-3xl bg-surface-subtle p-5">
          {saved && <Alert variant="info">{saved}</Alert>}
          {errors.root && <Alert>{errors.root.message}</Alert>}

          <form className="grid gap-4 md:grid-cols-2" onSubmit={save} noValidate>
            <FormField
              className="md:col-span-2"
              label="상호"
              hint="구분은 등록한 뒤 바꿀 수 없습니다"
              error={errors.name?.message}
            >
              <Input placeholder="상호명" {...register('name')} />
            </FormField>
            <FormField label="담당자" error={errors.contactName?.message}>
              <Input placeholder="담당자 이름" {...register('contactName')} />
            </FormField>
            <FormField label="연락처" error={errors.phone?.message}>
              <Input
                placeholder="010-0000-0000"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                {...register('phone')}
              />
            </FormField>
            <FormField
              className="md:col-span-2"
              label="메모"
              hint={`관리자만 보는 메모입니다 (${PARTNER_MEMO_MAX_LENGTH}자까지)`}
              error={errors.memo?.message}
            >
              <Textarea placeholder="메모를 입력하세요" {...register('memo')} />
            </FormField>
            <Button
              type="submit"
              className="h-14 rounded-[17px] text-base font-extrabold md:col-span-2 md:justify-self-end md:px-10"
              disabled={!isDirty || update.isPending}
            >
              {update.isPending ? '저장 중' : '저장'}
            </Button>
          </form>
        </div>

        <section
          className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
          aria-labelledby="active-heading"
        >
          <h2 id="active-heading" className="text-lg font-bold">
            사용 여부
          </h2>
          <p className="text-sm text-sub">
            숨겨도 이 업체가 쓰인 프로젝트·자재 기록의 상호는 그대로 남고, 새로 고를 때만 보이지
            않습니다
          </p>
          <Button variant="secondary" disabled={update.isPending} onClick={toggleActive}>
            {partner.isActive ? '숨기기' : '다시 사용'}
          </Button>
        </section>

        <section
          className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
          aria-labelledby="delete-heading"
        >
          <h2 id="delete-heading" className="text-lg font-bold">
            명부에서 삭제
          </h2>
          <p className="text-sm text-sub">
            잘못 등록했거나 쓰지 않는 업체를 지웁니다. 지운 업체는 되돌릴 수 없고, 프로젝트나 자재
            기록에서 쓰고 있는 업체는 지울 수 없습니다 (그때는 숨기기를 이용해 주세요)
          </p>
          {deleteError && <Alert>{deleteError}</Alert>}
          {isConfirmingDelete ? (
            <div className="flex flex-col gap-2 rounded-xl border border-danger p-4">
              <p className="text-sm">{partner.name}을(를) 명부에서 삭제할까요?</p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  disabled={remove.isPending}
                  onClick={() => {
                    setDeleteError('');
                    remove.mutate(undefined, {
                      onSuccess: () => void navigate('/partners', { replace: true }),
                      onError: (error) => {
                        setConfirmingDelete(false);
                        setDeleteError(getErrorDetailMessage(error));
                      },
                    });
                  }}
                >
                  삭제 확인
                </Button>
                <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
              삭제
            </Button>
          )}
        </section>
      </div>
    </div>
  );
};

// 명부 카드: 담당자·연락처·메모는 카드에서만 표시
export const PartnerCardPage = () => {
  const { id = '' } = useParams();
  const partner = usePartner(id);

  if (partner.isPending) {
    return <LoadingBlock label="업체 정보를 불러오는 중" variant="page" />;
  }

  if (partner.isError) {
    return <Alert>업체 정보를 불러오지 못했습니다</Alert>;
  }

  if (!partner.data) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">업체를 찾을 수 없습니다</h1>
        <Link className="min-h-touch content-center text-primary hover:text-sub" to="/partners">
          명부로
        </Link>
      </div>
    );
  }

  return <CardBody partner={partner.data} />;
};
