import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

// 인증 앱(구글 OTP·Microsoft Authenticator 등)이 공통으로 지원하는 값 (RFC 6238, SHA-1, 6자리, 30초)
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
// 휴대폰 시계 오차를 감안해 앞뒤 한 구간까지 허용
const TOTP_WINDOW = 1;
const SECRET_BYTES = 20;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * @description 바이트열을 Base32 문자열로 변환 (인증 앱이 읽는 키 형식)
 * @param bytes 변환할 바이트열
 * @returns Base32 문자열 (패딩 없음)
 */
export const base32Encode = (bytes: Buffer): string => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  return bits > 0 ? output + BASE32[(value << (5 - bits)) & 31] : output;
};

/**
 * @description Base32 문자열을 바이트열로 변환
 * @param text Base32 문자열 (공백·소문자 허용)
 * @returns 바이트열
 */
export const base32Decode = (text: string): Buffer => {
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of text.replace(/[\s=]/g, '').toUpperCase()) {
    const index = BASE32.indexOf(char);

    if (index < 0) {
      throw new Error('[auth.totp] Base32가 아닌 문자가 있음');
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

/**
 * @description 새 인증 키 생성
 * @returns Base32 인증 키 (160비트)
 */
export const generateTotpSecret = (): string => base32Encode(randomBytes(SECRET_BYTES));

/**
 * @description 시간 구간 번호 계산
 * @param at 기준 시각
 * @returns 30초 단위 구간 번호
 */
export const totpStep = (at: Date): number => Math.floor(at.getTime() / 1000 / TOTP_PERIOD_SECONDS);

const codeForStep = (secret: string, step: number): string => {
  const counter = Buffer.alloc(8);

  counter.writeBigUInt64BE(BigInt(step));

  const digest = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  const binary =
    ((digest[offset]! & 127) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
};

/**
 * @description 지정한 시각의 인증 코드 계산
 * @param secret Base32 인증 키
 * @param at 기준 시각
 * @returns 6자리 코드
 */
export const generateTotpCode = (secret: string, at: Date): string =>
  codeForStep(secret, totpStep(at));

const safeEqual = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * @description 입력한 코드가 허용 구간 안의 코드인지 확인
 * @param secret Base32 인증 키
 * @param code 입력한 6자리 코드
 * @param at 기준 시각
 * @returns 맞은 구간 번호 (틀리면 null)
 */
export const matchTotpStep = (secret: string, code: string, at: Date): number | null => {
  const center = totpStep(at);

  for (let step = center - TOTP_WINDOW; step <= center + TOTP_WINDOW; step += 1) {
    if (safeEqual(codeForStep(secret, step), code)) {
      return step;
    }
  }

  return null;
};

/**
 * @description 인증 앱 등록용 주소 (QR 코드의 내용)
 * @param input 서비스 이름, 계정 표시, 인증 키
 * @returns otpauth 주소
 */
export const buildOtpauthUrl = ({
  issuer,
  account,
  secret,
}: {
  issuer: string;
  account: string;
  secret: string;
}): string => {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });

  return `otpauth://totp/${label}?${query.toString()}`;
};

const deriveKey = (secret: string) => createHash('sha256').update(secret).digest();

/**
 * @description 인증 키를 서버 비밀 값으로 암호화 (AES-256-GCM, 저장 형식 `iv.암호문.태그` base64url)
 * @param plain 인증 키
 * @param serverSecret 서버 비밀 값
 * @returns 저장용 문자열
 */
export const encryptTotpSecret = (plain: string, serverSecret: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(serverSecret), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);

  return [iv, body, cipher.getAuthTag()].map((part) => part.toString('base64url')).join('.');
};

/**
 * @description 저장된 인증 키 복호화 (비밀 값이 다르거나 변조되면 예외)
 * @param stored 저장용 문자열
 * @param serverSecret 서버 비밀 값
 * @returns 인증 키
 */
export const decryptTotpSecret = (stored: string, serverSecret: string): string => {
  const [iv, body, tag] = stored.split('.').map((part) => Buffer.from(part, 'base64url'));

  if (!iv || !body || !tag) {
    throw new Error('[auth.totp] 저장 형식이 올바르지 않음');
  }

  const decipher = createDecipheriv('aes-256-gcm', deriveKey(serverSecret), iv);

  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
};

// 복구 코드: 헷갈리는 글자(0·1·I·O)를 뺀 10자, 5자씩 하이픈으로 나눔
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * @description 복구 코드 한 개 생성
 * @returns `XXXXX-XXXXX` 형식 코드
 */
export const generateRecoveryCode = (): string => {
  const bytes = randomBytes(10);
  const chars = Array.from(bytes, (byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]);

  return `${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`;
};

/**
 * @description 입력한 복구 코드를 비교용 형태로 정리
 * @param input 사용자가 입력한 문자열
 * @returns 하이픈·공백을 없애고 대문자로 바꾼 문자열
 */
export const normalizeRecoveryCode = (input: string): string =>
  input.replace(/[\s-]/g, '').toUpperCase();

/**
 * @description 복구 코드의 저장용 해시 (코드 자체는 저장하지 않음)
 * @param code 복구 코드 (형식 무관)
 * @returns SHA-256 해시
 */
export const hashRecoveryCode = (code: string): string =>
  createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex');
