import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../..');
const STORAGE_ORIGIN = 'https://abc123.r2.cloudflarestorage.com';

describe('deploy/Caddyfile', () => {
  const caddyfile = readFileSync(path.join(ROOT, 'deploy/Caddyfile'), 'utf8');

  it('보안 정책(CSP)이 scripts/csp-header.mjs의 출력과 같다', () => {
    const header = /Content-Security-Policy "([^"]+)"/.exec(caddyfile)?.[1];

    expect(header).toBeDefined();

    // 정책 생성 스크립트는 빌드된 index.html을 읽으므로 인라인 스크립트가 없는 최소 파일로 대신함
    const output = execFileSync(
      process.execPath,
      [path.join(ROOT, 'scripts/csp-header.mjs'), path.join(ROOT, 'apps/web/index.html')],
      { env: { ...process.env, STORAGE_ORIGIN }, encoding: 'utf8' },
    ).trim();

    expect(header!.replaceAll('{$STORAGE_ORIGIN}', STORAGE_ORIGIN)).toBe(output);
  });

  it('필요한 보안 헤더와 /api 전달, 웹 대체 경로가 있다', () => {
    expect(caddyfile).toContain('Strict-Transport-Security "max-age=31536000; includeSubDomains"');
    expect(caddyfile).toContain('X-Content-Type-Options "nosniff"');
    expect(caddyfile).toContain('Referrer-Policy "no-referrer"');
    expect(caddyfile).toContain('handle /api/* {');
    expect(caddyfile).toContain('reverse_proxy api:3000');
    expect(caddyfile).toContain('try_files {path} /index.html');
  });

  it('토큰이 들어 있는 주소 경로를 접속 기록에서 가린다', () => {
    const pattern = /regexp "([^"]+)" "\$\{1\}REDACTED"/.exec(caddyfile)?.[1];
    const redact = (uri: string) => uri.replace(new RegExp(pattern!), '$1REDACTED');

    expect(redact('/reset-password/abcDEF123')).toBe('/reset-password/REDACTED');
    expect(redact('/invite/abcDEF123')).toBe('/invite/REDACTED');
    expect(redact('/closure/cancel/abcDEF123')).toBe('/closure/cancel/REDACTED');
    expect(redact('/api/v1/auth/password-reset/abcDEF123')).toBe(
      '/api/v1/auth/password-reset/REDACTED',
    );
    expect(redact('/api/v1/invitations/abcDEF123')).toBe('/api/v1/invitations/REDACTED');
    expect(redact('/api/v1/auth/closure/abcDEF123')).toBe('/api/v1/auth/closure/REDACTED');
    expect(redact('/api/v1/projects')).toBe('/api/v1/projects');
  });
});
