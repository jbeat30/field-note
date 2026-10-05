import type { ErrorCode } from '@field-note/shared';

// 사용자에게 보이는 문구 (오류 코드별 의미 단위 상수)
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: '입력 값을 확인해 주세요',
  UNAUTHORIZED: '로그인이 필요합니다',
  CSRF_REJECTED: '허용되지 않은 요청입니다',
  NOT_FOUND: '요청한 자료를 찾을 수 없습니다',
  IDEMPOTENCY_KEY_REQUIRED: '요청 식별 키가 필요합니다',
  IDEMPOTENCY_KEY_REUSED: '같은 요청 식별 키로 다른 내용을 보낼 수 없습니다',
  IDEMPOTENCY_IN_PROGRESS: '같은 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요',
  TOO_MANY_REQUESTS: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요',
  INTERNAL_ERROR: '일시적인 오류가 발생했습니다',
};
