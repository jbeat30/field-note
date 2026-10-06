import { chmod, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { renderEnvTemplate } from '../src/config/envTemplate';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const ENV_PATH = path.join(ROOT, '.env');
const isForce = process.argv.includes('--force');

// 이미 있는 .env를 실수로 덮어쓰면 DB 컨테이너의 기존 비밀번호와 어긋나므로 --force가 있어야만 교체
const existing = await readFile(ENV_PATH, 'utf8').catch(() => null);

if (existing !== null && !isForce) {
  console.log(
    '[init-env] .env가 이미 있어 건너뜀 (새로 만들려면 --force, DB는 pnpm db:reset 필요)',
  );
  process.exit(0);
}

const template = await readFile(path.join(ROOT, '.env.example'), 'utf8');

await writeFile(ENV_PATH, renderEnvTemplate(template));
// 비밀 값이 들어 있으므로 본인만 읽을 수 있게 함
await chmod(ENV_PATH, 0o600);

console.log('[init-env] .env 생성 완료 (비밀 값은 이 PC에서 새로 만든 값)');
