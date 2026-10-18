import {
  totpDisableSchema,
  totpRecoveryRegenerateSchema,
  VALIDATION_MESSAGES,
} from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '../api/client';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { PasswordInput } from '../components/ui/password-input';
import { getErrorCode, getErrorMessage } from '../lib/apiError';

const CODE_HINT = '인증 앱의 6자리 코드 또는 복구 코드';
const codeField = z.string().trim().min(1, VALIDATION_MESSAGES.required('인증 코드'));

const disableFormSchema = totpDisableSchema.extend({ code: codeField });
const regenerateFormSchema = totpRecoveryRegenerateSchema.extend({ code: codeField });

type DisableForm = z.infer<typeof disableFormSchema>;
type RegenerateForm = z.infer<typeof regenerateFormSchema>;

// 끄기: 비밀번호 로그인이 있는 계정은 현재 비밀번호도 다시 확인
export const TotpDisableForm = ({
  needsPassword,
  onDone,
}: {
  needsPassword: boolean;
  onDone: () => void;
}) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DisableForm>({
    resolver: zodResolver(disableFormSchema),
    defaultValues: { code: '', currentPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ code, currentPassword }) => {
    if (needsPassword && !currentPassword) {
      setError('currentPassword', { message: VALIDATION_MESSAGES.required('현재 비밀번호') });
      return;
    }

    const { data, error } = await apiClient.POST('/api/v1/me/totp/disable', {
      body: { code, currentPassword: needsPassword ? currentPassword : undefined },
    });

    if (!data) {
      const errorCode = getErrorCode(error);

      if (errorCode === 'CURRENT_PASSWORD_INVALID') {
        setError('currentPassword', { message: getErrorMessage(error) });
      } else if (errorCode === 'TOTP_INVALID') {
        setError('code', { message: getErrorMessage(error) });
      } else {
        setError('root', { message: getErrorMessage(error) });
      }

      return;
    }

    onDone();
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      {needsPassword && (
        <FormField label="현재 비밀번호" error={errors.currentPassword?.message}>
          <PasswordInput autoComplete="current-password" {...register('currentPassword')} />
        </FormField>
      )}
      <FormField label="인증 코드" hint={CODE_HINT} error={errors.code?.message}>
        <Input autoComplete="one-time-code" autoCapitalize="characters" {...register('code')} />
      </FormField>
      <Button type="submit" variant="danger" disabled={isSubmitting}>
        {isSubmitting ? '끄는 중' : '2단계 인증 끄기'}
      </Button>
    </form>
  );
};

// 복구 코드 다시 받기: 인증 코드로 본인 확인 후 이전 코드는 모두 무효가 됨
export const TotpRegenerateForm = ({ onDone }: { onDone: (recoveryCodes: string[]) => void }) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegenerateForm>({
    resolver: zodResolver(regenerateFormSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(async ({ code }) => {
    const { data, error } = await apiClient.POST('/api/v1/me/totp/recovery-codes', {
      body: { code },
    });

    if (!data) {
      setError(getErrorCode(error) === 'TOTP_INVALID' ? 'code' : 'root', {
        message: getErrorMessage(error),
      });
      return;
    }

    onDone(data.recoveryCodes);
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      <p className="text-sm">새 복구 코드를 받으면 이전 복구 코드는 모두 쓸 수 없게 됩니다</p>
      <FormField label="인증 코드" hint={CODE_HINT} error={errors.code?.message}>
        <Input autoComplete="one-time-code" autoCapitalize="characters" {...register('code')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '확인 중' : '새 복구 코드 받기'}
      </Button>
    </form>
  );
};
