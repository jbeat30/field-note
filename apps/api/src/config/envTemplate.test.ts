import { readFileSync } from 'node:fs';
import path from 'node:path';

import { parseEnv } from '../env';

import { renderEnvTemplate } from './envTemplate';

const parseDotenv = (text: string) =>
  Object.fromEntries(
    text
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.startsWith('#'))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
  );

describe('renderEnvTemplate', () => {
  it('같은 토큰은 모든 위치에서 같은 값, 다른 토큰은 다른 값이다', () => {
    const rendered = renderEnvTemplate(
      'A=postgres://u:{{DB_OWNER_PASSWORD}}@h\nB={{DB_OWNER_PASSWORD}}\nC={{DB_APP_PASSWORD}}',
    );
    const [a, b, c] = rendered.split('\n').map((line) => line.split('=').slice(1).join('='));

    expect(a).toContain(b!);
    expect(c).not.toBe(b);
  });

  it('실행할 때마다 다른 비밀 값을 만든다', () => {
    expect(renderEnvTemplate('K={{S3_SECRET_KEY}}')).not.toBe(
      renderEnvTemplate('K={{S3_SECRET_KEY}}'),
    );
  });

  it('접근 키는 20자 대문자·숫자, 비밀 키는 40자다', () => {
    const [access, secret] = renderEnvTemplate('{{S3_ACCESS_KEY}}\n{{S3_SECRET_KEY}}').split('\n');

    expect(access).toMatch(/^[A-Z2-7]{20}$/);
    expect(secret).toMatch(/^[A-Za-z0-9_-]{40}$/);
  });

  it('알 수 없는 토큰은 거부한다', () => {
    expect(() => renderEnvTemplate('X={{UNKNOWN_SECRET}}')).toThrow('UNKNOWN_SECRET');
  });

  it('실제 .env.example을 렌더링하면 환경 변수 검증을 통과하고 비밀 값 토큰이 남지 않는다', () => {
    const template = readFileSync(path.resolve(__dirname, '../../../../.env.example'), 'utf8');
    const rendered = renderEnvTemplate(template);

    expect(rendered).not.toContain('{{');
    expect(() => parseEnv(parseDotenv(rendered))).not.toThrow();
  });

  describe('서버용 템플릿(deploy)', () => {
    const read = (file: string) =>
      readFileSync(path.resolve(__dirname, '../../../../deploy', file), 'utf8');
    const values = new Map<string, string>();
    const main = renderEnvTemplate(read('env.example'), values);
    const ops = renderEnvTemplate(read('ops.env.example'), values);

    it('두 파일이 같은 DB 계정 비밀번호를 쓰고 비밀 값 토큰이 남지 않는다', () => {
      const pick = (text: string, name: string) => parseDotenv(text)[name]!;

      expect(main).not.toContain('{{');
      expect(ops).not.toContain('{{');
      expect(new URL(pick(main, 'DATABASE_MIGRATE_URL')).password).toBe(
        pick(main, 'POSTGRES_PASSWORD'),
      );
      expect(pick(ops, 'BACKUP_ENCRYPTION_KEY')).toHaveLength(43);
    });

    it('자리표시자를 실제 값으로 바꾸면 api가 운영 모드로 기동할 수 있다 (필요한 값이 빠지지 않음)', () => {
      const filled = Object.fromEntries(
        Object.entries(parseDotenv(main)).map(([key, value]) => [
          key,
          value
            .replace('<서버IP-하이픈.sslip.io>', '203-0-113-10.sslip.io')
            .replace('<R2 계정 ID>', 'abc123')
            .replace(/<[^>]+>/, 'filled-value'),
        ]),
      );

      expect(
        parseEnv({
          ...filled,
          SMTP_FROM: 'service@gmail.com',
          NODE_ENV: 'production',
          LOG_LEVEL: 'info',
          TRUST_PROXY_HOPS: '1',
          APP_ORIGIN: 'https://203-0-113-10.sslip.io',
          SMTP_USER: 'service@gmail.com',
        }).NODE_ENV,
      ).toBe('production');
    });

    it('자리표시자를 채우지 않으면 기동을 막는다', () => {
      expect(() =>
        parseEnv({
          ...parseDotenv(main),
          NODE_ENV: 'production',
          LOG_LEVEL: 'info',
          APP_ORIGIN: 'https://203-0-113-10.sslip.io',
          SMTP_FROM: 'service@gmail.com',
        }),
      ).toThrow();
    });
  });
});
