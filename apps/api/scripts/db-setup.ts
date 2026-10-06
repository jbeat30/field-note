import { execFileSync } from 'node:child_process';

import pg from 'pg';

const migrateUrl = process.env.DATABASE_MIGRATE_URL;
const appUrl = process.env.DATABASE_URL;
const authUrl = process.env.DATABASE_AUTH_URL;
const operatorUrl = process.env.DATABASE_OPERATOR_URL;
const queueUrl = process.env.DATABASE_QUEUE_URL;
const purgeUrl = process.env.DATABASE_PURGE_URL;

if (!migrateUrl || !appUrl || !authUrl || !operatorUrl || !queueUrl || !purgeUrl) {
  throw new Error(
    '[db-setup] DATABASE_MIGRATE_URL, DATABASE_URL, DATABASE_AUTH_URL, DATABASE_OPERATOR_URL, DATABASE_QUEUE_URL, DATABASE_PURGE_URL 필요',
  );
}

// 마이그레이션은 소유 계정으로 적용
execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], { stdio: 'inherit' });

// 앱·회사 범위 밖 전용·운영자 계정 비밀번호는 마이그레이션 파일에 두지 않고 환경 변수 값으로 설정
const roleUrls = [appUrl, authUrl, operatorUrl, queueUrl, purgeUrl];
const client = new pg.Client({ connectionString: migrateUrl });

await client.connect();

for (const roleUrl of roleUrls) {
  const { username, password } = new URL(roleUrl);

  await client.query(
    `ALTER ROLE ${pg.escapeIdentifier(username)} PASSWORD ${pg.escapeLiteral(decodeURIComponent(password))}`,
  );
  console.log(`[db-setup] 계정 비밀번호 설정 role=${username}`);
}

await client.end();
