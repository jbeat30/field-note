import { passwordSchema } from '@field-note/shared';
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
import { getErrorMessage } from '../lib/apiError';
import { resetClientState } from '../stores/resetClientState';

const resetFormSchema = z
  .object({ newPassword: passwordSchema, newPasswordConfirm: z.string() })
  .refine((values) => values.newPassword === values.newPasswordConfirm, {
    path: ['newPasswordConfirm'],
    message: '비밀번호가 일치하지 않습니다',
  });

type ResetForm = z.infer<typeof resetFormSchema>;

const InvalidLink = () => (
  <div className="flex flex-col gap-3">
    <h1 className="text-xl font-bold">링크를 사용할 수 없습니다</h1>
    <p className="text-sm">
      링크가 만료되었거나 이미 사용되었을 수 있습니다. 재설정 링크를 다시 받아 주세요
    </p>
    <Link className="min-h-touch content-center text-primary underline" to="/forgot-password">
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
        return false;
      }

      if (!data) {
        throw new Error('[web.ResetPasswordPage] 링크 확인 실패');
      }

      return true;
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
    defaultValues: { newPassword: '', newPasswordConfirm: '' },
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
        <h1 className="text-xl font-bold">비밀번호를 바꿨습니다</h1>
        <Alert variant="info">
          모든 기기에서 로그아웃되었습니다. 새 비밀번호로 다시 로그인해 주세요
        </Alert>
        <Link className="min-h-touch content-center text-primary underline" to="/login">
          로그인 화면으로
        </Link>
      </div>
    );
  }

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    const { data, error, response } = await apiClient.POST('/api/v1/auth/password-reset/confirm', {
      body: { token, newPassword },
    });

    if (!data) {
      setError('root', {
        message:
          response.status === 404
            ? '링크가 만료되었거나 이미 사용되었습니다'
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
      <h1 className="text-xl font-bold">새 비밀번호 설정</h1>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      <FormField label="새 비밀번호" hint="10자 이상" error={errors.newPassword?.message}>
        <Input type="password" autoComplete="new-password" {...register('newPassword')} />
      </FormField>
      <FormField label="새 비밀번호 확인" error={errors.newPasswordConfirm?.message}>
        <Input type="password" autoComplete="new-password" {...register('newPasswordConfirm')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '저장 중' : '비밀번호 바꾸기'}
      </Button>
    </form>
  );
};
