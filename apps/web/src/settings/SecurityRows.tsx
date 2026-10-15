import { useState } from 'react';

import { useSocialMethods } from '../auth/useSocial';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';

import { EmailChangeForm } from './EmailChangeForm';
import { PasswordChangeForm } from './PasswordChangeForm';
import { PasswordSetForm } from './PasswordSetForm';

// 창을 연 시점의 종류를 기억: 설정을 마치면 비밀번호가 생겨 화면이 바뀌어도 완료 안내가 유지되도록 함
type Target = 'password' | 'password-set' | 'email' | null;

// 보안: 비밀번호·이메일을 줄마다 보이고 `변경`을 누르면 창에서 바꾼다 (긴 폼을 늘 펼쳐 두지 않음)
// 소셜 로그인만 쓰는 계정은 비밀번호 줄이 `설정`이 되고, 이메일은 비밀번호 확인 없이 바꿈
export const SecurityRows = ({ email }: { email?: string | null }) => {
  const [target, setTarget] = useState<Target>(null);
  const methods = useSocialMethods();
  const hasPassword = methods.data?.hasPassword !== false;

  return (
    <>
      <ul className="divide-y divide-line">
        <li className="flex min-h-touch items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="font-medium">{hasPassword ? '비밀번호' : '아이디·비밀번호 로그인'}</p>
            <p className="text-sm text-foreground/70">
              {hasPassword
                ? '바꾸면 다른 기기는 로그아웃됩니다'
                : '설정하지 않음 · 설정하면 소셜 계정 없이도 로그인할 수 있습니다'}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            aria-label={hasPassword ? '비밀번호 변경하기' : '아이디·비밀번호 설정하기'}
            onClick={() => setTarget(hasPassword ? 'password' : 'password-set')}
          >
            {hasPassword ? '변경' : '설정'}
          </Button>
        </li>
        <li className="flex min-h-touch items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="font-medium">이메일</p>
            <p className="truncate text-sm text-foreground/70">{email ?? '-'}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            aria-label="이메일 변경하기"
            onClick={() => setTarget('email')}
          >
            변경
          </Button>
        </li>
      </ul>
      <Modal
        open={target === 'password' || target === 'password-set'}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target === 'password-set' ? '아이디·비밀번호 설정' : '비밀번호 변경'}
        description={
          target === 'password-set'
            ? '소셜 로그인 외에 아이디와 비밀번호로도 로그인할 수 있게 합니다'
            : '현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿉니다'
        }
      >
        {target === 'password-set' ? (
          <PasswordSetForm onDone={() => setTarget(null)} />
        ) : (
          <PasswordChangeForm />
        )}
      </Modal>
      <Modal
        open={target === 'email'}
        onOpenChange={(open) => !open && setTarget(null)}
        title="이메일 변경"
        description="새 이메일로 보낸 인증 코드를 입력하면 바뀝니다"
      >
        <EmailChangeForm needsPassword={hasPassword} />
      </Modal>
    </>
  );
};
