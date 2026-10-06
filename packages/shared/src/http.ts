import { z } from 'zod';

// 오류 코드 (프론트가 문구 대신 코드로 분기)
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'CSRF_REJECTED',
  'INVALID_CREDENTIALS',
  'CURRENT_PASSWORD_INVALID',
  'ACCOUNT_LOCKED',
  'LOGIN_ID_TAKEN',
  'EMAIL_CODE_INVALID',
  'NOT_IMPLEMENTED',
  'NOT_FOUND',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_KEY_REUSED',
  'IDEMPOTENCY_IN_PROGRESS',
  'TOO_MANY_REQUESTS',
  'INTERNAL_ERROR',
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

// 모든 오류 응답의 공통 형식
export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    // 검증 실패 시 입력 위치별 사유 (값은 담지 않음)
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// 본문 없이 성공 여부만 알리는 응답
export const successResponseSchema = z.object({ success: z.literal(true) });

export const logoutResponseSchema = successResponseSchema;

// 틀 검증용 샘플 쓰기 API (실제 업무 라우트가 생기면 제거)
export const sampleCreateRequestSchema = z.object({
  title: z.string().min(1).max(100),
});

export const sampleResponseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
});

export type SampleCreateRequest = z.infer<typeof sampleCreateRequestSchema>;
export type SampleResponse = z.infer<typeof sampleResponseSchema>;
