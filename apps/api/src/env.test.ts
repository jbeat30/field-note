import { parseEnv } from './env';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pw@localhost:5432/db',
  DATABASE_MIGRATE_URL: 'postgresql://owner:pw@localhost:5432/db',
  DATABASE_AUTH_URL: 'postgresql://auth:pw@localhost:5432/db',
  DATABASE_QUEUE_URL: 'postgresql://queue:pw@localhost:5432/db',
  CODE_HASH_SECRET: 'test-secret-test-secret-test-secret-0000',
  OAUTH_COOKIE_SECRET: 'oauth-secret-oauth-secret-oauth-secret-0',
  TOTP_ENCRYPTION_KEY: 'totp-key-totp-key-totp-key-totp-key-0',
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
  it('2단계 인증 암호화 키는 32자 이상이어야 한다', () => {
    expect(() => parseEnv({ ...validEnv, TOTP_ENCRYPTION_KEY: 'short' })).toThrow(
      /TOTP_ENCRYPTION_KEY/,
    );
    expect(() => parseEnv({ ...validEnv, TOTP_ENCRYPTION_KEY: undefined })).toThrow(
      /TOTP_ENCRYPTION_KEY/,
    );
  });

  it('유효한 값은 기본값을 채워 반환한다', () => {
    const env = parseEnv(validEnv);

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.SMTP_PORT).toBe(1025);
  });

  it('프록시 단계 수는 기본 0이고 0~5의 정수만 받는다', () => {
    expect(parseEnv(validEnv).TRUST_PROXY_HOPS).toBe(0);
    expect(parseEnv({ ...validEnv, TRUST_PROXY_HOPS: '2' }).TRUST_PROXY_HOPS).toBe(2);
    expect(() => parseEnv({ ...validEnv, TRUST_PROXY_HOPS: '6' })).toThrow('TRUST_PROXY_HOPS');
    expect(() => parseEnv({ ...validEnv, TRUST_PROXY_HOPS: '-1' })).toThrow('TRUST_PROXY_HOPS');
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

  describe('운영 환경 분리', () => {
    const production = {
      ...validEnv,
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgresql://app:Xk29fj3kd8s@db.example.com:5432/field_note',
      DATABASE_MIGRATE_URL: 'postgresql://owner:Xk29fj3kd8s@db.example.com:5432/field_note',
      DATABASE_AUTH_URL: 'postgresql://auth:Xk29fj3kd8s@db.example.com:5432/field_note',
      DATABASE_QUEUE_URL: 'postgresql://queue:Xk29fj3kd8s@db.example.com:5432/field_note',
      APP_ORIGIN: 'https://app.example.com',
      S3_ENDPOINT: 'https://s3.example.com',
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'mailer',
      SMTP_PASSWORD: 'mail-password',
    };

    it('운영용 값이면 통과한다', () => {
      expect(parseEnv(production).NODE_ENV).toBe('production');
    });

    it.each([
      ['DATABASE_URL', 'postgresql://app:pw@localhost:5432/db'],
      ['DATABASE_AUTH_URL', 'postgresql://auth:pw@127.0.0.1:5432/db'],
      ['S3_ENDPOINT', 'http://localhost:9000'],
      ['SMTP_HOST', 'mailpit'],
      ['APP_ORIGIN', 'http://app.example.com'],
      ['LOG_LEVEL', 'debug'],
      ['SMTP_USER', undefined],
      ['RATE_LIMIT_MULTIPLIER', '10'],
      ['DATABASE_MIGRATE_URL', 'postgresql://field_note:field_note@db.example.com:5432/field_note'],
    ])('운영에서 %s가 로컬·개발용 값이면 기동을 막는다', (key, value) => {
      expect(() => parseEnv({ ...production, [key]: value })).toThrow(key);
    });

    it('운영에서 <꺾쇠> 자리표시자가 남아 있으면 기동을 막는다', () => {
      expect(() => parseEnv({ ...production, S3_ACCESS_KEY: '<R2 접근 키 ID>' })).toThrow(
        'S3_ACCESS_KEY',
      );
      expect(() => parseEnv({ ...production, SMTP_PASSWORD: '<Gmail 앱 비밀번호>' })).toThrow(
        'SMTP_PASSWORD',
      );
    });

    it('DB 연결 수 상한은 기본 10이고 1~50 범위만 받는다', () => {
      expect(parseEnv(production).DB_POOL_MAX).toBe(10);
      expect(parseEnv({ ...production, DB_POOL_MAX: '5' }).DB_POOL_MAX).toBe(5);
      expect(() => parseEnv({ ...production, DB_POOL_MAX: '0' })).toThrow('DB_POOL_MAX');
      expect(() => parseEnv({ ...production, DB_POOL_MAX: '51' })).toThrow('DB_POOL_MAX');
    });

    it('개발 환경에서는 호출 횟수 제한 배수를 올릴 수 있다', () => {
      expect(parseEnv({ ...validEnv, RATE_LIMIT_MULTIPLIER: '10' }).RATE_LIMIT_MULTIPLIER).toBe(10);
      expect(parseEnv(validEnv).RATE_LIMIT_MULTIPLIER).toBe(1);
    });

    it('개발 환경에서는 로컬 값을 그대로 쓸 수 있다', () => {
      expect(() =>
        parseEnv({ ...validEnv, NODE_ENV: 'development', LOG_LEVEL: 'debug' }),
      ).not.toThrow();
    });
  });
});
