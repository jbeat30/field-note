import { errorResponseSchema } from '@field-note/shared';

import { getErrorMessage } from '../lib/apiError';

/**
 * @description 서버의 검증 오류를 입력칸별 문구로 나눔 (`body.phone` → phone), 입력칸에 연결할 수 없는 오류는 root로 모음
 * @param error openapi-fetch가 돌려준 오류 본문
 * @param fields 화면에 있는 입력칸 이름
 * @returns 입력칸별 문구와 전체 오류 문구
 */
export const splitServerErrors = (error: unknown, fields: readonly string[]) => {
  const parsed = errorResponseSchema.safeParse(error);
  const byField: Record<string, string> = {};
  let root = '';

  for (const detail of parsed.success ? (parsed.data.error.details ?? []) : []) {
    const field = detail.path.replace(/^body\./, '');

    if (fields.includes(field) && !byField[field]) {
      byField[field] = detail.message;
    } else if (!root) {
      root = detail.message;
    }
  }

  if (!root && Object.keys(byField).length === 0) {
    root = getErrorMessage(error);
  }

  return { byField, root };
};
