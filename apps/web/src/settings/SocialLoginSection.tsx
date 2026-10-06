import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { SocialNotice } from '../auth/SocialNotice';
import { useKakaoLinkStart, useKakaoUnlink, useSocialMethods } from '../auth/useSocial';

// 소셜 로그인 연동: 이메일이 같다고 자동 연결하지 않고, 로그인한 상태에서만 연동 (§6.1)
export const SocialLoginSection = () => {
  const methods = useSocialMethods();
  const linkStart = useKakaoLinkStart();
  const unlink = useKakaoUnlink();

  if (methods.isPending) {
    return <p className="text-sm">연동 상태를 불러오는 중</p>;
  }

  if (methods.isError) {
    return <Alert>연동 상태를 불러오지 못했습니다</Alert>;
  }

  const { hasPassword, kakao } = methods.data;

  return (
    <div className="flex flex-col gap-3">
      <SocialNotice />
      {linkStart.isError && <Alert>{linkStart.error.message}</Alert>}
      {unlink.isError && <Alert>{unlink.error.message}</Alert>}
      <div className="flex min-h-touch items-center justify-between gap-3">
        <div>
          <p className="font-medium">카카오</p>
          <p className="text-sm text-foreground/70">
            {kakao.isLinked ? '연동됨' : '연동하지 않음'}
          </p>
        </div>
        {kakao.isLinked ? (
          <Button
            variant="secondary"
            aria-label="카카오 연동 해제"
            disabled={unlink.isPending || !hasPassword}
            onClick={() => unlink.mutate()}
          >
            해제
          </Button>
        ) : (
          <Button
            aria-label="카카오 연동"
            disabled={linkStart.isPending}
            onClick={() => linkStart.mutate()}
          >
            연동
          </Button>
        )}
      </div>
      {kakao.isLinked && !hasPassword && (
        <p className="text-sm text-foreground/70">
          비밀번호 로그인이 없어 연동을 해제할 수 없습니다. 로그인 수단이 하나는 남아 있어야 합니다
        </p>
      )}
    </div>
  );
};
