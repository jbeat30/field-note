import { passwordSchema, VALIDATION_MESSAGES } from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { z } from 'zod';

import { apiClient } from '../api/client';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { PasswordInput } from '../components/ui/password-input';
import { getErrorCode, getErrorMessage } from '../lib/apiError';
import { resetClientState } from '../stores/resetClientState';

const resetFormSchema = z
  .object({
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
    // 2단계 인증을 켠 계정만 입력
    totpCode: z.string().optional(),
  })
  .refine((values) => values.newPassword === values.newPasswordConfirm, {
    path: ['newPasswordConfirm'],
    message: VALIDATION_MESSAGES.PASSWORD_MISMATCH,
  });

type ResetForm = z.infer<typeof resetFormSchema>;

const InvalidLink = () => (
  <div className="flex flex-col gap-3">
    <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.025em]">
      링크를 사용할 수 없습니다
    </h1>
    <p className="text-sm">
      링크가 만료되었거나 이미 사용되었을 수 있습니다. 재설정 링크를 다시 받아 주세요
    </p>
    <Link
      className="min-h-touch content-center font-bold underline decoration-accent decoration-2 underline-offset-4"
      to="/forgot-password"
    >
      재설정 링크 다시 받기
    </Link>
  </div>
);

// 메일의 링크로 들어오는 새 비밀번호 설정 화면 (링크는 한 번만 사용, 완료하면 모든 기기 로그아웃)
export const ResetPasswordPage = () => {
  const { token = '' } = useParams();
  const queryClient = useQueryClient();
  const [isDone, setDone] = useState(false);
  const link = useQuery({
    queryKey: ['password-reset-link', 'detail', { token }],
    queryFn: async () => {
      const { data, response } = await apiClient.GET('/api/v1/auth/password-reset/{token}', {
        params: { path: { token } },
      });

      // 사용·만료·없는 링크는 서버가 구분하지 않으므로 화면도 같은 안내
      if (response.status === 404) {
        return null;
      }

      if (!data) {
        throw new Error('[web.ResetPasswordPage] 링크 확인 실패');
      }

      return { requiresTotp: data.requiresTotp };
    },
    retry: false,
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { newPassword: '', newPasswordConfirm: '', totpCode: '' },
  });

  if (link.isPending) {
    return <p className="text-sm">링크 확인 중</p>;
  }

  if (link.isError) {
    return <Alert>서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요</Alert>;
  }

  if (!link.data && !isDone) {
    return <InvalidLink />;
  }

  if (isDone) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.025em]">
          비밀번호를 바꿨습니다
        </h1>
        <Alert variant="info">
          모든 기기에서 로그아웃되었습니다. 새 비밀번호로 다시 로그인해 주세요
        </Alert>
        <Link
          className="min-h-touch content-center font-bold underline decoration-accent decoration-2 underline-offset-4"
          to="/login"
        >
          로그인 화면으로
        </Link>
      </div>
    );
  }

  const requiresTotp = link.data?.requiresTotp === true;

  const onSubmit = handleSubmit(async ({ newPassword, totpCode }) => {
    const { data, error, response } = await apiClient.POST('/api/v1/auth/password-reset/confirm', {
      body: {
        token,
        newPassword,
        totpCode: requiresTotp ? totpCode?.trim() || undefined : undefined,
      },
    });

    if (!data) {
      const errorCode = getErrorCode(error);

      if (errorCode === 'TOTP_REQUIRED' || errorCode === 'TOTP_INVALID') {
        setError('totpCode', { message: getErrorMessage(error) });
        return;
      }

      setError('root', {
        message:
          response.status === 404
            ? VALIDATION_MESSAGES.LINK_EXPIRED_OR_USED
            : getErrorMessage(error),
      });
      return;
    }

    // 이 브라우저에 남은 로그인 상태도 함께 정리
    await resetClientState(queryClient);
    setDone(true);
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.025em]">
        새 비밀번호 설정
      </h1>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      <FormField
        label="새 비밀번호"
        hint={VALIDATION_MESSAGES.PASSWORD_HINT}
        error={errors.newPassword?.message}
      >
        <PasswordInput autoComplete="new-password" {...register('newPassword')} />
      </FormField>
      <FormField label="새 비밀번호 확인" error={errors.newPasswordConfirm?.message}>
        <PasswordInput autoComplete="new-password" {...register('newPasswordConfirm')} />
      </FormField>
      {requiresTotp && (
        <FormField
          label="인증 코드"
          hint="2단계 인증이 켜진 계정입니다. 인증 앱의 6자리 코드 또는 복구 코드를 입력해 주세요"
          error={errors.totpCode?.message}
        >
          <Input
            autoComplete="one-time-code"
            autoCapitalize="characters"
            autoCorrect="off"
            {...register('totpCode')}
          />
        </FormField>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '저장 중' : '비밀번호 바꾸기'}
      </Button>
    </form>
  );
};
