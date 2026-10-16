import {
  emailVerifyRequestSchema,
  type EmailVerifyRequest,
  VALIDATION_MESSAGES,
} from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router';
import { z } from 'zod';

import { apiClient } from '../api/client';
import { useMe } from '../auth/useMe';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { getErrorCode, getErrorMessage } from '../lib/apiError';
import { queryKeys } from '../query/queryKeys';

const RESEND_WAIT_SECONDS = 30;

const entrySchema = z.object({
  newEmail: z.email(VALIDATION_MESSAGES.required('올바른 이메일 주소')).max(254),
});

type EntryForm = z.infer<typeof entrySchema>;

// 소셜 로그인으로 가입해 이메일이 아직 없는 계정: 계정 찾기에 쓸 이메일을 입력하면 인증 코드를 보냄
const EmailEntryForm = ({ onSent }: { onSent: (email: string) => void }) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: { newEmail: '' },
  });

  const onSubmit = handleSubmit(async ({ newEmail }) => {
    const normalized = newEmail.trim().toLowerCase();
    const { data, error } = await apiClient.POST('/api/v1/me/email/change', {
      body: { newEmail: normalized },
    });

    if (!data) {
      if (getErrorCode(error) === 'VALIDATION_ERROR') {
        setError('newEmail', { message: VALIDATION_MESSAGES.EMAIL_TAKEN });
      } else {
        setError('root', { message: getErrorMessage(error) });
      }

      return;
    }

    onSent(normalized);
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <h1 className="text-xl font-bold">이메일 등록</h1>
      <p className="text-sm">
        계정을 찾거나 알림을 받을 때 쓸 이메일을 입력해 주세요. 입력한 주소로 6자리 인증 코드를
        보냅니다
      </p>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      <FormField label="이메일" error={errors.newEmail?.message}>
        <Input type="email" autoComplete="email" inputMode="email" {...register('newEmail')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '요청 중' : '인증 코드 받기'}
      </Button>
    </form>
  );
};

// 가입 마지막 단계: 이메일로 받은 6자리 코드 확인 (인증이 끝나야 가입 완료)
export const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const [waitSeconds, setWaitSeconds] = useState(RESEND_WAIT_SECONDS);
  const [notice, setNotice] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmailVerifyRequest>({
    resolver: zodResolver(emailVerifyRequestSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (waitSeconds <= 0) {
      return;
    }

    const timer = setTimeout(() => setWaitSeconds((seconds) => seconds - 1), 1000);

    return () => clearTimeout(timer);
  }, [waitSeconds]);

  if (me.isPending) {
    return <p className="text-sm">확인 중</p>;
  }

  if (!me.data) {
    return <Navigate to="/login" replace />;
  }

  if (me.data.isEmailVerified) {
    return <Navigate to="/" replace />;
  }

  // 이메일이 없는 계정은 먼저 이메일을 입력해야 코드를 받음
  if (!me.data.email && !sentTo) {
    return (
      <EmailEntryForm
        onSent={(email) => {
          setSentTo(email);
          setWaitSeconds(RESEND_WAIT_SECONDS);
        }}
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    const { data, error } = await apiClient.POST('/api/v1/auth/email/verify', { body: values });

    if (!data) {
      setError('code', { message: getErrorMessage(error) });
      return;
    }

    queryClient.setQueryData(queryKeys.me(), data);
    await navigate('/', { replace: true });
  });

  const resend = async () => {
    const { data, error } = await apiClient.POST('/api/v1/auth/email/resend');

    if (!data) {
      setError('root', { message: getErrorMessage(error) });
      return;
    }

    setNotice('인증 코드를 다시 보냈습니다');
    setWaitSeconds(data.resendAfterSeconds);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <h1 className="text-xl font-bold">이메일 인증</h1>
      <p className="text-sm">
        <strong>{sentTo ?? me.data.email}</strong>로 보낸 6자리 코드를 입력해 주세요. 메일이 보이지
        않으면 스팸함을 확인해 주세요
      </p>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      {notice && <Alert variant="info">{notice}</Alert>}
      <FormField label="인증 코드" error={errors.code?.message}>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          {...register('code')}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '확인 중' : '인증하고 가입 완료'}
      </Button>
      <Button type="button" variant="secondary" onClick={resend} disabled={waitSeconds > 0}>
        {waitSeconds > 0 ? `코드 다시 받기 (${waitSeconds}초)` : '코드 다시 받기'}
      </Button>
    </form>
  );
};
