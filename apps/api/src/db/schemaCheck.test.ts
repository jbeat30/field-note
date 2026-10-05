import { startTestDatabase, type TestDatabase } from './testDatabase';

// 회사 자체를 나타내는 테이블 (company_id 대신 id로 격리)
const TENANT_TABLES = ['companies'];
const MIGRATION_TABLES = ['_prisma_migrations'];

let db: TestDatabase;

jest.setTimeout(120_000);

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await db.stop();
});

describe('스키마 검사', () => {
  it('모든 업무 테이블은 NOT NULL company_id를 가진다', async () => {
    const { rows } = await db.ownerPool.query<{ table_name: string }>(
      `SELECT t.table_name
         FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND t.table_name <> ALL($1)
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
             WHERE c.table_schema = 'public' AND c.table_name = t.table_name
               AND c.column_name = 'company_id' AND c.is_nullable = 'NO')`,
      [[...TENANT_TABLES, ...MIGRATION_TABLES]],
    );

    expect(rows.map((row) => row.table_name)).toEqual([]);
  });

  it('모든 회사 범위 테이블은 RLS 활성·강제와 정책을 가진다', async () => {
    const { rows } = await db.ownerPool.query<{ relname: string }>(
      `SELECT c.relname
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> ALL($1)
          AND NOT (
            c.relrowsecurity AND c.relforcerowsecurity
            AND EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname)
          )`,
      [MIGRATION_TABLES],
    );

    expect(rows.map((row) => row.relname)).toEqual([]);
  });

  it('앱 계정은 어떤 테이블도 삭제·구조 변경 권한이 없다', async () => {
    const { rows } = await db.ownerPool.query<{ table_name: string; privilege_type: string }>(
      `SELECT table_name, privilege_type
         FROM information_schema.role_table_grants
        WHERE grantee = 'field_note_app'
          AND privilege_type IN ('DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')`,
    );

    expect(rows).toEqual([]);
  });
});
