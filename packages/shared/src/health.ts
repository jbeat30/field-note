import { z } from 'zod';

export const APP_NAME = 'field-note';

// 서버 상태 확인 응답 (api 응답 파싱과 web 타입이 공유)
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal(APP_NAME),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
