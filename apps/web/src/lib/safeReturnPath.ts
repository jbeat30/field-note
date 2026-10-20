// 로그인 뒤에 돌아가면 안 되는 화면 (인증·가입·재설정 흐름 자체)
const EXCLUDED_PREFIXES = [
  '/login',
  '/invite',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/closure',
  '/mock-social',
];
const MAX_LENGTH = 500;
const DUMMY_ORIGIN = 'https://field-note.invalid';

// 역슬래시(브라우저가 슬래시로 해석)와 제어 문자(줄바꿈·탭 등)
const hasUnsafeChar = (value: string) =>
  [...value].some(
    (char) => char === '\\' || char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f,
  );

/**
 * @description 로그인 뒤에 돌아갈 화면 주소가 우리 앱 안의 안전한 경로인지 확인
 * 다른 사이트(`//evil.com`, `https://…`), 역슬래시·제어 문자가 섞인 주소, 인증 흐름 화면은 거부
 * @param value 이동 후보 (라우터 상태에서 읽은 값)
 * @returns 안전하면 같은 경로, 아니면 null
 */
export const toSafeReturnPath = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_LENGTH) {
    return null;
  }

  if (!value.startsWith('/') || value.startsWith('//') || hasUnsafeChar(value)) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(value, DUMMY_ORIGIN);
  } catch {
    return null;
  }

  if (parsed.origin !== DUMMY_ORIGIN) {
    return null;
  }

  const isExcluded = EXCLUDED_PREFIXES.some(
    (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
  );

  return isExcluded ? null : value;
};

/**
 * @description 서버가 알려 준 주소가 http(s)인지 확인 (javascript: 같은 형식으로 이동하지 않게 하는 방어)
 * @param url 이동할 주소
 * @returns http 또는 https 주소면 true
 */
export const isHttpUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url, DUMMY_ORIGIN);

    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};
