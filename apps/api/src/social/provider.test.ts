import {
  chooseSocialProvider,
  chooseSocialProviders,
  createFakeProvider,
  fakeProfiles,
  mapGoogleUser,
  mapKakaoUser,
  mapNaverUser,
  signFakeCode,
} from './provider';

const SECRET = 'fake-secret-fake-secret-fake-secret-0000';

describe('mapKakaoUser', () => {
  it('유효하고 인증된 이메일만 인정하고 소문자로 정리한다', () => {
    expect(
      mapKakaoUser({
        id: 123456789,
        kakao_account: {
          email: ' Admin@Example.COM ',
          is_email_valid: true,
          is_email_verified: true,
        },
      }),
    ).toEqual({ providerUserId: '123456789', verifiedEmail: 'admin@example.com' });
  });

  it('인증되지 않았거나 유효하지 않거나 없는 이메일은 인정하지 않는다', () => {
    const base = { id: 1 };

    expect(
      mapKakaoUser({
        ...base,
        kakao_account: { email: 'a@example.com', is_email_valid: true, is_email_verified: false },
      }).verifiedEmail,
    ).toBeNull();
    expect(
      mapKakaoUser({
        ...base,
        kakao_account: { email: 'a@example.com', is_email_valid: false, is_email_verified: true },
      }).verifiedEmail,
    ).toBeNull();
    expect(
      mapKakaoUser({ ...base, kakao_account: { is_email_valid: true, is_email_verified: true } })
        .verifiedEmail,
    ).toBeNull();
    expect(mapKakaoUser(base).verifiedEmail).toBeNull();
  });

  it('식별자는 문자열로 다루고 모르는 필드는 무시한다', () => {
    expect(mapKakaoUser({ id: '42', properties: { nickname: '무시' } }).providerUserId).toBe('42');
  });

  it('형식이 다른 응답은 거부한다', () => {
    expect(() => mapKakaoUser({ nope: true })).toThrow();
    expect(() => mapKakaoUser(null)).toThrow();
  });
});

describe('가짜 제공자', () => {
  const provider = createFakeProvider({
    provider: 'kakao',
    origin: 'http://localhost:5173',
    secret: SECRET,
  });

  it('서명된 코드만 사용자 정보로 교환한다', async () => {
    const profile = await provider.exchangeCode(signFakeCode(SECRET, 'hanbit'), 's', 'v');

    expect(profile).toEqual({
      providerUserId: fakeProfiles('kakao').hanbit!.providerUserId,
      verifiedEmail: 'hanbit@example.com',
    });
  });

  it('변조되었거나 다른 비밀 값으로 서명한 코드는 거부한다', async () => {
    await expect(provider.exchangeCode('hanbit.invalid-signature', 's', 'v')).rejects.toThrow();
    await expect(
      provider.exchangeCode(
        signFakeCode('another-secret-another-secret-0000000', 'hanbit'),
        's',
        'v',
      ),
    ).rejects.toThrow();
    await expect(
      provider.exchangeCode(signFakeCode(SECRET, 'unknown-profile'), 's', 'v'),
    ).rejects.toThrow();
    await expect(provider.exchangeCode('', 's', 'v')).rejects.toThrow();
  });

  it('인가 주소는 state를 담아 가짜 로그인 화면으로 향한다', () => {
    const url = provider.createAuthorizationUrl('abc', 'v');

    expect(url.pathname).toBe('/api/v1/dev/fake-social/kakao/authorize');
    expect(url.searchParams.get('state')).toBe('abc');
  });
});

describe('mapNaverUser', () => {
  it('식별자만 쓰고 이메일은 인증 여부를 알 수 없어 인정하지 않는다', () => {
    expect(
      mapNaverUser({ resultcode: '00', response: { id: 'n-1', email: 'a@example.com' } }),
    ).toEqual({
      providerUserId: 'n-1',
      verifiedEmail: null,
    });
  });

  it('형식이 다른 응답은 거부한다', () => {
    expect(() => mapNaverUser({ response: {} })).toThrow();
    expect(() => mapNaverUser(null)).toThrow();
  });
});

describe('mapGoogleUser', () => {
  it('구글이 인증했다고 한 이메일만 인정하고 소문자로 정리한다', () => {
    expect(
      mapGoogleUser({ sub: 'g-1', email: ' Admin@Example.COM ', email_verified: true }),
    ).toEqual({ providerUserId: 'g-1', verifiedEmail: 'admin@example.com' });
    expect(mapGoogleUser({ sub: 'g-2', email: 'a@example.com', email_verified: false })).toEqual({
      providerUserId: 'g-2',
      verifiedEmail: null,
    });
    expect(mapGoogleUser({ sub: 'g-3', email: 'a@example.com' }).verifiedEmail).toBeNull();
    expect(mapGoogleUser({ sub: 'g-4' }).verifiedEmail).toBeNull();
  });

  it('형식이 다른 응답은 거부한다', () => {
    expect(() => mapGoogleUser({ email: 'a@example.com' })).toThrow();
    expect(() => mapGoogleUser(null)).toThrow();
  });
});

describe('가짜 제공자의 계정', () => {
  it('제공자마다 사용자 번호가 달라 서로의 계정과 섞이지 않는다', () => {
    expect(fakeProfiles('kakao').hanbit!.providerUserId).toBe('fake-kakao-hanbit');
    expect(fakeProfiles('naver').hanbit!.providerUserId).toBe('fake-naver-hanbit');
    expect(fakeProfiles('google').hanbit!.providerUserId).toBe('fake-google-hanbit');
  });

  it('네이버는 실제와 같이 인증된 이메일을 주지 않는다', () => {
    expect(fakeProfiles('naver')['new-verified']!.verifiedEmail).toBeNull();
    expect(fakeProfiles('google')['new-verified']!.verifiedEmail).not.toBeNull();
  });
});

describe('chooseSocialProvider', () => {
  const base = { appOrigin: 'http://localhost:5173', fakeSecret: SECRET };
  const keys = { clientId: 'client-id', clientSecret: 'client-secret' };

  it('키가 있으면 환경과 관계없이 해당 제공자를 쓴다', () => {
    for (const provider of ['kakao', 'naver', 'google'] as const) {
      for (const nodeEnv of ['development', 'test', 'production'] as const) {
        expect(chooseSocialProvider({ ...base, nodeEnv, provider, keys }).kind).toBe(provider);
      }
    }
  });

  it('키가 없고 개발 환경이면 가짜 제공자를 쓴다', () => {
    expect(chooseSocialProvider({ ...base, provider: 'naver', nodeEnv: 'development' }).kind).toBe(
      'fake',
    );
  });

  it('운영에서 키가 빠지면 가짜 제공자가 아니라 해당 로그인을 끈다', () => {
    expect(chooseSocialProvider({ ...base, provider: 'kakao', nodeEnv: 'production' }).kind).toBe(
      'none',
    );
    expect(
      chooseSocialProvider({
        ...base,
        provider: 'google',
        nodeEnv: 'production',
        keys: { clientId: 'id' },
      }).kind,
    ).toBe('none');
    expect(chooseSocialProvider({ ...base, provider: 'kakao', nodeEnv: 'test' }).kind).toBe('none');
  });

  it('제공자별로 따로 선택한다 (키가 있는 제공자만 켜짐)', () => {
    const choices = chooseSocialProviders({
      ...base,
      nodeEnv: 'production',
      keys: { naver: keys },
    });

    expect(Object.fromEntries(Object.entries(choices).map(([name, c]) => [name, c.kind]))).toEqual({
      kakao: 'none',
      naver: 'naver',
      google: 'none',
    });
  });

  it('카카오 인가 주소는 리다이렉트 주소·동의 항목·state를 담는다', () => {
    const choice = chooseSocialProvider({
      ...base,
      provider: 'kakao',
      nodeEnv: 'production',
      keys,
    });
    const url =
      choice.kind === 'none' ? null : choice.client.createAuthorizationUrl('state-123', 'v');

    expect(url?.origin).toBe('https://kauth.kakao.com');
    expect(url?.searchParams.get('client_id')).toBe('client-id');
    expect(url?.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/api/v1/auth/kakao/callback',
    );
    expect(url?.searchParams.get('state')).toBe('state-123');
    expect(url?.searchParams.get('scope')).toBe('account_email');
    expect(url?.searchParams.get('response_type')).toBe('code');
  });

  it('네이버 인가 주소는 state를 직접 담는다', () => {
    const choice = chooseSocialProvider({
      ...base,
      provider: 'naver',
      nodeEnv: 'production',
      keys,
    });
    const url =
      choice.kind === 'none' ? null : choice.client.createAuthorizationUrl('state-123', 'v');

    expect(url?.origin).toBe('https://nid.naver.com');
    expect(url?.searchParams.get('client_id')).toBe('client-id');
    expect(url?.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/api/v1/auth/naver/callback',
    );
    expect(url?.searchParams.get('state')).toBe('state-123');
    expect(url?.searchParams.get('response_type')).toBe('code');
  });

  it('구글 인가 주소는 PKCE 검증값에서 만든 챌린지와 이메일 범위를 담는다', () => {
    const choice = chooseSocialProvider({
      ...base,
      provider: 'google',
      nodeEnv: 'production',
      keys,
    });
    const url =
      choice.kind === 'none'
        ? null
        : choice.client.createAuthorizationUrl('state-123', 'verifier-value-0123456789');

    expect(url?.origin).toBe('https://accounts.google.com');
    expect(url?.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/api/v1/auth/google/callback',
    );
    expect(url?.searchParams.get('state')).toBe('state-123');
    expect(url?.searchParams.get('scope')).toBe('openid email');
    expect(url?.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url?.searchParams.get('code_challenge')).toBeTruthy();
  });
});
