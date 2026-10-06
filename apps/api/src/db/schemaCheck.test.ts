import { startTestDatabase, type TestDatabase } from './testDatabase';

// 회사 자체를 나타내는 테이블 (company_id 대신 id로 격리)
const TENANT_TABLES = ['companies'];
// 회사와 무관한 공용 자료 (앱·전용 계정은 조회만 가능해야 함, 아래 검사에서 확인)
const GLOBAL_TABLES = ['legal_documents'];
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
      [[...TENANT_TABLES, ...GLOBAL_TABLES, ...MIGRATION_TABLES]],
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
      [[...GLOBAL_TABLES, ...MIGRATION_TABLES]],
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

  it('앱 계정은 세션 테이블에 접근할 수 없다', async () => {
    await expect(db.app.$queryRaw`SELECT * FROM sessions`).rejects.toThrow();
  });

  it('회사 범위 밖 전용 계정은 업무 테이블에 접근할 수 없다', async () => {
    await expect(db.auth.$queryRaw`SELECT * FROM projects`).rejects.toThrow();
    await expect(db.auth.$queryRaw`SELECT * FROM memos`).rejects.toThrow();
  });

  it('앱 계정은 로그인 자격(비밀번호 해시) 테이블에 접근할 수 없다', async () => {
    await expect(db.app.$queryRaw`SELECT * FROM user_credentials`).rejects.toThrow();
  });

  it('공용 자료(약관 버전)는 두 계정 모두 조회만 가능하다', async () => {
    const { rows } = await db.ownerPool.query<{ grantee: string; privilege_type: string }>(
      `SELECT grantee, privilege_type FROM information_schema.role_table_grants
        WHERE table_name = 'legal_documents' AND grantee IN ('field_note_app', 'field_note_auth')
        ORDER BY grantee, privilege_type`,
    );

    expect(rows).toEqual([
      { grantee: 'field_note_app', privilege_type: 'SELECT' },
      { grantee: 'field_note_auth', privilege_type: 'SELECT' },
    ]);
  });

  it('동의 이력은 추가만 가능하다 (어느 계정도 수정·삭제 권한 없음)', async () => {
    const { rows } = await db.ownerPool.query<{ grantee: string; privilege_type: string }>(
      `SELECT grantee, privilege_type FROM information_schema.role_table_grants
        WHERE table_name = 'consents' AND grantee IN ('field_note_app', 'field_note_auth')
          AND privilege_type IN ('UPDATE', 'DELETE', 'TRUNCATE')`,
    );

    expect(rows).toEqual([]);
  });

  it('회사 범위 밖 전용 계정은 세션 테이블의 수정 권한이 없다 (생성·조회·삭제만)', async () => {
    const { rows } = await db.ownerPool.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants
        WHERE grantee = 'field_note_auth' AND table_name = 'sessions' ORDER BY privilege_type`,
    );

    expect(rows.map((row) => row.privilege_type)).toEqual(['DELETE', 'INSERT', 'SELECT']);
  });
});
