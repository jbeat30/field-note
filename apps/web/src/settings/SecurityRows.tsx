import { useState } from 'react';

import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';

import { EmailChangeForm } from './EmailChangeForm';
import { PasswordChangeForm } from './PasswordChangeForm';

type Target = 'password' | 'email' | null;

// 보안: 비밀번호·이메일을 줄마다 보이고 `변경`을 누르면 창에서 바꾼다 (긴 폼을 늘 펼쳐 두지 않음)
export const SecurityRows = ({ email }: { email?: string | null }) => {
  const [target, setTarget] = useState<Target>(null);

  return (
    <>
      <ul className="divide-y divide-line">
        <li className="flex min-h-touch items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="font-medium">비밀번호</p>
            <p className="text-sm text-foreground/70">바꾸면 다른 기기는 로그아웃됩니다</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            aria-label="비밀번호 변경하기"
            onClick={() => setTarget('password')}
          >
            변경
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
        open={target === 'password'}
        onOpenChange={(open) => !open && setTarget(null)}
        title="비밀번호 변경"
        description="현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿉니다"
      >
        <PasswordChangeForm />
      </Modal>
      <Modal
        open={target === 'email'}
        onOpenChange={(open) => !open && setTarget(null)}
        title="이메일 변경"
        description="새 이메일로 보낸 인증 코드를 입력하면 바뀝니다"
      >
        <EmailChangeForm />
      </Modal>
    </>
  );
};
