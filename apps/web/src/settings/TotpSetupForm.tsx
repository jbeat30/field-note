import { totpEnableSchema, type TotpEnable, type TotpSetupResponse } from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { apiClient } from '../api/client';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { getErrorCode, getErrorMessage } from '../lib/apiError';

// 키를 4자씩 끊어 읽기 쉽게 표시 (직접 입력할 때용)
const groupSecret = (secret: string) => secret.match(/.{1,4}/g)?.join(' ') ?? secret;

// 인증 앱 등록: QR 코드(또는 키 직접 입력) → 앱에 보이는 6자리 코드로 확인
export const TotpSetupForm = ({
  setup,
  onEnabled,
}: {
  setup: TotpSetupResponse;
  onEnabled: (recoveryCodes: string[]) => void;
}) => {
  const [qr, setQr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TotpEnable>({
    resolver: zodResolver(totpEnableSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    let isCurrent = true;

    // 키는 이 브라우저 안에서만 QR로 바꿈 (외부 QR 서비스로 보내지 않음)
    void QRCode.toDataURL(setup.otpauthUrl, { margin: 1, width: 192 }).then((url) => {
      if (isCurrent) {
        setQr(url);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [setup.otpauthUrl]);

  const onSubmit = handleSubmit(async ({ code }) => {
    const { data, error } = await apiClient.POST('/api/v1/me/totp/enable', { body: { code } });

    if (!data) {
      setError(getErrorCode(error) === 'TOTP_INVALID' ? 'code' : 'root', {
        message: getErrorMessage(error),
      });
      return;
    }

    onEnabled(data.recoveryCodes);
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
        <li>휴대폰에 인증 앱을 설치합니다 (구글 OTP, Microsoft Authenticator 등)</li>
        <li>앱에서 계정 추가를 누르고 아래 QR 코드를 읽습니다</li>
        <li>앱에 나온 6자리 숫자를 아래에 입력합니다</li>
      </ol>
      <div className="flex flex-col items-center gap-2">
        {qr ? (
          <img
            src={qr}
            alt="인증 앱 등록 QR 코드"
            width={192}
            height={192}
            className="rounded-lg"
          />
        ) : (
          <div aria-hidden className="size-48 animate-pulse rounded-lg bg-muted" />
        )}
        <p className="text-sm text-sub">QR 코드를 읽을 수 없으면 아래 키를 앱에 입력하세요</p>
        <p className="font-mono text-base tracking-wider break-all" aria-label="인증 키">
          {groupSecret(setup.secret)}
        </p>
      </div>
      <FormField label="인증 앱의 6자리 코드" error={errors.code?.message}>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          {...register('code')}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '확인 중' : '확인하고 켜기'}
      </Button>
    </form>
  );
};
