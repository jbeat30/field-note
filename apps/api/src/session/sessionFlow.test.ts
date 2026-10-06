import { errorResponseSchema, logoutResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';

import { SESSION_COOKIE } from './cookie';
import { createMemorySessionStore } from './sessionStore';

const COMPANY = '0198a000-0000-7000-8000-00000000000a';
const USER = '0198a000-0000-7000-8000-0000000000a1';
const ORIGIN = 'http://localhost:5173';

const setup = async () => {
  const sessionStore = createMemorySessionStore();
  const app = createApp({ sessionStore, appOrigin: ORIGIN, isSecureCookie: true });
  const { token } = await sessionStore.create({ userId: USER, companyId: COMPANY });

  return { app, sessionStore, token };
};

// 인증이 필요한 라우트(/me/devices)로 세션 쿠키 인증을 확인
describe('세션 인증 흐름', () => {
  it('세션 쿠키가 없으면 401', async () => {
    const { app } = await setup();
    const res = await request(app).get('/api/v1/me/devices');

    expect(res.status).toBe(401);
  });

  it('위조된 쿠키는 401', async () => {
    const { app } = await setup();
    const res = await request(app)
      .get('/api/v1/me/devices')
      .set('Cookie', `${SESSION_COOKIE}=forged-token`);

    expect(res.status).toBe(401);
  });

  it('유효한 쿠키면 인증을 통과해 기기 목록을 얻는다', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .get('/api/v1/me/devices')
      .set('Cookie', `${SESSION_COOKIE}=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.devices).toHaveLength(1);
    expect(res.body.devices[0].isCurrent).toBe(true);
  });

  it('로그아웃하면 세션이 삭제되고 쿠키가 만료된다', async () => {
    const { app, sessionStore, token } = await setup();
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Origin', ORIGIN)
      .set('Cookie', `${SESSION_COOKIE}=${token}`);

    expect(res.status).toBe(200);
    expect(logoutResponseSchema.parse(res.body).success).toBe(true);
    expect(await sessionStore.find(token)).toBeNull();
    expect(String(res.headers['set-cookie'])).toMatch(/sid=;/);

    const after = await request(app)
      .get('/api/v1/me/devices')
      .set('Cookie', `${SESSION_COOKIE}=${token}`);

    expect(after.status).toBe(401);
  });

  it('쿠키 옵션: HttpOnly, SameSite=Lax, 운영에서는 Secure', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', `${SESSION_COOKIE}=${token}`);
    const cookie = String(res.headers['set-cookie']);

    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
  });
});

describe('CSRF 방어', () => {
  it('커스텀 헤더 없는 쓰기 요청은 403 (쿠키가 유효해도)', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `${SESSION_COOKIE}=${token}`);

    expect(res.status).toBe(403);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('CSRF_REJECTED');
  });

  it('허용되지 않은 Origin의 쓰기 요청은 403', async () => {
    const { app, sessionStore, token } = await setup();
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Origin', 'https://evil.example.com')
      .set('Cookie', `${SESSION_COOKIE}=${token}`);

    expect(res.status).toBe(403);
    expect(await sessionStore.find(token)).not.toBeNull();
  });

  it('조회 요청에는 커스텀 헤더를 요구하지 않는다', async () => {
    const { app } = await setup();
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
  });
});
