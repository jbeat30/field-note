import pino from 'pino';

/**
 * 로그에 남기지 않을 경로 (이름·연락처·토큰·쿠키·메모 본문)
 * 요청 본문과 중첩 객체까지 포함
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.code',
  '*.name',
  '*.phone',
  '*.email',
  '*.memo',
  '*.content',
  'password',
  'token',
  'phone',
  'email',
  'memo',
];

export const REDACT_CENSOR = '[마스킹]';

export type Logger = pino.Logger;

/**
 * @description 개인정보 마스킹이 적용된 pino 로거 생성
 * @param level 로그 레벨
 * @param destination 출력 대상 (기본은 표준 출력, 테스트에서 교체)
 * @returns pino 로거
 */
export const createLogger = (level: string, destination?: pino.DestinationStream) =>
  pino(
    {
      level,
      redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR },
    },
    destination,
  );
