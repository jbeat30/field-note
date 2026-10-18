import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import request from 'supertest';

import { createApp } from '../app';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';

type Operation = { security?: unknown[] };
type OpenApi = { paths: Record<string, Record<string, Operation>> };

// 로그인 없이 부를 수 있는 엔드포인트 (가입·로그인·재설정·해지 취소·소셜 로그인·상태 확인), 새 공개 엔드포인트는 여기에 이유와 함께 추가해야 함
const PUBLIC_ENDPOINTS = [
  'GET /health',
  'GET /invitations/{token}',
  'POST /auth/signup',
  'POST /auth/login',
  'POST /auth/password-reset/request',
  'GET /auth/password-reset/{token}',
  'POST /auth/password-reset/confirm',
  'GET /auth/closure/{token}',
  'POST /auth/closure/cancel',
  'GET /auth/social/providers',
  'POST /auth/{provider}/start',
  'GET /auth/{provider}/callback',
];

const spec = JSON.parse(
  readFileSync(join(__dirname, '../../../../packages/shared/openapi/openapi.json'), 'utf8'),
) as OpenApi;
const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({
    method,
    path: path.replace('/api/v1', ''),
    isPublic: (operation.security?.length ?? 0) === 0,
  })),
);
const DUMMY_ID = '0198a000-0000-7000-8000-0000000000ff';
const fill = (path: string) => path.replace(/\{\w+\}/g, DUMMY_ID);

describe('로그인 필요 여부', () => {
  it('로그인 없이 부를 수 있는 엔드포인트는 정해진 목록뿐이다', () => {
    const open = operations
      .filter((operation) => operation.isPublic)
      .map((operation) => `${operation.method.toUpperCase()} ${operation.path}`)
      .sort();

    expect(open).toEqual([...PUBLIC_ENDPOINTS].sort());
  });

  it('로그인이 필요한 모든 엔드포인트는 로그인하지 않으면 입력 내용과 무관하게 401이다', async () => {
    const app = createApp({ rateLimits: { ip: false, user: false, export: false } });
    const secured = operations.filter((operation) => !operation.isPublic);
    const failures: string[] = [];

    expect(secured.length).toBeGreaterThan(100);

    for (const { method, path } of secured) {
      const agent = request(app) as unknown as Record<
        string,
        (url: string) => request.Test & { send: (body: unknown) => request.Test }
      >;
      // 본문·쿼리를 일부러 틀리게 보내도 400(입력 검증)이 아니라 401이어야 함
      const res = await agent[method]!(`/api/v1${fill(path)}?invalid[]=1`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .set('Origin', 'http://localhost:5173')
        .send({ invalid: true });

      if (res.status !== 401) {
        failures.push(`${method.toUpperCase()} ${path} -> ${res.status}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('잘못된 쿠키와 형식이 깨진 쿠키도 로그인한 것으로 보지 않는다', async () => {
    const app = createApp({ rateLimits: { ip: false, user: false, export: false } });

    for (const cookie of ['sid=forged', 'sid=', 'sid=%00', `sid=${'a'.repeat(5000)}`]) {
      const res = await request(app).get('/api/v1/projects').set('Cookie', cookie);

      expect(res.status).toBe(401);
    }
  });
});
