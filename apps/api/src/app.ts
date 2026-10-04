import { healthResponseSchema } from '@field-note/shared';
import express from 'express';

/**
 * @description Express 앱 생성 (서버 기동과 분리해 테스트에서 재사용)
 * @returns 라우트가 등록된 Express 앱
 */
export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');

  app.get('/api/v1/health', (_req, res) => {
    res.json(healthResponseSchema.parse({ status: 'ok', service: 'field-note' }));
  });

  return app;
};
