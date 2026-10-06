import {
  loginIdSchema,
  passwordSchema,
  type InvitationResponse,
  type LegalDocumentSummary,
} from '@field-note/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';

import { apiClient } from '../api/client';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { getErrorCode, getErrorMessage } from '../lib/apiError';
import { queryKeys } from '../query/queryKeys';

// 가입 1단계: 약관 동의와 만 14세 확인 (필수와 선택 구분, §5.7)
type ConsentStepProps = {
  invitation: InvitationResponse;
  onNext: (consents: { documentId: string; isAgreed: boolean }[]) => void;
};

const ConsentStep = ({ invitation, onNext }: ConsentStepProps) => {
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [isAgeConfirmed, setAgeConfirmed] = useState(false);

  const required = invitation.documents.filter((document) => document.isRequired);
  const isAll = invitation.documents.every((document) => agreed[document.id]) && isAgeConfirmed;
  const canProceed = required.every((document) => agreed[document.id]) && isAgeConfirmed;

  const toggleAll = (checked: boolean) => {
    setAgreed(Object.fromEntries(invitation.documents.map((document) => [document.id, checked])));
    setAgeConfirmed(checked);
  };

  const renderDocument = (document: LegalDocumentSummary) => (
    <div key={document.id} className="flex min-h-touch items-center gap-3">
      <label className="flex flex-1 items-center gap-3">
        <Checkbox
          checked={agreed[document.id] ?? false}
          onCheckedChange={(checked) =>
            setAgreed((current) => ({ ...current, [document.id]: checked === true }))
          }
        />
        <span>
          <span className="text-sm text-foreground/70">
            {document.isRequired ? '[필수] ' : '[선택] '}
          </span>
          {document.title}
        </span>
      </label>
      <Link
        className="min-h-touch content-center px-2 text-sm text-primary underline"
        to={document.path}
        target="_blank"
      >
        보기
      </Link>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{invitation.companyName}</h1>
        <p className="mt-1 text-sm">
          {invitation.adminName}님을 위한 초대입니다. 약관을 확인하고 동의해 주세요
        </p>
      </div>
      <label className="flex min-h-touch items-center gap-3 border-b border-border pb-2 font-medium">
        <Checkbox checked={isAll} onCheckedChange={(checked) => toggleAll(checked === true)} />
        전체 동의
      </label>
      {invitation.documents.map(renderDocument)}
      <label className="flex min-h-touch items-center gap-3">
        <Checkbox
          checked={isAgeConfirmed}
          onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
        />
        <span>
          <span className="text-sm text-foreground/70">[필수] </span>만 14세 이상입니다
        </span>
      </label>
      <Button
        disabled={!canProceed}
        onClick={() =>
          onNext(
            invitation.documents.map((document) => ({
              documentId: document.id,
              isAgreed: agreed[document.id] ?? false,
            })),
          )
        }
      >
        다음
      </Button>
    </div>
  );
};

const accountFormSchema = z
  .object({
    loginId: loginIdSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
    email: z.email('올바른 이메일 주소를 입력해 주세요').max(254),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 일치하지 않습니다',
  });

type AccountForm = z.infer<typeof accountFormSchema>;

// 가입 2단계: 아이디·비밀번호·이메일
type AccountStepProps = {
  inviteToken: string;
  consents: { documentId: string; isAgreed: boolean }[];
  onBack: () => void;
};

const AccountStep = ({ inviteToken, consents, onBack }: AccountStepProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { loginId: '', password: '', passwordConfirm: '', email: '' },
  });

  const onSubmit = handleSubmit(async ({ loginId, password, email }) => {
    const { data, error } = await apiClient.POST('/api/v1/auth/signup', {
      body: {
        inviteToken,
        loginId: loginId.toLowerCase(),
        password,
        email: email.trim().toLowerCase(),
        isAgeConfirmed: true,
        consents,
      },
    });

    if (!data) {
      // 아이디 중복은 해당 입력 옆에, 그 외 오류는 폼 상단에 표시
      if (getErrorCode(error) === 'LOGIN_ID_TAKEN') {
        setError('loginId', { message: getErrorMessage(error) });
      } else {
        setError('root', { message: getErrorMessage(error) });
      }

      return;
    }

    // 가입 직후 로그인 상태(이메일 미인증)이므로 내 정보를 다시 읽어 인증 화면으로 이동
    await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    await navigate('/verify-email', { replace: true });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <h1 className="text-xl font-bold">계정 만들기</h1>
      {errors.root && <Alert>{errors.root.message}</Alert>}
      <FormField
        label="아이디"
        hint="소문자·숫자·밑줄·하이픈 4~20자"
        error={errors.loginId?.message}
      >
        <Input
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          {...register('loginId')}
        />
      </FormField>
      <FormField label="비밀번호" hint="10자 이상" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...register('password')} />
      </FormField>
      <FormField label="비밀번호 확인" error={errors.passwordConfirm?.message}>
        <Input type="password" autoComplete="new-password" {...register('passwordConfirm')} />
      </FormField>
      <FormField
        label="이메일"
        hint="본인 확인, 비밀번호 재설정, 서비스 안내에 사용합니다"
        error={errors.email?.message}
      >
        <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '가입 중' : '가입하고 인증 코드 받기'}
      </Button>
      <Button type="button" variant="secondary" onClick={onBack}>
        이전
      </Button>
    </form>
  );
};

export const InviteSignupPage = () => {
  const { token = '' } = useParams();
  const [consents, setConsents] = useState<{ documentId: string; isAgreed: boolean }[] | null>(
    null,
  );
  const invitation = useQuery({
    queryKey: queryKeys.invitation(token),
    queryFn: async () => {
      const { data, response } = await apiClient.GET('/api/v1/invitations/{token}', {
        params: { path: { token } },
      });

      // 만료·사용 완료·존재하지 않는 링크는 서버가 구분하지 않으므로 화면도 같은 안내
      if (response.status === 404) {
        return null;
      }

      if (!data) {
        throw new Error('[web.InviteSignupPage] 초대 확인 실패');
      }

      return data;
    },
    retry: false,
  });

  if (invitation.isPending) {
    return <p className="text-sm">초대 링크 확인 중</p>;
  }

  if (invitation.isError) {
    return <Alert>서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요</Alert>;
  }

  if (!invitation.data) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">초대 링크를 사용할 수 없습니다</h1>
        <p className="text-sm">
          링크가 만료되었거나 이미 사용되었을 수 있습니다. 운영자에게 새 링크를 요청해 주세요
        </p>
        <Link className="min-h-touch content-center text-primary underline" to="/login">
          로그인 화면으로
        </Link>
      </div>
    );
  }

  return consents ? (
    <AccountStep inviteToken={token} consents={consents} onBack={() => setConsents(null)} />
  ) : (
    <ConsentStep invitation={invitation.data} onNext={setConsents} />
  );
};
