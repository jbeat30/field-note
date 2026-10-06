import { loginRequestSchema, type LoginRequest } from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router';

import { apiClient } from '../api/client';
import { useMe } from '../auth/useMe';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { getErrorMessage } from '../lib/apiError';
import { queryKeys } from '../query/queryKeys';

export const LoginPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { loginId: '', password: '', isRemembered: true },
  });

  // 이미 로그인한 상태로 로그인 화면에 오면 홈으로
  if (me.data) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    const { data, error } = await apiClient.POST('/api/v1/auth/login', {
      body: { ...values, loginId: values.loginId.trim().toLowerCase() },
    });

    if (!data) {
      setError('root', { message: getErrorMessage(error) });
      return;
    }

    queryClient.setQueryData(queryKeys.me(), data);
    await navigate(data.isEmailVerified ? '/' : '/verify-email', { replace: true });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <h1 className="text-xl font-bold">로그인</h1>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      <FormField label="아이디" error={errors.loginId && '아이디를 입력해 주세요'}>
        <Input
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          {...register('loginId')}
        />
      </FormField>
      <FormField label="비밀번호" error={errors.password && '비밀번호를 입력해 주세요'}>
        <Input type="password" autoComplete="current-password" {...register('password')} />
      </FormField>
      <Controller
        control={control}
        name="isRemembered"
        render={({ field }) => (
          <label className="flex min-h-touch items-center gap-3 text-base">
            <Checkbox
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            로그인 상태 유지
          </label>
        )}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '로그인 중' : '로그인'}
      </Button>
      <Link
        className="min-h-touch content-center text-sm text-primary underline"
        to="/forgot-password"
      >
        비밀번호를 잊으셨나요?
      </Link>
      <p className="text-sm text-foreground/70">
        가입은 운영자가 보낸 초대 링크로만 할 수 있습니다
      </p>
    </form>
  );
};
