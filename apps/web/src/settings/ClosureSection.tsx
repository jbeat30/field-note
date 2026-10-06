import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';

import { apiClient } from '../api/client';
import { useSocialMethods } from '../auth/useSocial';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { getErrorCode, getErrorMessage } from '../lib/apiError';
import { resetClientState } from '../stores/resetClientState';

const formSchema = z.object({ currentPassword: z.string() });

type Form = z.infer<typeof formSchema>;

// 계정 해지: 비밀번호를 다시 확인하고, 요청하면 모든 기기에서 로그아웃되며 14일 뒤 삭제 (그 안에 메일 링크로 취소 가능)
export const ClosureSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const methods = useSocialMethods();
  const [isOpen, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(formSchema), defaultValues: { currentPassword: '' } });

  // 비밀번호 로그인이 없는 계정(소셜 로그인만 사용)은 확인할 비밀번호가 없음
  const needsPassword = methods.data?.hasPassword !== false;

  const onSubmit = handleSubmit(async ({ currentPassword }) => {
    if (needsPassword && !currentPassword) {
      setError('currentPassword', { message: '현재 비밀번호를 입력해 주세요' });
      return;
    }

    const { data, error } = await apiClient.POST('/api/v1/me/closure', {
      body: needsPassword ? { currentPassword } : {},
    });

    if (!data) {
      if (getErrorCode(error) === 'CURRENT_PASSWORD_INVALID') {
        setError('currentPassword', { message: getErrorMessage(error) });
      } else {
        setError('root', { message: getErrorMessage(error) });
      }

      return;
    }

    // 서버에서 이미 모든 기기가 로그아웃되었으므로 이 브라우저의 상태도 정리하고 안내 화면으로 이동
    await resetClientState(queryClient);
    await navigate('/closure/requested', { replace: true, state: { purgeAfter: data.purgeAfter } });
  });

  if (!isOpen) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground/70">
          해지를 요청하면 즉시 로그아웃되며, 14일이 지나면 회사의 모든 데이터가 삭제됩니다. 그
          안에는 메일로 받은 링크로 취소할 수 있습니다
        </p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          계정 해지
        </Button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <Alert>
        해지하면 회사의 프로젝트·기록이 14일 뒤 모두 삭제되며 복구할 수 없습니다. 삭제 전에는 메일의
        링크로 취소할 수 있습니다
      </Alert>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      {needsPassword && (
        <FormField label="현재 비밀번호" error={errors.currentPassword?.message}>
          <Input type="password" autoComplete="current-password" {...register('currentPassword')} />
        </FormField>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          돌아가기
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '요청 중' : '해지 요청'}
        </Button>
      </div>
    </form>
  );
};
