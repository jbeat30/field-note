import { execFileSync } from 'node:child_process';

import pg from 'pg';

const migrateUrl = process.env.DATABASE_MIGRATE_URL;
const appUrl = process.env.DATABASE_URL;

if (!migrateUrl || !appUrl) {
  throw new Error('[db-setup] DATABASE_MIGRATE_URL, DATABASE_URL 필요');
}

// 마이그레이션은 소유 계정으로 적용
execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], { stdio: 'inherit' });

// 앱 계정 비밀번호는 마이그레이션 파일에 두지 않고 환경 변수 값으로 설정
const { username, password } = new URL(appUrl);
const client = new pg.Client({ connectionString: migrateUrl });

await client.connect();
await client.query(
  `ALTER ROLE ${pg.escapeIdentifier(username)} PASSWORD ${pg.escapeLiteral(decodeURIComponent(password))}`,
);
await client.end();

console.log(`[db-setup] 완료 app=${username}`);
