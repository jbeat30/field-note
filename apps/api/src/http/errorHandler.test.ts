import { Writable } from 'node:stream';

import express from 'express';
import request from 'supertest';

import { createLogger } from '../logger';

import { createErrorHandler } from './errorHandler';

const buildApp = () => {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
  const app = express();

  app.get('/auth/password-reset/:token', () => {
    throw new Error('예상 밖 오류');
  });
  app.use(createErrorHandler(createLogger('info', stream)));

  return { app, logs: () => chunks.join('') };
};

describe('오류 처리기의 로그', () => {
  it('예상 밖 오류는 500으로 응답하고 내부 내용은 숨긴다', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/auth/password-reset/abc');

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('예상 밖 오류');
  });

  it('링크 토큰이 로그에 남지 않고 라우트 형태만 남는다', async () => {
    const { app, logs } = buildApp();

    await request(app).get('/auth/password-reset/secret-reset-token-value');

    expect(logs()).not.toContain('secret-reset-token-value');
    expect(logs()).toContain('/auth/password-reset/:token');
  });
});
