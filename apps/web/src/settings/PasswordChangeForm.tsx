import { passwordSchema } from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '../api/client';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { getErrorCode, getErrorMessage } from '../lib/apiError';

const formSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해 주세요'),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((values) => values.newPassword === values.newPasswordConfirm, {
    path: ['newPasswordConfirm'],
    message: '비밀번호가 일치하지 않습니다',
  });

type Form = z.infer<typeof formSchema>;

// 로그인한 상태의 비밀번호 변경: 현재 비밀번호를 다시 확인하고, 바꾸면 다른 기기는 로그아웃됨
export const PasswordChangeForm = () => {
  const [isChanged, setChanged] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(formSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' },
  });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setChanged(false);

    const { data, error } = await apiClient.POST('/api/v1/me/password', {
      body: { currentPassword, newPassword },
    });

    if (!data) {
      // 현재 비밀번호 오류는 해당 입력 옆에, 잠금 등 그 외 오류는 폼 상단에 표시
      if (getErrorCode(error) === 'CURRENT_PASSWORD_INVALID') {
        setError('currentPassword', { message: getErrorMessage(error) });
      } else {
        setError('root', { message: getErrorMessage(error) });
      }

      return;
    }

    reset();
    setChanged(true);
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      {isChanged && (
        <Alert variant="info">
          비밀번호를 바꿨습니다. 이 기기를 제외한 다른 기기는 로그아웃되었습니다
        </Alert>
      )}
      <FormField label="현재 비밀번호" error={errors.currentPassword?.message}>
        <Input type="password" autoComplete="current-password" {...register('currentPassword')} />
      </FormField>
      <FormField label="새 비밀번호" hint="10자 이상" error={errors.newPassword?.message}>
        <Input type="password" autoComplete="new-password" {...register('newPassword')} />
      </FormField>
      <FormField label="새 비밀번호 확인" error={errors.newPasswordConfirm?.message}>
        <Input type="password" autoComplete="new-password" {...register('newPasswordConfirm')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '변경 중' : '비밀번호 변경'}
      </Button>
    </form>
  );
};
