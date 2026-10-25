import { loginIdSchema, passwordSchema, VALIDATION_MESSAGES } from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '../api/client';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { PasswordInput } from '../components/ui/password-input';
import { getErrorCode, getErrorMessage } from '../lib/apiError';
import { queryKeys } from '../query/queryKeys';

const formSchema = z
  .object({
    loginId: loginIdSchema,
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((values) => values.newPassword === values.newPasswordConfirm, {
    path: ['newPasswordConfirm'],
    message: VALIDATION_MESSAGES.PASSWORD_MISMATCH,
  });

type Form = z.infer<typeof formSchema>;

// 소셜 로그인만 쓰는 계정의 아이디·비밀번호 설정: 이미 소셜 로그인으로 본인이 확인되어 현재 비밀번호는 묻지 않음
export const PasswordSetForm = ({ onDone }: { onDone: () => void }) => {
  const queryClient = useQueryClient();
  const [isDone, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(formSchema),
    defaultValues: { loginId: '', newPassword: '', newPasswordConfirm: '' },
  });

  const onSubmit = handleSubmit(async ({ loginId, newPassword }) => {
    const { data, error } = await apiClient.POST('/api/v1/me/password/set', {
      body: { loginId, newPassword },
    });

    if (!data) {
      if (getErrorCode(error) === 'LOGIN_ID_TAKEN') {
        setError('loginId', { message: getErrorMessage(error) });
      } else {
        setError('root', { message: getErrorMessage(error) });
      }

      return;
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.socialMethods() });
    setDone(true);
  });

  if (isDone) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="info">
          아이디와 비밀번호를 설정했습니다. 이제 아이디로도 로그인할 수 있습니다
        </Alert>
        <Button onClick={onDone}>완료</Button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      <FormField
        label="아이디"
        hint="소문자·숫자·밑줄·하이픈 4~20자"
        error={errors.loginId?.message}
      >
        <Input
          placeholder="로그인에 쓸 아이디"
          autoComplete="username"
          autoCapitalize="none"
          {...register('loginId')}
        />
      </FormField>
      <FormField
        label="비밀번호"
        hint={VALIDATION_MESSAGES.PASSWORD_HINT}
        error={errors.newPassword?.message}
      >
        <PasswordInput
          placeholder="비밀번호를 입력하세요"
          autoComplete="new-password"
          {...register('newPassword')}
        />
      </FormField>
      <FormField label="비밀번호 확인" error={errors.newPasswordConfirm?.message}>
        <PasswordInput
          placeholder="비밀번호를 한 번 더 입력하세요"
          autoComplete="new-password"
          {...register('newPasswordConfirm')}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '설정 중' : '아이디·비밀번호 설정'}
      </Button>
    </form>
  );
};
