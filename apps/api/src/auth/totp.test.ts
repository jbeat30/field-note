import {
  base32Decode,
  base32Encode,
  buildOtpauthUrl,
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCode,
  generateTotpCode,
  generateTotpSecret,
  hashRecoveryCode,
  matchTotpStep,
  normalizeRecoveryCode,
  totpStep,
} from './totp';

// RFC 6238 부록의 시험 키 "12345678901234567890" (ASCII)
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('Base32', () => {
  it('바이트열을 바꿨다가 되돌리면 같다', () => {
    const bytes = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);

    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it('RFC 4648 예시와 같다', () => {
    expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
  });

  it('소문자·공백·패딩을 허용하고 다른 문자는 거부한다', () => {
    expect(base32Decode('mzxw 6ytb oi======').toString()).toBe('foobar');
    expect(() => base32Decode('MZXW1')).toThrow();
  });
});

describe('TOTP 코드', () => {
  it('RFC 6238 시험 값과 일치한다 (6자리는 8자리 값의 끝 6자리)', () => {
    expect(generateTotpCode(RFC_SECRET, new Date(59 * 1000))).toBe('287082');
    expect(generateTotpCode(RFC_SECRET, new Date(1111111109 * 1000))).toBe('081804');
    expect(generateTotpCode(RFC_SECRET, new Date(1234567890 * 1000))).toBe('005924');
    expect(generateTotpCode(RFC_SECRET, new Date(2000000000 * 1000))).toBe('279037');
  });

  it('30초 구간마다 바뀌고 구간 번호를 돌려준다', () => {
    expect(totpStep(new Date(59_000))).toBe(1);
    expect(totpStep(new Date(60_000))).toBe(2);
  });

  it('앞뒤 한 구간까지만 허용한다', () => {
    const at = new Date(1_700_000_000_000);
    const step = totpStep(at);
    const codeAt = (offset: number) =>
      generateTotpCode(RFC_SECRET, new Date(at.getTime() + offset * 30_000));

    expect(matchTotpStep(RFC_SECRET, codeAt(0), at)).toBe(step);
    expect(matchTotpStep(RFC_SECRET, codeAt(-1), at)).toBe(step - 1);
    expect(matchTotpStep(RFC_SECRET, codeAt(1), at)).toBe(step + 1);
    expect(matchTotpStep(RFC_SECRET, codeAt(-2), at)).toBeNull();
    expect(matchTotpStep(RFC_SECRET, codeAt(2), at)).toBeNull();
    expect(matchTotpStep(RFC_SECRET, '12345', at)).toBeNull();
  });

  it('새 키는 32자(160비트) Base32이고 매번 다르다', () => {
    const keys = new Set(Array.from({ length: 50 }, generateTotpSecret));

    expect(keys.size).toBe(50);
    expect([...keys][0]).toMatch(/^[A-Z2-7]{32}$/);
  });
});

describe('등록 주소', () => {
  it('서비스 이름과 계정을 넣고 특수문자는 인코딩한다', () => {
    const url = new URL(
      buildOtpauthUrl({ issuer: '필드노트', account: 'a b@c.com', secret: 'ABC' }),
    );

    expect(url.protocol).toBe('otpauth:');
    expect(url.host).toBe('totp');
    expect(decodeURIComponent(url.pathname)).toBe('/필드노트:a b@c.com');
    expect(url.searchParams.get('secret')).toBe('ABC');
    expect(url.searchParams.get('issuer')).toBe('필드노트');
    expect(url.searchParams.get('digits')).toBe('6');
    expect(url.searchParams.get('period')).toBe('30');
  });
});

describe('인증 키 암호화', () => {
  const server = 'a'.repeat(32);

  it('암호화한 값을 같은 비밀 값으로 되돌린다', () => {
    const stored = encryptTotpSecret(RFC_SECRET, server);

    expect(stored).not.toContain(RFC_SECRET);
    expect(decryptTotpSecret(stored, server)).toBe(RFC_SECRET);
  });

  it('같은 키도 매번 다른 값으로 저장된다', () => {
    expect(encryptTotpSecret(RFC_SECRET, server)).not.toBe(encryptTotpSecret(RFC_SECRET, server));
  });

  it('다른 비밀 값이나 변조된 값은 거부한다', () => {
    const stored = encryptTotpSecret(RFC_SECRET, server);
    const [iv, body, tag] = stored.split('.');
    const tampered = [iv, Buffer.from('x').toString('base64url') + body, tag].join('.');

    expect(() => decryptTotpSecret(stored, 'b'.repeat(32))).toThrow();
    expect(() => decryptTotpSecret(tampered, server)).toThrow();
    expect(() => decryptTotpSecret('broken', server)).toThrow();
  });
});

describe('복구 코드', () => {
  it('헷갈리는 글자 없이 5자-5자 형식으로 만든다', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateRecoveryCode()).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
    }
  });

  it('입력 형식(소문자·하이픈·공백)과 관계없이 같은 해시가 된다', () => {
    expect(normalizeRecoveryCode(' abcde-fghjk ')).toBe('ABCDEFGHJK');
    expect(hashRecoveryCode('abcde-fghjk')).toBe(hashRecoveryCode('ABCDE FGHJK'));
    expect(hashRecoveryCode('ABCDE-FGHJK')).not.toBe(hashRecoveryCode('ABCDE-FGHJL'));
  });
});
