import { emailVerifyRequestSchema, type EmailVerifyRequest } from '@field-note/shared';
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
import { getErrorCode, getErrorMessage } from '../lib/apiError';
import { queryKeys } from '../query/queryKeys';

const requestSchema = z.object({
  newEmail: z.email('올바른 이메일 주소를 입력해 주세요').max(254),
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해 주세요'),
});

type RequestForm = z.infer<typeof requestSchema>;

// 2단계: 새 주소로 받은 코드를 확인하면 이메일이 바뀜
const CodeStep = ({
  newEmail,
  onDone,
  onCancel,
}: {
  newEmail: string;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmailVerifyRequest>({
    resolver: zodResolver(emailVerifyRequestSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const { data, error } = await apiClient.POST('/api/v1/auth/email/verify', { body: values });

    if (!data) {
      setError('code', { message: getErrorMessage(error) });
      return;
    }

    queryClient.setQueryData(queryKeys.me(), data);
    onDone();
  });

  const resend = async () => {
    const { data, error } = await apiClient.POST('/api/v1/auth/email/resend');

    if (data) {
      setNotice('인증 코드를 다시 보냈습니다');
    } else {
      setError('root', { message: getErrorMessage(error) });
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <p className="text-sm">
        <strong>{newEmail}</strong>로 보낸 6자리 코드를 입력하면 이메일이 바뀝니다. 코드를 확인하기
        전까지는 기존 이메일이 유지됩니다
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
        {isSubmitting ? '확인 중' : '이메일 변경 완료'}
      </Button>
      <Button type="button" variant="secondary" onClick={resend}>
        코드 다시 받기
      </Button>
      <Button type="button" variant="secondary" onClick={onCancel}>
        취소
      </Button>
    </form>
  );
};

// 이메일 변경: 비밀번호를 다시 확인하고 새 주소를 인증해야 반영 (§6.7)
export const EmailChangeForm = () => {
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [isChanged, setChanged] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ newEmail, currentPassword }) => {
    setChanged(false);

    const normalized = newEmail.trim().toLowerCase();
    const { data, error } = await apiClient.POST('/api/v1/me/email/change', {
      body: { newEmail: normalized, currentPassword },
    });

    if (!data) {
      const code = getErrorCode(error);

      if (code === 'CURRENT_PASSWORD_INVALID') {
        setError('currentPassword', { message: getErrorMessage(error) });
      } else if (code === 'VALIDATION_ERROR') {
        setError('newEmail', { message: '이미 사용 중이거나 현재와 같은 이메일입니다' });
      } else {
        setError('root', { message: getErrorMessage(error) });
      }

      return;
    }

    reset();
    setPendingEmail(normalized);
  });

  if (pendingEmail) {
    return (
      <CodeStep
        newEmail={pendingEmail}
        onCancel={() => setPendingEmail(null)}
        onDone={() => {
          setPendingEmail(null);
          setChanged(true);
        }}
      />
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      {isChanged && (
        <Alert variant="info">이메일을 바꿨습니다. 이전 주소로 변경 알림을 보냈습니다</Alert>
      )}
      <FormField label="새 이메일" error={errors.newEmail?.message}>
        <Input type="email" autoComplete="email" inputMode="email" {...register('newEmail')} />
      </FormField>
      <FormField
        label="현재 비밀번호"
        hint="계정 보호를 위해 한 번 더 확인합니다"
        error={errors.currentPassword?.message}
      >
        <Input type="password" autoComplete="current-password" {...register('currentPassword')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '요청 중' : '인증 코드 받기'}
      </Button>
    </form>
  );
};
