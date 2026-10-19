import { chmod, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { renderEnvTemplate } from '../src/config/envTemplate';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const isForce = process.argv.includes('--force');
const isProduction = process.argv.includes('--production');

// 로컬은 .env 한 개, 서버(--production)는 deploy/.env(api·compose)와 deploy/ops.env(점검 작업 전용)
// 서버용 두 파일은 DB 계정 비밀번호가 서로 같아야 해서 같은 비밀 값 맵으로 함께 만듦
const targets = isProduction
  ? [
      { template: 'deploy/env.example', output: 'deploy/.env' },
      { template: 'deploy/ops.env.example', output: 'deploy/ops.env' },
    ]
  : [{ template: '.env.example', output: '.env' }];

// 이미 있는 파일을 실수로 덮어쓰면 DB 컨테이너의 기존 비밀번호와 어긋나므로 --force가 있어야만 교체
for (const { output } of targets) {
  const existing = await readFile(path.join(ROOT, output), 'utf8').catch(() => null);

  if (existing !== null && !isForce) {
    console.log(
      `[init-env] ${output}가 이미 있어 건너뜀 (새로 만들려면 --force, DB는 새로 만들어야 함)`,
    );
    process.exit(0);
  }
}

const values = new Map<string, string>();

for (const { template, output } of targets) {
  const source = await readFile(path.join(ROOT, template), 'utf8');
  const target = path.join(ROOT, output);

  await writeFile(target, renderEnvTemplate(source, values));
  // 비밀 값이 들어 있으므로 본인만 읽을 수 있게 함
  await chmod(target, 0o600);
  console.log(`[init-env] ${output} 생성 완료 (비밀 값은 이 PC에서 새로 만든 값)`);
}

if (isProduction) {
  console.log(
    '[init-env] <꺾쇠>로 표시된 값(접속 주소·저장소·메일)은 서버에서 직접 채우세요. 값은 저장소·채팅에 남기지 않습니다',
  );
}
