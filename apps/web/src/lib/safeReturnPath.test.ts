import { isHttpUrl, toSafeReturnPath } from './safeReturnPath';

describe('toSafeReturnPath', () => {
  it('앱 안의 경로는 그대로 돌려준다', () => {
    for (const path of ['/', '/projects', '/projects/abc/work/2026-10-18', '/search?q=판금&x=1']) {
      expect(toSafeReturnPath(path)).toBe(path);
    }
  });

  it('다른 사이트로 가는 주소와 비정상 값은 거부한다', () => {
    for (const value of [
      '//evil.com',
      '//evil.com/path',
      'https://evil.com',
      'http://localhost:5173/',
      'javascript:alert(1)',
      '/\\evil.com',
      '/\tevil',
      '/a\nb',
      'projects',
      '',
      null,
      undefined,
      42,
      { toString: () => '/projects' },
      `/${'a'.repeat(600)}`,
    ]) {
      expect(toSafeReturnPath(value)).toBeNull();
    }

    // 퍼센트 인코딩은 주소 안의 글자일 뿐이라 허용
    expect(toSafeReturnPath('/a%0d%0ab')).toBe('/a%0d%0ab');
  });

  it('로그인·가입·재설정 같은 인증 흐름 화면으로는 돌려보내지 않는다', () => {
    for (const path of [
      '/login',
      '/login?social=failed',
      '/invite/abc',
      '/verify-email',
      '/forgot-password',
      '/reset-password/token',
      '/closure/cancel/token',
      '/closure/requested',
    ]) {
      expect(toSafeReturnPath(path)).toBeNull();
    }

    expect(toSafeReturnPath('/login-help')).toBe('/login-help');
  });
});

describe('isHttpUrl', () => {
  it('http(s) 주소만 허용한다', () => {
    expect(isHttpUrl('https://storage.example.com/file?sig=1')).toBe(true);
    expect(isHttpUrl('http://localhost:9000/file')).toBe(true);
    expect(isHttpUrl('/api/v1/files/abc')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isHttpUrl('file:///etc/passwd')).toBe(false);
  });
});
