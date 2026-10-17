import { errorResponseSchema, healthResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from './app';

describe('GET /api/v1/health', () => {
  it('공유 스키마에 맞는 응답을 반환한다', async () => {
    const res = await request(createApp()).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(healthResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('모든 응답에 보안 헤더를 붙이고 서버 종류는 숨긴다', async () => {
    const res = await request(createApp()).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('프록시 단계 수를 정하면 그만큼만 믿고, 정하지 않으면 믿지 않는다', () => {
    expect(createApp().get('trust proxy')).toBe(0);
    expect(createApp({ trustProxyHops: 2 }).get('trust proxy')).toBe(2);
  });

  it('존재하지 않는 경로는 공통 오류 형식의 404를 반환한다', async () => {
    const res = await request(createApp()).get('/api/v1/unknown');

    expect(res.status).toBe(404);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });
});
