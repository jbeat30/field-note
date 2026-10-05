import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';

import { createPrismaClient, type PrismaClient } from './client';

const APP_ROLE = 'field_note_app';
const APP_PASSWORD = 'test_app_password';
const API_ROOT = path.resolve(__dirname, '../..');

export type TestDatabase = {
  // 소유 계정 (테스트 데이터 준비·스키마 점검용)
  owner: PrismaClient;
  ownerPool: pg.Pool;
  // 앱 계정 (실제 서비스와 같은 권한)
  app: PrismaClient;
  stop: () => Promise<void>;
};

/**
 * @description 실제 PostgreSQL 컨테이너를 띄우고 마이그레이션 적용 후 소유·앱 계정 클라이언트 반환
 * @returns 테스트 DB 핸들
 */
export const startTestDatabase = async (): Promise<TestDatabase> => {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:18',
  ).start();
  const ownerUrl = container.getConnectionUri();

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: API_ROOT,
    env: { ...process.env, DATABASE_MIGRATE_URL: ownerUrl },
    stdio: 'pipe',
  });

  const ownerPool = new pg.Pool({ connectionString: ownerUrl });
  await ownerPool.query(`ALTER ROLE ${APP_ROLE} PASSWORD '${APP_PASSWORD}'`);

  const appUrl = new URL(ownerUrl);
  appUrl.username = APP_ROLE;
  appUrl.password = APP_PASSWORD;

  const owner = createPrismaClient(ownerUrl);
  const app = createPrismaClient(appUrl.toString());

  return {
    owner,
    ownerPool,
    app,
    stop: async () => {
      await app.$disconnect();
      await owner.$disconnect();
      await ownerPool.end();
      await container.stop();
    },
  };
};
