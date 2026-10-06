import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';

import { createPrismaClient, type PrismaClient } from './client';

const APP_ROLE = 'field_note_app';
const APP_PASSWORD = 'test_app_password';
const AUTH_ROLE = 'field_note_auth';
const AUTH_PASSWORD = 'test_auth_password';
const OPERATOR_ROLE = 'field_note_operator';
const OPERATOR_PASSWORD = 'test_operator_password';
const API_ROOT = path.resolve(__dirname, '../..');

export type TestDatabase = {
  // 소유 계정 (테스트 데이터 준비·스키마 점검용)
  owner: PrismaClient;
  ownerPool: pg.Pool;
  // 앱 계정 (실제 서비스와 같은 권한)
  app: PrismaClient;
  // 회사 범위 밖 전용 계정 (세션만 접근 가능)
  auth: PrismaClient;
  // 운영자 계정 (회사·계정·초대 발급과 작업 기록만 가능)
  operator: PrismaClient;
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

  await ownerPool.query(`ALTER ROLE ${AUTH_ROLE} PASSWORD '${AUTH_PASSWORD}'`);
  await ownerPool.query(`ALTER ROLE ${OPERATOR_ROLE} PASSWORD '${OPERATOR_PASSWORD}'`);

  const roleUrl = (username: string, password: string) => {
    const url = new URL(ownerUrl);

    url.username = username;
    url.password = password;

    return url.toString();
  };

  const owner = createPrismaClient(ownerUrl);
  const app = createPrismaClient(roleUrl(APP_ROLE, APP_PASSWORD));
  const auth = createPrismaClient(roleUrl(AUTH_ROLE, AUTH_PASSWORD));
  const operator = createPrismaClient(roleUrl(OPERATOR_ROLE, OPERATOR_PASSWORD));

  return {
    owner,
    ownerPool,
    app,
    auth,
    operator,
    stop: async () => {
      await app.$disconnect();
      await auth.$disconnect();
      await operator.$disconnect();
      await owner.$disconnect();
      await ownerPool.end();
      await container.stop();
    },
  };
};
