import { randomUUID } from 'node:crypto';

import {
  sampleCreateRequestSchema,
  sampleResponseSchema,
  type SampleCreateRequest,
} from '@field-note/shared';

import type { RouteRegistry } from '../http/route';

// 틀 전 구간(검증·인증·멱등 키·속도 제한·응답 파싱) 동작 확인용 샘플, 실제 업무 라우트가 생기면 제거
export const registerSampleRoutes = ({ add }: RouteRegistry) => {
  add(
    {
      method: 'post',
      path: '/samples',
      summary: '샘플 생성 (틀 검증용)',
      auth: 'required',
      request: { body: sampleCreateRequestSchema },
      response: { status: 201, schema: sampleResponseSchema },
      idempotent: true,
      rateLimit: { windowMs: 60_000, limit: 60 },
    },
    async ({ body }) => {
      const { title } = body as SampleCreateRequest;

      // 내부 필드가 섞여도 응답 스키마 파싱으로 걸러지는지 확인하기 위해 의도적으로 추가
      return { id: randomUUID(), title, internal: 'hidden' };
    },
  );
};
