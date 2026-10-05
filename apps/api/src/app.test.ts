import { errorResponseSchema, healthResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from './app';

describe('GET /api/v1/health', () => {
  it('공유 스키마에 맞는 응답을 반환한다', async () => {
    const res = await request(createApp()).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(healthResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('존재하지 않는 경로는 공통 오류 형식의 404를 반환한다', async () => {
    const res = await request(createApp()).get('/api/v1/unknown');

    expect(res.status).toBe(404);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });
});
