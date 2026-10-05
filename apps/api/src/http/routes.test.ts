import {
  errorResponseSchema,
  sampleResponseSchema,
  sessionResponseSchema,
} from '@field-note/shared';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';

import { createApp, type AppOptions } from '../app';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from './csrf';

import { createErrorHandler, notFoundHandler } from './errorHandler';
import { createMemoryIdempotencyStore } from './idempotency';
import { createRouteRegistry } from './route';
import type { AuthContext } from './types';
import { createLogger } from '../logger';

const COMPANY_A = '0198a000-0000-7000-8000-00000000000a';
const COMPANY_B = '0198a000-0000-7000-8000-00000000000b';
const USER = '0198a000-0000-7000-8000-0000000000aa';

// 테스트용 세션: x-test-company 헤더가 있으면 해당 회사의 로그인 상태 (실제 세션은 T0-7)
const resolveAuth: NonNullable<AppOptions['resolveAuth']> = async (
  req,
): Promise<AuthContext | null> => {
  const companyId = req.get('x-test-company');

  return companyId ? { userId: USER, companyId } : null;
};

const buildApp = () => createApp({ resolveAuth, idempotencyStore: createMemoryIdempotencyStore() });
const keyOf = (n: number) => `test-key-${n}-0000`;

describe('requireAuth', () => {
  it('세션이 없으면 401', async () => {
    const res = await request(buildApp()).get('/api/v1/session');

    expect(res.status).toBe(401);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('UNAUTHORIZED');
  });

  it('세션이 있으면 회사 ID를 세션에서 얻는다', async () => {
    const res = await request(buildApp()).get('/api/v1/session').set('x-test-company', COMPANY_A);

    expect(res.status).toBe(200);
    expect(sessionResponseSchema.parse(res.body).companyId).toBe(COMPANY_A);
  });

  it('요청 본문의 회사 ID는 무시한다', async () => {
    const res = await request(buildApp())
      .get('/api/v1/session')
      .query({ companyId: COMPANY_B })
      .set('x-test-company', COMPANY_A);

    expect(res.body.companyId).toBe(COMPANY_A);
  });
});

describe('validate', () => {
  it('검증 실패는 400과 위치별 사유를 반환하고 입력 값은 노출하지 않는다', async () => {
    const res = await request(buildApp())
      .post('/api/v1/samples')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('x-test-company', COMPANY_A)
      .set('Idempotency-Key', keyOf(1))
      .send({ title: '' });

    const parsed = errorResponseSchema.parse(res.body);

    expect(res.status).toBe(400);
    expect(parsed.error.code).toBe('VALIDATION_ERROR');
    expect(parsed.error.details?.[0]?.path).toBe('body.title');
  });
});

describe('응답 스키마 파싱', () => {
  it('스키마에 없는 내부 필드는 응답에서 제거한다', async () => {
    const res = await request(buildApp())
      .post('/api/v1/samples')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('x-test-company', COMPANY_A)
      .set('Idempotency-Key', keyOf(2))
      .send({ title: '현장 A' });

    expect(res.status).toBe(201);
    expect(sampleResponseSchema.parse(res.body).title).toBe('현장 A');
    expect(res.body).not.toHaveProperty('internal');
  });
});

describe('멱등 키', () => {
  const post = (app: express.Express, company: string, key: string | null, title: string) => {
    const req = request(app)
      .post('/api/v1/samples')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('x-test-company', company);

    return (key ? req.set('Idempotency-Key', key) : req).send({ title });
  };

  it('키가 없으면 400', async () => {
    const res = await post(buildApp(), COMPANY_A, null, '제목');

    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('같은 키·같은 내용의 재전송은 처음 응답을 그대로 반환한다', async () => {
    const app = buildApp();
    const first = await post(app, COMPANY_A, keyOf(3), '제목');
    const replay = await post(app, COMPANY_A, keyOf(3), '제목');

    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(first.headers['idempotent-replayed']).toBeUndefined();
  });

  it('같은 키로 다른 내용을 보내면 422', async () => {
    const app = buildApp();

    await post(app, COMPANY_A, keyOf(4), '제목');
    const res = await post(app, COMPANY_A, keyOf(4), '다른 제목');

    expect(res.status).toBe(422);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('다른 회사가 같은 키를 써도 서로 영향이 없다', async () => {
    const app = buildApp();
    const a = await post(app, COMPANY_A, keyOf(5), '제목');
    const b = await post(app, COMPANY_B, keyOf(5), '제목');

    expect(b.headers['idempotent-replayed']).toBeUndefined();
    expect(b.body.id).not.toBe(a.body.id);
  });
});

describe('속도 제한과 예상 밖 오류', () => {
  const buildCustomApp = (
    registerRoutes: (registry: ReturnType<typeof createRouteRegistry>) => void,
  ) => {
    const registry = createRouteRegistry({
      resolveAuth,
      idempotencyStore: createMemoryIdempotencyStore(),
    });
    const app = express();

    registerRoutes(registry);
    app.use(registry.router);
    app.use(notFoundHandler);
    app.use(createErrorHandler(createLogger('silent')));

    return app;
  };

  it('허용 횟수를 넘으면 공통 오류 형식의 429', async () => {
    const app = buildCustomApp(({ add }) =>
      add(
        {
          method: 'get',
          path: '/limited',
          summary: '제한 확인',
          auth: 'none',
          response: { status: 200, schema: z.object({ ok: z.boolean() }) },
          rateLimit: { windowMs: 60_000, limit: 2 },
        },
        async () => ({ ok: true }),
      ),
    );

    await request(app).get('/limited');
    await request(app).get('/limited');
    const res = await request(app).get('/limited');

    expect(res.status).toBe(429);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('예상 밖 오류는 내부 내용을 숨긴 500을 반환한다', async () => {
    const app = buildCustomApp(({ add }) =>
      add(
        {
          method: 'get',
          path: '/boom',
          summary: '오류 확인',
          auth: 'none',
          response: { status: 200, schema: z.object({ ok: z.boolean() }) },
        },
        async () => {
          throw new Error('SELECT * FROM secret_table 실패');
        },
      ),
    );

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret_table');
    expect(errorResponseSchema.parse(res.body).error.code).toBe('INTERNAL_ERROR');
  });

  it('멱등 키를 인증 없는 라우트에 쓰면 등록 시점에 거부한다', () => {
    expect(() =>
      buildCustomApp(({ add }) =>
        add(
          {
            method: 'post',
            path: '/bad',
            summary: '잘못된 설정',
            auth: 'none',
            response: { status: 200, schema: z.object({}) },
            idempotent: true,
          },
          async () => ({}),
        ),
      ),
    ).toThrow('멱등 키는 인증 필요 라우트에만 사용');
  });
});
