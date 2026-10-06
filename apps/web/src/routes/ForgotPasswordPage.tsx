import { passwordResetRequestSchema, type PasswordResetRequest } from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { apiClient } from '../api/client';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { getErrorMessage } from '../lib/apiError';

// 비밀번호를 잊었을 때: 가입 여부를 알려 주지 않도록 결과 문구는 항상 같음 (§6.7)
export const ForgotPasswordPage = () => {
  const [isRequested, setRequested] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetRequest>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    const { data, error } = await apiClient.POST('/api/v1/auth/password-reset/request', {
      body: { email: email.trim().toLowerCase() },
    });

    if (!data) {
      setError('root', { message: getErrorMessage(error) });
      return;
    }

    setRequested(true);
  });

  if (isRequested) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">메일을 확인해 주세요</h1>
        <Alert variant="info">
          가입된 주소라면 비밀번호 재설정 링크를 보냈습니다. 링크는 30분 동안, 한 번만 사용할 수
          있습니다. 메일이 보이지 않으면 스팸함을 확인해 주세요
        </Alert>
        <Link className="min-h-touch content-center text-primary underline" to="/login">
          로그인 화면으로
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <h1 className="text-xl font-bold">비밀번호 재설정</h1>
      <p className="text-sm">가입할 때 인증한 이메일 주소를 입력하면 재설정 링크를 보내 드립니다</p>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      <FormField label="이메일" error={errors.email && '올바른 이메일 주소를 입력해 주세요'}>
        <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '보내는 중' : '재설정 링크 받기'}
      </Button>
      <Link className="min-h-touch content-center text-primary underline" to="/login">
        로그인 화면으로
      </Link>
    </form>
  );
};
