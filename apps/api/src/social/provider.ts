import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  SOCIAL_PROVIDER_KEYS,
  SOCIAL_PROVIDER_LABELS,
  type SocialProviderKey,
} from '@field-note/shared';
import { Google, Kakao } from 'arctic';
import { z } from 'zod';

// 소셜 제공자가 돌려주는 사용자 정보 (식별은 providerUserId로만, 이메일은 참고용)
export type SocialProfile = {
  providerUserId: string;
  // 제공자가 인증된 이메일이라고 보증한 경우에만 값이 있음 (소셜 가입은 인증된 이메일을 줄 때만 인정)
  verifiedEmail: string | null;
};

// 소셜 제공자 추상화: 업무 코드는 제공자를 직접 알지 못함 (카카오·네이버·구글과 로컬 가짜 제공자를 같은 방식으로 다룸)
// codeVerifier는 PKCE를 쓰는 제공자(구글)만 사용하고 나머지는 무시
export type SocialProviderClient = {
  // 사용자를 보낼 제공자의 로그인 화면 주소
  createAuthorizationUrl: (state: string, codeVerifier: string) => URL;
  // 돌아온 인가 코드를 사용자 정보로 교환
  exchangeCode: (code: string, state: string, codeVerifier: string) => Promise<SocialProfile>;
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

export type OAuthAppConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/**
 * @description 카카오 제공자 (arctic), 앱 등록 후 받은 키로만 동작
 * @param config 앱 키와 리다이렉트 주소
 * @returns 카카오 제공자
 */
export const createKakaoProvider = (config: OAuthAppConfig): SocialProviderClient => {
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

const naverUserSchema = z.object({
  response: z.object({ id: z.string(), email: z.string().optional() }),
});

/**
 * @description 네이버 사용자 정보 응답을 내부 형식으로 변환
 * 네이버는 이메일 인증 여부를 알려주지 않으므로 이메일은 소셜 가입에 쓰지 않음
 * @param raw 네이버 사용자 정보 응답 본문
 * @returns 내부 사용자 정보
 * @throws 응답 형식이 예상과 다른 경우
 */
export const mapNaverUser = (raw: unknown): SocialProfile => ({
  providerUserId: naverUserSchema.parse(raw).response.id,
  verifiedEmail: null,
});

const naverTokenSchema = z.object({ access_token: z.string().min(1) });

/**
 * @description 네이버 제공자, 토큰 요청에 state가 필요해서 arctic 대신 직접 호출
 * @param config 앱 키와 리다이렉트 주소
 * @returns 네이버 제공자
 */
export const createNaverProvider = (config: OAuthAppConfig): SocialProviderClient => ({
  createAuthorizationUrl: (state) => {
    const url = new URL('https://nid.naver.com/oauth2.0/authorize');

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('state', state);

    return url;
  },
  exchangeCode: async (code, state) => {
    const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        state,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`[social.naver] 토큰 교환 실패 status=${tokenResponse.status}`);
    }

    const token = naverTokenSchema.parse(await tokenResponse.json());
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    if (!response.ok) {
      throw new Error(`[social.naver] 사용자 정보 조회 실패 status=${response.status}`);
    }

    return mapNaverUser(await response.json());
  },
});

const googleUserSchema = z.object({
  sub: z.string().min(1),
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
});

/**
 * @description 구글 사용자 정보 응답을 내부 형식으로 변환 (이메일은 구글이 인증됐다고 한 경우에만 인정)
 * @param raw 구글 사용자 정보 응답 본문
 * @returns 내부 사용자 정보
 * @throws 응답 형식이 예상과 다른 경우
 */
export const mapGoogleUser = (raw: unknown): SocialProfile => {
  const user = googleUserSchema.parse(raw);

  return {
    providerUserId: user.sub,
    verifiedEmail:
      user.email && user.email_verified === true ? user.email.trim().toLowerCase() : null,
  };
};

/**
 * @description 구글 제공자 (arctic, PKCE 사용)
 * @param config 앱 키와 리다이렉트 주소
 * @returns 구글 제공자
 */
export const createGoogleProvider = (config: OAuthAppConfig): SocialProviderClient => {
  const google = new Google(config.clientId, config.clientSecret, config.redirectUri);

  return {
    createAuthorizationUrl: (state, codeVerifier) =>
      google.createAuthorizationURL(state, codeVerifier, ['openid', 'email']),
    exchangeCode: async (code, _state, codeVerifier) => {
      const tokens = await google.validateAuthorizationCode(code, codeVerifier);
      const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokens.accessToken()}` },
      });

      if (!response.ok) {
        throw new Error(`[social.google] 사용자 정보 조회 실패 status=${response.status}`);
      }

      return mapGoogleUser(await response.json());
    },
  };
};

// 개발 환경 전용 가짜 제공자의 시연용 계정 (실제 소셜 계정이 아님), 사용자 번호는 제공자마다 다름
const FAKE_PROFILE_DEFS = {
  hanbit: { label: '한빛판금 관리자와 연동하는 계정', email: 'hanbit@example.com' },
  'new-verified': { label: '이메일이 인증된 새 계정', email: 'social-new@example.com' },
  'new-unverified': { label: '이메일이 인증되지 않은 새 계정', email: null },
  other: { label: '다른 새 계정', email: 'social-other@example.com' },
} as const;

export const fakeProfiles = (
  provider: SocialProviderKey,
): Record<string, SocialProfile & { label: string }> =>
  Object.fromEntries(
    Object.entries(FAKE_PROFILE_DEFS).map(([key, def]) => [
      key,
      {
        label: `${SOCIAL_PROVIDER_LABELS[provider]} ${def.label}`,
        providerUserId: `fake-${provider}-${key}`,
        verifiedEmail: provider === 'naver' ? null : def.email,
      },
    ]),
  );

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
 * @description 개발 환경 전용 가짜 제공자, 실제 소셜 서비스 없이 연동·로그인·가입 흐름 전체를 테스트
 * 운영 환경에서는 생성되지 않도록 호출하는 쪽(`chooseSocialProvider`)에서 차단
 * @param options 서버 주소와 코드 서명용 비밀 값
 * @returns 가짜 제공자
 */
export const createFakeProvider = (options: {
  provider: SocialProviderKey;
  origin: string;
  secret: string;
}): SocialProviderClient => ({
  createAuthorizationUrl: (state) => {
    const url = new URL(`/api/v1/dev/fake-social/${options.provider}/authorize`, options.origin);

    url.searchParams.set('state', state);

    return url;
  },
  exchangeCode: async (code) => {
    const [key = '', signature = ''] = code.split('.');
    const expected = Buffer.from(sign(options.secret, key));
    const actual = Buffer.from(signature);
    const profile = fakeProfiles(options.provider)[key];

    if (!profile || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new Error('[social.fake] 잘못된 인가 코드');
    }

    return { providerUserId: profile.providerUserId, verifiedEmail: profile.verifiedEmail };
  },
});

export type SocialProviderChoice =
  | { kind: SocialProviderKey; client: SocialProviderClient }
  | { kind: 'fake'; client: SocialProviderClient }
  | { kind: 'none' };

type AppKeys = { clientId?: string; clientSecret?: string };

type ChooseInput = {
  nodeEnv: 'development' | 'test' | 'production';
  appOrigin: string;
  provider: SocialProviderKey;
  keys?: AppKeys;
  fakeSecret: string;
};

const BUILDERS: Record<SocialProviderKey, (config: OAuthAppConfig) => SocialProviderClient> = {
  kakao: createKakaoProvider,
  naver: createNaverProvider,
  google: createGoogleProvider,
};

/**
 * @description 제공자 하나에 대해 환경에 맞는 구현 선택
 * 키가 있으면 실제 제공자, 키가 없고 개발 환경이면 가짜 제공자, 그 외(특히 운영)는 사용 안 함
 * 운영에서 키가 빠졌을 때 가짜 제공자로 대체되는 일이 없도록 이 함수가 유일한 선택 지점
 * @param input 환경 설정
 * @returns 선택 결과
 */
export const chooseSocialProvider = ({
  nodeEnv,
  appOrigin,
  provider,
  keys,
  fakeSecret,
}: ChooseInput): SocialProviderChoice => {
  const origin = new URL(appOrigin).origin;

  if (keys?.clientId && keys.clientSecret) {
    return {
      kind: provider,
      client: BUILDERS[provider]({
        clientId: keys.clientId,
        clientSecret: keys.clientSecret,
        redirectUri: `${origin}/api/v1/auth/${provider}/callback`,
      }),
    };
  }

  if (nodeEnv === 'development') {
    return { kind: 'fake', client: createFakeProvider({ provider, origin, secret: fakeSecret }) };
  }

  return { kind: 'none' };
};

export type SocialProviderChoices = Record<SocialProviderKey, SocialProviderChoice>;

/**
 * @description 카카오·네이버·구글 모두에 대해 제공자 선택
 * @param input 환경 설정과 제공자별 앱 키
 * @returns 제공자별 선택 결과
 */
export const chooseSocialProviders = (
  input: Omit<ChooseInput, 'provider' | 'keys'> & {
    keys: Partial<Record<SocialProviderKey, AppKeys>>;
  },
): SocialProviderChoices =>
  Object.fromEntries(
    SOCIAL_PROVIDER_KEYS.map((provider) => [
      provider,
      chooseSocialProvider({ ...input, provider, keys: input.keys[provider] }),
    ]),
  ) as SocialProviderChoices;
