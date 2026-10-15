import { SOCIAL_PROVIDER_LABELS, socialProviderSchema } from '@field-note/shared';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '../components/ui/button';
import { navigateAway } from '../lib/navigation';
import { MOCK_SOCIAL_PROFILES } from '../mocks/data';

// 목업 모드 전용 가짜 소셜 로그인 화면 (실제 제공자 대신 계정을 골라 서버 콜백이 하던 일을 흉내 냄)
export const MockSocialPage = () => {
  const [params] = useSearchParams();
  const [isBusy, setBusy] = useState(false);
  const provider = socialProviderSchema.catch('kakao').parse(params.get('provider'));
  const label = SOCIAL_PROVIDER_LABELS[provider];

  const complete = async (profileKey: string | null) => {
    setBusy(true);

    const response = await fetch('/api/__mock/social/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        purpose: params.get('purpose'),
        profileKey,
        token: params.get('token') ?? undefined,
        agreed: params.get('agreed') ?? undefined,
      }),
    });
    const { redirect } = (await response.json()) as { redirect: string };

    navigateAway(redirect);
  };

  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-xl font-bold">가짜 {label} 로그인</h1>
      <p className="text-sm">목업 모드에서만 보이는 화면입니다. 로그인할 {label} 계정을 고르세요</p>
      {MOCK_SOCIAL_PROFILES.map((profile) => (
        <Button
          key={profile.key}
          variant="secondary"
          disabled={isBusy}
          onClick={() => complete(profile.key)}
        >
          {label} {profile.label} (
          {(provider === 'naver' ? null : profile.verifiedEmail) ?? '인증된 이메일 없음'})
        </Button>
      ))}
      <Button variant="secondary" disabled={isBusy} onClick={() => complete(null)}>
        취소 (동의하지 않음)
      </Button>
    </section>
  );
};
