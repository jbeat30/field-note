import { openOAuthSession, OAUTH_TTL_MS, sealOAuthSession, type OAuthSession } from './oauthCookie';

const SECRET = 'cookie-secret-cookie-secret-cookie-secret';

describe('OAuth 진행 상태 쿠키', () => {
  it('state가 같으면 담았던 진행 상태를 그대로 돌려준다', () => {
    const session: OAuthSession = { purpose: 'link', userId: 'u1', companyId: 'c1' };
    const sealed = sealOAuthSession(SECRET, 'state-1', session);

    expect(openOAuthSession(SECRET, sealed, 'state-1')).toEqual(session);
  });

  it('초대 가입 정보(토큰·동의)도 담고 꺼낸다', () => {
    const session: OAuthSession = {
      purpose: 'signup',
      inviteToken: 'invite-token-0001',
      consents: [{ documentId: 'doc-1', isAgreed: true }],
    };

    expect(openOAuthSession(SECRET, sealOAuthSession(SECRET, 's', session), 's')).toEqual(session);
  });

  it('state가 다르거나 없으면 거부한다 (다른 요청이 가로채는 것을 막음)', () => {
    const sealed = sealOAuthSession(SECRET, 'state-1', { purpose: 'login' });

    expect(openOAuthSession(SECRET, sealed, 'state-2')).toBeNull();
    expect(openOAuthSession(SECRET, sealed, undefined)).toBeNull();
    expect(openOAuthSession(SECRET, undefined, 'state-1')).toBeNull();
  });

  it('유효 시간이 지나면 거부한다', () => {
    const now = Date.now();
    const sealed = sealOAuthSession(SECRET, 's', { purpose: 'login' }, now);

    expect(openOAuthSession(SECRET, sealed, 's', now + OAUTH_TTL_MS - 1000)).not.toBeNull();
    expect(openOAuthSession(SECRET, sealed, 's', now + OAUTH_TTL_MS + 1000)).toBeNull();
  });

  it('변조하거나 다른 비밀 값으로 열면 거부한다', () => {
    const sealed = sealOAuthSession(SECRET, 's', { purpose: 'login' });
    // 끝부분은 base64 패딩 비트라 바꿔도 같은 값이 될 수 있으므로 중간 글자를 반드시 다른 글자로 바꿈
    const tampered = `${sealed.slice(0, 10)}${sealed[10] === 'A' ? 'B' : 'A'}${sealed.slice(11)}`;

    expect(openOAuthSession(SECRET, tampered, 's')).toBeNull();
    expect(openOAuthSession('another-secret-another-secret-0000000', sealed, 's')).toBeNull();
    expect(openOAuthSession(SECRET, 'not-a-valid-cookie', 's')).toBeNull();
  });

  it('쿠키 값에 진행 상태가 평문으로 보이지 않는다', () => {
    const sealed = sealOAuthSession(SECRET, 'state-visible', {
      purpose: 'signup',
      inviteToken: 'secret-invite-token',
      consents: [],
    });

    expect(Buffer.from(sealed, 'base64url').toString('utf8')).not.toContain('secret-invite-token');
    expect(sealed).not.toContain('state-visible');
  });
});
