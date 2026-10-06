import {
  chooseSocialProvider,
  createFakeProvider,
  FAKE_PROFILES,
  mapKakaoUser,
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
  const provider = createFakeProvider({ origin: 'http://localhost:5173', secret: SECRET });

  it('서명된 코드만 사용자 정보로 교환한다', async () => {
    const profile = await provider.exchangeCode(signFakeCode(SECRET, 'hanbit'));

    expect(profile).toEqual({
      providerUserId: FAKE_PROFILES.hanbit!.providerUserId,
      verifiedEmail: 'hanbit@example.com',
    });
  });

  it('변조되었거나 다른 비밀 값으로 서명한 코드는 거부한다', async () => {
    await expect(provider.exchangeCode('hanbit.invalid-signature')).rejects.toThrow();
    await expect(
      provider.exchangeCode(signFakeCode('another-secret-another-secret-0000000', 'hanbit')),
    ).rejects.toThrow();
    await expect(provider.exchangeCode(signFakeCode(SECRET, 'unknown-profile'))).rejects.toThrow();
    await expect(provider.exchangeCode('')).rejects.toThrow();
  });

  it('인가 주소는 state를 담아 가짜 로그인 화면으로 향한다', () => {
    const url = provider.createAuthorizationUrl('abc');

    expect(url.pathname).toBe('/api/v1/dev/fake-kakao/authorize');
    expect(url.searchParams.get('state')).toBe('abc');
  });
});

describe('chooseSocialProvider', () => {
  const base = { appOrigin: 'http://localhost:5173', fakeSecret: SECRET };

  it('카카오 키가 있으면 환경과 관계없이 카카오를 쓴다', () => {
    for (const nodeEnv of ['development', 'test', 'production'] as const) {
      expect(
        chooseSocialProvider({
          ...base,
          nodeEnv,
          kakao: { clientId: 'id', clientSecret: 'secret' },
        }).kind,
      ).toBe('kakao');
    }
  });

  it('키가 없고 개발 환경이면 가짜 제공자를 쓴다', () => {
    expect(chooseSocialProvider({ ...base, nodeEnv: 'development' }).kind).toBe('fake');
  });

  it('운영에서 키가 빠지면 가짜 제공자가 아니라 소셜 로그인을 끈다', () => {
    expect(chooseSocialProvider({ ...base, nodeEnv: 'production' }).kind).toBe('none');
    expect(
      chooseSocialProvider({ ...base, nodeEnv: 'production', kakao: { clientId: 'id' } }).kind,
    ).toBe('none');
    expect(chooseSocialProvider({ ...base, nodeEnv: 'test' }).kind).toBe('none');
  });

  it('카카오 인가 주소는 리다이렉트 주소·동의 항목·state를 담는다', () => {
    const choice = chooseSocialProvider({
      ...base,
      nodeEnv: 'production',
      kakao: { clientId: 'client-id', clientSecret: 'client-secret' },
    });

    if (choice.kind !== 'kakao') {
      throw new Error('카카오 제공자가 아님');
    }

    const url = choice.client.createAuthorizationUrl('state-123');

    expect(url.origin).toBe('https://kauth.kakao.com');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/api/v1/auth/kakao/callback',
    );
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('scope')).toBe('account_email');
    expect(url.searchParams.get('response_type')).toBe('code');
  });
});
