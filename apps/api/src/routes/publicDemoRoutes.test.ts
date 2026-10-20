import { publicDemoResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { PUBLIC_DEMO } from '../demo/publicDemo';

describe('GET /public/demo', () => {
  it('기본은 꺼져 있어 계정을 알려 주지 않는다', async () => {
    const res = await request(createApp()).get('/api/v1/public/demo');

    expect(res.status).toBe(200);
    expect(publicDemoResponseSchema.parse(res.body)).toEqual({ enabled: false });
    expect(JSON.stringify(res.body)).not.toContain(PUBLIC_DEMO.password);
  });

  it('켜면 시연 계정의 아이디와 비밀번호를 알려 준다', async () => {
    const res = await request(createApp({ isPublicDemoEnabled: true })).get('/api/v1/public/demo');

    expect(res.status).toBe(200);
    expect(publicDemoResponseSchema.parse(res.body)).toEqual({
      enabled: true,
      loginId: PUBLIC_DEMO.loginId,
      password: PUBLIC_DEMO.password,
    });
  });
});
