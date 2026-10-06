import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';

import { withDatabase } from './connectionUrl';

// 테스트 실행 전체가 PostgreSQL 컨테이너 하나를 공유한다 (스위트마다 컨테이너를 띄우면 느리고 종료 시점에 연결 오류가 난다)
// 스위트는 마이그레이션이 끝난 템플릿 DB를 복제해 자기만의 DB를 쓴다
export const SHARED_URL_ENV = 'FIELD_NOTE_TEST_PG_URL';
export const TEMPLATE_DB = 'field_note_template';

export const ROLE_PASSWORDS = {
  field_note_app: 'test_app_password',
  field_note_auth: 'test_auth_password',
  field_note_operator: 'test_operator_password',
  field_note_queue: 'test_queue_password',
  field_note_purge: 'test_purge_password',
} as const;

const API_ROOT = path.resolve(__dirname, '../..');

/**
 * @description 마이그레이션 적용과 역할 비밀번호 설정을 마친 템플릿 DB가 있는 컨테이너 시작
 * 역할(계정)은 클러스터 전체에 속하므로 여기서 한 번만 설정하면 복제한 모든 DB에서 쓸 수 있다
 * @returns 컨테이너와 관리용 접속 주소 (`postgres` DB)
 */
export const startSharedPostgres = async (): Promise<{
  container: StartedPostgreSqlContainer;
  adminUrl: string;
}> => {
  // 테스트용이라 내구성 설정을 꺼서 쓰기를 빠르게 하고, 병렬 스위트의 연결을 받도록 연결 수를 늘림
  const container = await new PostgreSqlContainer('postgres:18')
    .withCommand([
      'postgres',
      '-c',
      'fsync=off',
      '-c',
      'synchronous_commit=off',
      '-c',
      'full_page_writes=off',
      '-c',
      'max_connections=500',
    ])
    .start();
  const adminUrl = withDatabase(container.getConnectionUri(), 'postgres');
  const admin = new pg.Pool({ connectionString: adminUrl });

  try {
    await admin.query(`CREATE DATABASE ${TEMPLATE_DB}`);

    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: API_ROOT,
      env: { ...process.env, DATABASE_MIGRATE_URL: withDatabase(adminUrl, TEMPLATE_DB) },
      stdio: 'pipe',
    });

    for (const [role, password] of Object.entries(ROLE_PASSWORDS)) {
      await admin.query(`ALTER ROLE ${role} PASSWORD '${password}'`);
    }
  } finally {
    await admin.end();
  }

  return { container, adminUrl };
};
