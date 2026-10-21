import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
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

  it('server-setup.sh는 로그 폴더를 크론을 돌리는 계정 소유로 만든다', () => {
    const script = read('scripts/server-setup.sh');

    expect(script).toMatch(/install -d -o "\$\{TARGET_USER:-root\}".*deploy\/logs/);
  });

  // 루트나 Windows는 권한 검사가 달라 폴더에 쓸 수 없는 상황을 만들 수 없음
  const canRestrictWrite = process.platform !== 'win32' && process.getuid?.() !== 0;

  (canRestrictWrite ? it : it.skip)(
    'run-ops.sh는 로그 폴더에 쓸 수 없으면 조용히 넘어가지 않고 오류로 끝난다',
    () => {
      const root = mkdtempSync(path.join(tmpdir(), 'run-ops-'));
      const logs = path.join(root, 'deploy/logs');

      try {
        mkdirSync(path.join(root, 'deploy/scripts'), { recursive: true });
        mkdirSync(logs);
        copyFileSync(
          path.join(DEPLOY, 'scripts/run-ops.sh'),
          path.join(root, 'deploy/scripts/run-ops.sh'),
        );
        chmodSync(logs, 0o500);

        const result = spawnSync(
          'bash',
          [path.join(root, 'deploy/scripts/run-ops.sh'), 'backup', 'true'],
          {
            encoding: 'utf8',
          },
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('에 쓸 수 없음');
      } finally {
        chmodSync(logs, 0o700);
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it('서버 단축어 파일은 문법이 맞고 문서의 명령을 모두 정의한다', () => {
    const file = path.join(DEPLOY, 'server-aliases.sh');
    const syntax = spawnSync('bash', ['-n', file], { encoding: 'utf8' });

    expect(syntax.status).toBe(0);

    const aliases = readFileSync(file, 'utf8');

    for (const name of ['fnc', 'fn-ops', 'new-company', 'reissue-invite', 'list-companies']) {
      expect(aliases).toContain(`\n${name}() {`);
    }
  });

  it('ops·migrate 컨테이너는 pnpm 11이 읽는 이름으로 의존성 재설치 점검을 끈다', () => {
    const compose = read('docker-compose.yml');

    // pnpm 11은 npm_config_* 를 읽지 않으므로 옛 이름은 아무 효과가 없음
    expect(compose).not.toMatch(/npm_config_verify_deps_before_run/);
    expect(compose.match(/PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: 'false'/g)).toHaveLength(2);
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
