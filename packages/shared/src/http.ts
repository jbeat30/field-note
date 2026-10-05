import { z } from 'zod';

// 오류 코드 (프론트가 문구 대신 코드로 분기)
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'CSRF_REJECTED',
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

// 세션 확인 응답 (회사 ID는 세션에서만 얻고 응답으로 확인만 제공)
export const sessionResponseSchema = z.object({
  userId: z.uuid(),
  companyId: z.uuid(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

// 로그아웃 응답
export const logoutResponseSchema = z.object({ success: z.literal(true) });

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
