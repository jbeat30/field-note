import type { ErrorCode } from './http';

// 사용자에게 보이는 문구 (오류 코드별 의미 단위 상수)
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: '입력 값을 확인해 주세요',
  UNAUTHORIZED: '로그인이 필요합니다',
  CSRF_REJECTED: '허용되지 않은 요청입니다',
  INVALID_CREDENTIALS: '아이디 또는 비밀번호가 올바르지 않습니다',
  CURRENT_PASSWORD_INVALID: '현재 비밀번호가 올바르지 않습니다',
  LAST_LOGIN_METHOD:
    '로그인 수단이 하나만 남아 있어 해제할 수 없습니다. 비밀번호 로그인을 먼저 설정해 주세요',
  ACCOUNT_LOCKED: '로그인 시도가 너무 많아 잠시 잠겼습니다. 잠시 후 다시 시도해 주세요',
  LOGIN_ID_TAKEN: '이미 사용 중인 아이디입니다',
  EMAIL_CODE_INVALID: '인증 코드가 올바르지 않거나 만료되었습니다',
  NOT_IMPLEMENTED: '아직 제공되지 않는 기능입니다',
  NOT_FOUND: '요청한 자료를 찾을 수 없습니다',
  IDEMPOTENCY_KEY_REQUIRED: '요청 식별 키가 필요합니다',
  IDEMPOTENCY_KEY_REUSED: '같은 요청 식별 키로 다른 내용을 보낼 수 없습니다',
  IDEMPOTENCY_IN_PROGRESS: '같은 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요',
  TOO_MANY_REQUESTS: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요',
  INTERNAL_ERROR: '일시적인 오류가 발생했습니다',
};

// 오류 코드별 HTTP 상태 (api와 웹 목업이 같은 표 사용)
export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  CSRF_REJECTED: 403,
  INVALID_CREDENTIALS: 401,
  CURRENT_PASSWORD_INVALID: 400,
  LAST_LOGIN_METHOD: 409,
  ACCOUNT_LOCKED: 423,
  LOGIN_ID_TAKEN: 409,
  EMAIL_CODE_INVALID: 400,
  NOT_IMPLEMENTED: 501,
  NOT_FOUND: 404,
  IDEMPOTENCY_KEY_REQUIRED: 400,
  IDEMPOTENCY_KEY_REUSED: 422,
  IDEMPOTENCY_IN_PROGRESS: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};
