import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SocialProviderKey, SocialResult, SocialStartRequest } from '@field-note/shared';
import { SOCIAL_RESULTS } from '@field-note/shared';

import { apiClient } from '../api/client';
import { getErrorMessage } from '../lib/apiError';
import { navigateAway } from '../lib/navigation';
import { queryKeys } from '../query/queryKeys';

// 서버가 켠 소셜 로그인 제공자 (앱 등록 전 운영에서는 꺼져 있음)
export const useSocialProviders = () =>
  useQuery({
    queryKey: queryKeys.socialProviders(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/auth/social/providers');

      return data ?? { kakao: false, naver: false, google: false };
    },
    staleTime: 5 * 60_000,
  });

// 제공자 로그인 화면으로 이동 (로그인·가입), 서버가 돌려준 주소로만 이동
export const useSocialStart = () =>
  useMutation({
    mutationFn: async ({
      provider,
      body,
    }: {
      provider: SocialProviderKey;
      body: SocialStartRequest;
    }) => {
      const { data, error } = await apiClient.POST('/api/v1/auth/{provider}/start', {
        params: { path: { provider } },
        body,
      });

      if (!data) {
        throw new Error(getErrorMessage(error));
      }

      navigateAway(data.url);
    },
  });

// 주소의 `?social=` 값을 화면에 보여줄 결과로 해석 (알 수 없는 값은 무시)
export const parseSocialResult = (value: string | null): SocialResult | null =>
  SOCIAL_RESULTS.find((result) => result === value) ?? null;

export const SOCIAL_RESULT_MESSAGES: Record<
  SocialResult,
  { text: string; tone: 'info' | 'danger' }
> = {
  linked: { text: '소셜 계정을 연동했습니다', tone: 'info' },
  cancelled: { text: '소셜 로그인을 취소했습니다', tone: 'danger' },
  failed: {
    text: '소셜 로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요',
    tone: 'danger',
  },
  'not-linked': {
    text: '연결된 계정이 없습니다. 운영자가 보낸 초대 링크로 가입하거나, 아이디로 로그인한 뒤 설정에서 소셜 계정을 연동해 주세요',
    tone: 'danger',
  },
  'already-linked': { text: '이미 다른 계정에 연동된 소셜 계정입니다', tone: 'danger' },
  'email-taken': { text: '이미 사용 중인 이메일입니다', tone: 'danger' },
  'invitation-invalid': { text: '초대 링크가 만료되었거나 이미 사용되었습니다', tone: 'danger' },
  closing: {
    text: '해지 요청 중인 계정입니다. 메일로 받은 해지 취소 링크로 복구할 수 있습니다',
    tone: 'danger',
  },
};

// 로그인 수단 조회·해제 (설정 화면)
export const useSocialMethods = () =>
  useQuery({
    queryKey: queryKeys.socialMethods(),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/me/social');

      if (!data) {
        throw new Error('[web.useSocialMethods] 연동 상태 조회 실패');
      }

      return data;
    },
  });

export const useSocialLinkStart = () =>
  useMutation({
    mutationFn: async (provider: SocialProviderKey) => {
      const { data, error } = await apiClient.POST('/api/v1/me/social/{provider}/start', {
        params: { path: { provider } },
      });

      if (!data) {
        throw new Error(getErrorMessage(error));
      }

      navigateAway(data.url);
    },
  });

export const useSocialUnlink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: SocialProviderKey) => {
      const { error } = await apiClient.DELETE('/api/v1/me/social/{provider}', {
        params: { path: { provider } },
      });

      if (error) {
        throw new Error(getErrorMessage(error));
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.socialMethods() }),
  });
};
