import { APP_NAME, healthResponseSchema } from './health';

describe('healthResponseSchema', () => {
  it('정상 응답을 통과시킨다', () => {
    expect(healthResponseSchema.parse({ status: 'ok', service: APP_NAME })).toEqual({
      status: 'ok',
      service: APP_NAME,
    });
  });

  it('다른 서비스 이름은 거부한다', () => {
    expect(healthResponseSchema.safeParse({ status: 'ok', service: 'other' }).success).toBe(false);
  });
});
