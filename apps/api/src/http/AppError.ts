import {
  ERROR_MESSAGES,
  ERROR_STATUS,
  type ErrorCode,
  type ErrorResponse,
} from '@field-note/shared';

export const STATUS_BY_CODE = ERROR_STATUS;

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
