import express from 'express';
import request from 'supertest';
import { z } from 'zod';

import { createApp } from '../app';
import { createLogger } from '../logger';

import { createErrorHandler } from './errorHandler';
import { createMemoryIdempotencyStore } from './idempotency';
import { createRouteRegistry } from './route';

const buildApp = () => {
  const registry = createRouteRegistry({
    resolveAuth: async (req) => {
      const userId = req.get('x-user');

      return userId ? { userId, companyId: 'company-1' } : null;
    },
    idempotencyStore: createMemoryIdempotencyStore(),
    userRateLimit: { windowMs: 60_000, limit: 3 },
    exportRateLimit: { windowMs: 60_000, limit: 1 },
  });

  registry.add(
    {
      method: 'get',
      path: '/ping',
      summary: '시험용 조회',
      auth: 'required',
      response: { status: 200, schema: z.object({ ok: z.boolean() }) },
    },
    async () => ({ ok: true }),
  );
  registry.add(
    {
      method: 'get',
      path: '/report.xlsx',
      summary: '시험용 내려받기',
      auth: 'required',
      file: { contentType: 'application/octet-stream' },
      response: { status: 200, schema: z.object({}) },
    },
    async () => ({ filename: 'report.xlsx', body: Buffer.from('x') }),
  );

  const app = express();

  app.use(registry.router);
  app.use(createErrorHandler(createLogger('silent')));

  return app;
};

describe('로그인한 사용자별 요청 횟수 제한', () => {
  it('한도를 넘으면 429이고 다른 사용자는 영향을 받지 않는다', async () => {
    const app = buildApp();

    for (let count = 0; count < 3; count += 1) {
      expect((await request(app).get('/ping').set('x-user', 'user-a')).status).toBe(200);
    }

    const over = await request(app).get('/ping').set('x-user', 'user-a');

    expect(over.status).toBe(429);
    expect(over.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect((await request(app).get('/ping').set('x-user', 'user-b')).status).toBe(200);
  });

  it('한도는 라우트마다가 아니라 사용자의 전체 호출에 합산해서 센다', async () => {
    const app = buildApp();

    expect((await request(app).get('/ping').set('x-user', 'user-a')).status).toBe(200);
    expect((await request(app).get('/report.xlsx').set('x-user', 'user-a')).status).toBe(200);
    expect((await request(app).get('/ping').set('x-user', 'user-a')).status).toBe(200);
    // 서로 다른 라우트를 번갈아 불러도 합쳐서 세 번을 넘으면 막힘
    expect((await request(app).get('/ping').set('x-user', 'user-a')).status).toBe(429);
  });

  it('파일 내려받기는 더 낮은 한도를 따로 적용한다', async () => {
    const app = buildApp();

    expect((await request(app).get('/report.xlsx').set('x-user', 'user-a')).status).toBe(200);
    expect((await request(app).get('/report.xlsx').set('x-user', 'user-a')).status).toBe(429);
    expect((await request(app).get('/ping').set('x-user', 'user-a')).status).toBe(200);
  });

  it('로그인하지 않은 요청은 한도를 쓰지 않고 401이다', async () => {
    const app = buildApp();

    for (let count = 0; count < 5; count += 1) {
      expect((await request(app).get('/ping')).status).toBe(401);
    }
  });
});

describe('접속 주소별 전체 요청 횟수 제한', () => {
  it('한도를 넘으면 로그인 전 호출도 429이다', async () => {
    const app = createApp({ rateLimits: { ip: { windowMs: 60_000, limit: 2 } } });

    expect((await request(app).get('/api/v1/health')).status).toBe(200);
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
    expect((await request(app).get('/api/v1/health')).status).toBe(429);
  });

  it('기본값이 켜져 있고, false로 끌 수 있다', async () => {
    const off = createApp({ rateLimits: { ip: false, user: false, export: false } });

    for (let count = 0; count < 5; count += 1) {
      expect((await request(off).get('/api/v1/health')).status).toBe(200);
    }

    const on = await request(createApp()).get('/api/v1/health');

    expect(on.headers['ratelimit']).toBeDefined();
  });
});
