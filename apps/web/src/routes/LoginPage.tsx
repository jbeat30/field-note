import { SOCIAL_PROVIDER_KEYS, loginRequestSchema, type LoginRequest } from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router';

import { apiClient } from '../api/client';
import { SocialButton } from '../auth/SocialButton';
import { SocialNotice } from '../auth/SocialNotice';
import { useMe } from '../auth/useMe';
import { useSocialProviders, useSocialStart } from '../auth/useSocial';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { PasswordInput } from '../components/ui/password-input';
import { getErrorCode, getErrorMessage } from '../lib/apiError';
import { queryKeys } from '../query/queryKeys';
import { resetClientState } from '../stores/resetClientState';

export const LoginPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const providers = useSocialProviders();
  const socialStart = useSocialStart();
  // 비밀번호가 맞고 2단계 인증이 켜진 계정이면 코드 입력 칸을 보여 줌
  const [isTotpStep, setTotpStep] = useState(false);
  const enabledProviders = SOCIAL_PROVIDER_KEYS.filter((provider) => providers.data?.[provider]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { loginId: '', password: '', isRemembered: true },
  });

  useEffect(() => {
    if (isTotpStep) {
      setFocus('totpCode');
    }
  }, [isTotpStep, setFocus]);

  // 이미 로그인한 상태로 로그인 화면에 오면 홈으로
  if (me.data) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    const { data, error } = await apiClient.POST('/api/v1/auth/login', {
      body: {
        ...values,
        loginId: values.loginId.trim().toLowerCase(),
        totpCode: values.totpCode?.trim() || undefined,
      },
    });

    if (!data) {
      const errorCode = getErrorCode(error);

      // 처음 요청에서 코드가 필요하다고 하면 칸을 열고, 이미 열린 뒤의 같은 응답은 입력 안내로 표시
      if (errorCode === 'TOTP_REQUIRED' && !isTotpStep) {
        setTotpStep(true);
      } else if (errorCode === 'TOTP_REQUIRED' || errorCode === 'TOTP_INVALID') {
        setError('totpCode', { message: getErrorMessage(error) });
      } else {
        setError('root', { message: getErrorMessage(error) });
      }

      return;
    }

    // 세션이 만료된 채 남은 이전 사용자의 화면 데이터가 새 로그인에 섞이지 않게 비움
    await resetClientState(queryClient);
    queryClient.setQueryData(queryKeys.me(), data);
    await navigate(data.isEmailVerified ? '/' : '/verify-email', { replace: true });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <h1 className="text-xl font-bold">로그인</h1>
      <SocialNotice />
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
        <PasswordInput autoComplete="current-password" {...register('password')} />
      </FormField>
      {isTotpStep && (
        <>
          <Alert variant="info">
            2단계 인증이 켜진 계정입니다. 인증 앱에 나온 코드를 입력해 주세요
          </Alert>
          <FormField
            label="인증 코드"
            hint="인증 앱의 6자리 코드 (휴대폰을 잃어버렸다면 복구 코드)"
            error={errors.totpCode?.message}
          >
            <Input
              inputMode="text"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              autoCorrect="off"
              {...register('totpCode', {
                setValueAs: (value: unknown) =>
                  typeof value === 'string' && value.trim() ? value.trim() : undefined,
              })}
            />
          </FormField>
        </>
      )}
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
      {enabledProviders.length > 0 && (
        <>
          <p className="text-center text-sm text-foreground/70">또는</p>
          {enabledProviders.map((provider) => (
            <SocialButton
              key={provider}
              provider={provider}
              action="로그인"
              disabled={socialStart.isPending}
              onClick={() => socialStart.mutate({ provider, body: { purpose: 'login' } })}
            />
          ))}
          {socialStart.isError && <Alert>{socialStart.error.message}</Alert>}
        </>
      )}
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
