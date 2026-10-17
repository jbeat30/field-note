import { generateToken, hashToken } from './token';

describe('generateToken', () => {
  it('256비트 난수를 URL에 쓸 수 있는 43자 문자열로 만든다', () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('호출할 때마다 다른 값을 만든다', () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => generateToken()));

    expect(tokens.size).toBe(1000);
  });
});

describe('hashToken', () => {
  it('같은 토큰은 같은 해시, 원문과는 다른 64자 16진수를 돌려준다', () => {
    const token = generateToken();

    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toBe(token);
  });
});
