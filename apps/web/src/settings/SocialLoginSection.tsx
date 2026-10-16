import {
  SOCIAL_PROVIDER_KEYS,
  SOCIAL_PROVIDER_LABELS,
  type SocialMethodsResponse,
} from '@field-note/shared';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { SocialNotice } from '../auth/SocialNotice';
import { useSocialLinkStart, useSocialMethods, useSocialUnlink } from '../auth/useSocial';

// 소셜 로그인 연동: 이메일이 같다고 자동 연결하지 않고, 로그인한 상태에서만 연동
export const SocialLoginSection = () => {
  const methods = useSocialMethods();
  const linkStart = useSocialLinkStart();
  const unlink = useSocialUnlink();

  if (methods.isPending) {
    return <p className="text-sm">연동 상태를 불러오는 중</p>;
  }

  if (methods.isError) {
    return <Alert>연동 상태를 불러오지 못했습니다</Alert>;
  }

  const data: SocialMethodsResponse = methods.data;
  const linkedCount = SOCIAL_PROVIDER_KEYS.filter((provider) => data[provider].isLinked).length;
  // 비밀번호 로그인이 없고 연동이 하나뿐이면 그 연동이 마지막 로그인 수단이라 해제할 수 없음
  const isLastMethod = !data.hasPassword && linkedCount <= 1;

  return (
    <div className="flex flex-col gap-3">
      <SocialNotice />
      {linkStart.isError && <Alert>{linkStart.error.message}</Alert>}
      {unlink.isError && <Alert>{unlink.error.message}</Alert>}
      {SOCIAL_PROVIDER_KEYS.map((provider) => {
        const label = SOCIAL_PROVIDER_LABELS[provider];
        const { isLinked } = data[provider];

        return (
          <div key={provider} className="flex min-h-touch items-center justify-between gap-3">
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-foreground/70">{isLinked ? '연동됨' : '연동하지 않음'}</p>
            </div>
            {isLinked ? (
              <Button
                variant="secondary"
                aria-label={`${label} 연동 해제`}
                disabled={unlink.isPending || isLastMethod}
                onClick={() => unlink.mutate(provider)}
              >
                해제
              </Button>
            ) : (
              <Button
                aria-label={`${label} 연동`}
                disabled={linkStart.isPending}
                onClick={() => linkStart.mutate(provider)}
              >
                연동
              </Button>
            )}
          </div>
        );
      })}
      {isLastMethod && (
        <p className="text-sm text-foreground/70">
          비밀번호 로그인이 없어 연동을 해제할 수 없습니다. 로그인 수단이 하나는 남아 있어야 합니다
        </p>
      )}
    </div>
  );
};
