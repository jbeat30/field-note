import { SOCIAL_RESULT_MESSAGES, parseSocialResult } from './useSocial';

describe('parseSocialResult', () => {
  it('알려진 결과만 해석하고 나머지는 무시한다', () => {
    expect(parseSocialResult('linked')).toBe('linked');
    expect(parseSocialResult('not-linked')).toBe('not-linked');
    expect(parseSocialResult('<script>alert(1)</script>')).toBeNull();
    expect(parseSocialResult('')).toBeNull();
    expect(parseSocialResult(null)).toBeNull();
  });

  it('모든 결과에 안내 문구가 있다', () => {
    for (const message of Object.values(SOCIAL_RESULT_MESSAGES)) {
      expect(message.text.length).toBeGreaterThan(0);
    }
  });
});
