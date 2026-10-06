import { randomBytes } from 'node:crypto';

const UPPER_ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// 토큰 이름별 비밀 값 형식 (운영에서 쓰는 형식과 같은 길이·문자 구성)
const GENERATORS: Record<string, () => string> = {
  // URL에 그대로 넣어도 인코딩이 필요 없는 문자만 사용
  DB_OWNER_PASSWORD: () => randomBytes(24).toString('base64url'),
  DB_APP_PASSWORD: () => randomBytes(24).toString('base64url'),
  DB_AUTH_PASSWORD: () => randomBytes(24).toString('base64url'),
  DB_OPERATOR_PASSWORD: () => randomBytes(24).toString('base64url'),
  DB_QUEUE_PASSWORD: () => randomBytes(24).toString('base64url'),
  DB_PURGE_PASSWORD: () => randomBytes(24).toString('base64url'),
  // 서버 비밀 값 (256비트)
  CODE_HASH_SECRET: () => randomBytes(32).toString('base64url'),
  OAUTH_COOKIE_SECRET: () => randomBytes(32).toString('base64url'),
  // S3 호환 저장소의 접근 키(20자 대문자·숫자)와 비밀 키(40자)
  S3_ACCESS_KEY: () =>
    Array.from(randomBytes(20), (byte) => UPPER_ALNUM[byte % UPPER_ALNUM.length]).join(''),
  S3_SECRET_KEY: () => randomBytes(30).toString('base64url'),
};

/**
 * @description `.env.example`의 `{{이름}}` 토큰을 새로 만든 비밀 값으로 바꿔 `.env` 내용 생성
 * 같은 토큰은 모든 위치에서 같은 값 (예: DB 비밀번호가 컨테이너 설정과 접속 주소에 함께 쓰임)
 * @param template `.env.example` 내용
 * @returns 비밀 값이 채워진 `.env` 내용
 * @throws 알 수 없는 토큰이 있는 경우
 */
export const renderEnvTemplate = (template: string) => {
  const values = new Map<string, string>();

  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, name: string) => {
    const generate = GENERATORS[name];

    if (!generate) {
      throw new Error(`[envTemplate.renderEnvTemplate] 알 수 없는 토큰 ${name}`);
    }

    if (!values.has(name)) {
      values.set(name, generate());
    }

    return values.get(name)!;
  });
};
