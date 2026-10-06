import { parseEnv } from './env';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pw@localhost:5432/db',
  DATABASE_MIGRATE_URL: 'postgresql://owner:pw@localhost:5432/db',
  DATABASE_AUTH_URL: 'postgresql://auth:pw@localhost:5432/db',
  DATABASE_QUEUE_URL: 'postgresql://queue:pw@localhost:5432/db',
  CODE_HASH_SECRET: 'test-secret-test-secret-test-secret-0000',
  OAUTH_COOKIE_SECRET: 'oauth-secret-oauth-secret-oauth-secret-0',
  APP_ORIGIN: 'http://localhost:5173',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'bucket',
  S3_ACCESS_KEY: 'key',
  S3_SECRET_KEY: 'secret',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  SMTP_FROM: 'no-reply@example.com',
};

describe('parseEnv', () => {
  it('유효한 값은 기본값을 채워 반환한다', () => {
    const env = parseEnv(validEnv);

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.SMTP_PORT).toBe(1025);
  });

  it('필수 값이 없으면 변수 이름이 담긴 오류를 던진다', () => {
    expect(() => parseEnv({ ...validEnv, DATABASE_URL: undefined })).toThrow('DATABASE_URL');
  });

  it('오류 메시지에 값을 노출하지 않는다', () => {
    const message = (() => {
      try {
        parseEnv({ ...validEnv, DATABASE_URL: 'secret-value' });
        return '';
      } catch (error) {
        return (error as Error).message;
      }
    })();

    expect(message).toContain('DATABASE_URL');
    expect(message).not.toContain('secret-value');
  });
});
