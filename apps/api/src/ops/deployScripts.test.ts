import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const DEPLOY = path.resolve(__dirname, '../../../../deploy');
const read = (file: string) => readFileSync(path.join(DEPLOY, file), 'utf8');

describe('deploy/scripts/init-env.sh', () => {
  const script = read('scripts/init-env.sh');
  const tokens = new Set(
    [
      ...read('env.example').matchAll(/\{\{([A-Z0-9_]+)\}\}/g),
      ...read('ops.env.example').matchAll(/\{\{([A-Z0-9_]+)\}\}/g),
    ].map((match) => match[1]!),
  );

  it('템플릿의 모든 토큰에 값을 만들어 준다 (토큰을 추가하고 스크립트를 빠뜨리지 않음)', () => {
    for (const token of tokens) {
      const handled =
        token.startsWith('DB_') && token.endsWith('_PASSWORD')
          ? script.includes('DB_*_PASSWORD')
          : script.includes(token);

      expect({ token, handled }).toEqual({ token, handled: true });
    }
  });
});

describe('deploy/scripts', () => {
  it('모든 스크립트가 오류에서 멈추는 설정으로 시작한다', () => {
    for (const file of readdirSync(path.join(DEPLOY, 'scripts')).filter((name) =>
      name.endsWith('.sh'),
    )) {
      const script = read(`scripts/${file}`);

      expect(script.startsWith('#!/usr/bin/env bash')).toBe(true);
      expect(script).toMatch(/^set -[eu]*o pipefail|^set -[a-z]*u/m);
    }
  });

  it('crontab 예시의 작업이 run-ops.sh를 거친다', () => {
    const crontab = readFileSync(path.resolve(DEPLOY, '../ops/crontab.example'), 'utf8');
    const jobs = crontab.split('\n').filter((line) => /^[\d*]/.test(line));

    // 백업, 해지 삭제, 복구 시험, 시연 회사 초기화
    expect(jobs).toHaveLength(4);
    for (const job of jobs) {
      expect(job).toContain('deploy/scripts/run-ops.sh');
    }
  });
});
