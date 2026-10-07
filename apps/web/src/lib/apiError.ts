import { ERROR_MESSAGES, errorResponseSchema, type ErrorCode } from '@field-note/shared';

const FALLBACK_MESSAGE = '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요';

/**
 * @description API 오류 응답에서 오류 코드 추출 (형식이 다르면 undefined)
 * @param error openapi-fetch가 돌려준 오류 본문
 * @returns 오류 코드
 */
export const getErrorCode = (error: unknown): ErrorCode | undefined => {
  const parsed = errorResponseSchema.safeParse(error);

  return parsed.success ? parsed.data.error.code : undefined;
};

/**
 * @description 사용자에게 보여줄 오류 문구 (서버가 준 코드를 공유 문구로 변환, 모르는 오류는 일반 문구)
 * @param error openapi-fetch가 돌려준 오류 본문
 * @returns 화면 표시용 문구
 */
export const getErrorMessage = (error: unknown): string => {
  const code = getErrorCode(error);

  return code ? ERROR_MESSAGES[code] : FALLBACK_MESSAGE;
};

/**
 * @description 검증 오류의 첫 번째 상세 사유 (예: "이미 같은 이름이 있습니다"), 없으면 일반 오류 문구
 * @param error openapi-fetch가 돌려준 오류 본문
 * @returns 화면 표시용 문구
 */
export const getErrorDetailMessage = (error: unknown): string => {
  const parsed = errorResponseSchema.safeParse(error);

  return parsed.success && parsed.data.error.details?.[0]
    ? parsed.data.error.details[0].message
    : getErrorMessage(error);
};
