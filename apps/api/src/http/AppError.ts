import type { ErrorCode, ErrorResponse } from '@field-note/shared';

import { ERROR_MESSAGES } from './errorMessages';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  CSRF_REJECTED: 403,
  NOT_FOUND: 404,
  IDEMPOTENCY_KEY_REQUIRED: 400,
  IDEMPOTENCY_KEY_REUSED: 422,
  IDEMPOTENCY_IN_PROGRESS: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};

/**
 * @description 응답 형식이 정해진 업무 오류 (상태 코드와 문구는 코드에서 결정)
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: NonNullable<ErrorResponse['error']['details']>;

  constructor(code: ErrorCode, details?: ErrorResponse['error']['details']) {
    super(`[AppError] ${code}`);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  toResponse(): ErrorResponse {
    return {
      error: { code: this.code, message: ERROR_MESSAGES[this.code], details: this.details },
    };
  }
}
