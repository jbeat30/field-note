import { createHmac, timingSafeEqual } from 'node:crypto';

import { Kakao } from 'arctic';
import { z } from 'zod';

// 소셜 제공자가 돌려주는 사용자 정보 (식별은 providerUserId로만, 이메일은 참고용)
export type SocialProfile = {
  providerUserId: string;
  // 제공자가 인증된 이메일이라고 보증한 경우에만 값이 있음 (§6.7 소셜 가입은 인증된 이메일을 줄 때만 인정)
  verifiedEmail: string | null;
};

// 소셜 제공자 추상화: 업무 코드는 카카오를 직접 알지 못함 (네이버·구글 추가와 로컬 가짜 제공자를 위해)
export type SocialProviderClient = {
  // 사용자를 보낼 제공자의 로그인 화면 주소
  createAuthorizationUrl: (state: string) => URL;
  // 돌아온 인가 코드를 사용자 정보로 교환
  exchangeCode: (code: string) => Promise<SocialProfile>;
};

// 카카오 사용자 정보 응답 중 필요한 부분만 검증 (나머지 필드는 무시)
const kakaoUserSchema = z.object({
  id: z.union([z.number(), z.string()]),
  kakao_account: z
    .object({
      email: z.string().optional(),
      is_email_valid: z.boolean().optional(),
      is_email_verified: z.boolean().optional(),
    })
    .optional(),
});

/**
 * @description 카카오 사용자 정보 응답을 내부 형식으로 변환 (이메일은 유효하고 인증된 경우에만 인정)
 * @param raw 카카오 사용자 정보 응답 본문
 * @returns 내부 사용자 정보
 * @throws 응답 형식이 예상과 다른 경우
 */
export const mapKakaoUser = (raw: unknown): SocialProfile => {
  const user = kakaoUserSchema.parse(raw);
  const account = user.kakao_account;
  const isVerified = Boolean(account?.email && account.is_email_valid && account.is_email_verified);

  return {
    providerUserId: String(user.id),
    verifiedEmail: isVerified ? account!.email!.trim().toLowerCase() : null,
  };
};

export type KakaoConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/**
 * @description 카카오 제공자 (arctic). 앱 등록 후 받은 키로만 동작
 * @param config 앱 키와 리다이렉트 주소
 * @returns 카카오 제공자
 */
export const createKakaoProvider = (config: KakaoConfig): SocialProviderClient => {
  const kakao = new Kakao(config.clientId, config.clientSecret, config.redirectUri);

  return {
    // 이메일 확인에 필요한 동의 항목만 요청
    createAuthorizationUrl: (state) => kakao.createAuthorizationURL(state, ['account_email']),
    exchangeCode: async (code) => {
      const tokens = await kakao.validateAuthorizationCode(code);
      const response = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${tokens.accessToken()}` },
      });

      if (!response.ok) {
        throw new Error(`[social.kakao] 사용자 정보 조회 실패 status=${response.status}`);
      }

      return mapKakaoUser(await response.json());
    },
  };
};

// 개발 환경 전용 가짜 제공자의 시연용 계정 (실제 카카오 계정이 아님)
export const FAKE_PROFILES: Record<string, SocialProfile & { label: string }> = {
  hanbit: {
    label: '한빛판금 관리자와 연동하는 계정',
    providerUserId: 'fake-kakao-hanbit',
    verifiedEmail: 'hanbit@example.com',
  },
  'new-verified': {
    label: '이메일이 인증된 새 카카오 계정',
    providerUserId: 'fake-kakao-new-verified',
    verifiedEmail: 'kakao-new@example.com',
  },
  'new-unverified': {
    label: '이메일이 인증되지 않은 새 카카오 계정',
    providerUserId: 'fake-kakao-new-unverified',
    verifiedEmail: null,
  },
  other: {
    label: '다른 새 카카오 계정',
    providerUserId: 'fake-kakao-other',
    verifiedEmail: 'kakao-other@example.com',
  },
};

const sign = (secret: string, payload: string) =>
  createHmac('sha256', secret).update(payload).digest('base64url');

/**
 * @description 가짜 인가 코드 생성 (선택한 시연용 계정을 서명해 담음)
 * @param secret 서명용 비밀 값
 * @param profileKey FAKE_PROFILES의 키
 * @returns `키.서명` 형식 코드
 */
export const signFakeCode = (secret: string, profileKey: string) =>
  `${profileKey}.${sign(secret, profileKey)}`;

/**
 * @description 개발 환경 전용 가짜 제공자. 실제 카카오 없이 연동·로그인·가입 흐름 전체를 테스트
 * 운영 환경에서는 만들어지지 않도록 호출하는 쪽(`chooseSocialProvider`)에서 막는다
 * @param options 서버 주소와 코드 서명용 비밀 값
 * @returns 가짜 제공자
 */
export const createFakeProvider = (options: {
  origin: string;
  secret: string;
}): SocialProviderClient => ({
  createAuthorizationUrl: (state) => {
    const url = new URL('/api/v1/dev/fake-kakao/authorize', options.origin);

    url.searchParams.set('state', state);

    return url;
  },
  exchangeCode: async (code) => {
    const [key = '', signature = ''] = code.split('.');
    const expected = Buffer.from(sign(options.secret, key));
    const actual = Buffer.from(signature);
    const profile = FAKE_PROFILES[key];

    if (!profile || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new Error('[social.fake] 잘못된 인가 코드');
    }

    return { providerUserId: profile.providerUserId, verifiedEmail: profile.verifiedEmail };
  },
});

export type SocialProviderChoice =
  | { kind: 'kakao'; client: SocialProviderClient }
  | { kind: 'fake'; client: SocialProviderClient }
  | { kind: 'none' };

type ChooseInput = {
  nodeEnv: 'development' | 'test' | 'production';
  appOrigin: string;
  kakao?: { clientId?: string; clientSecret?: string };
  fakeSecret: string;
};

/**
 * @description 환경에 맞는 소셜 제공자 선택
 * 카카오 키가 있으면 카카오, 키가 없고 개발 환경이면 가짜 제공자, 그 외(특히 운영)는 사용 안 함
 * 운영에서 키가 빠졌을 때 가짜 제공자로 대체되는 일이 없도록 이 함수가 유일한 선택 지점
 * @param input 환경 설정
 * @returns 선택 결과
 */
export const chooseSocialProvider = ({
  nodeEnv,
  appOrigin,
  kakao,
  fakeSecret,
}: ChooseInput): SocialProviderChoice => {
  const origin = new URL(appOrigin).origin;

  if (kakao?.clientId && kakao.clientSecret) {
    return {
      kind: 'kakao',
      client: createKakaoProvider({
        clientId: kakao.clientId,
        clientSecret: kakao.clientSecret,
        redirectUri: `${origin}/api/v1/auth/kakao/callback`,
      }),
    };
  }

  if (nodeEnv === 'development') {
    return { kind: 'fake', client: createFakeProvider({ origin, secret: fakeSecret }) };
  }

  return { kind: 'none' };
};
