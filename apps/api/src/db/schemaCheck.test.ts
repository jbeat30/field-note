import { PURGE_POLICY } from '../closure/purgePolicy';

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

  it('운영자 계정은 업무 테이블·세션·비밀번호에 접근할 수 없다', async () => {
    await expect(db.operator.$queryRaw`SELECT * FROM projects`).rejects.toThrow();
    await expect(db.operator.$queryRaw`SELECT * FROM memos`).rejects.toThrow();
    await expect(db.operator.$queryRaw`SELECT * FROM sessions`).rejects.toThrow();
    await expect(db.operator.$queryRaw`SELECT * FROM user_credentials`).rejects.toThrow();
    await expect(db.operator.$queryRaw`SELECT * FROM consents`).rejects.toThrow();
  });

  it('운영자 작업 기록은 추가만 가능하다 (수정·삭제 권한 없음)', async () => {
    const { rows } = await db.ownerPool.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants
        WHERE table_name = 'operator_actions' AND grantee = 'field_note_operator' ORDER BY privilege_type`,
    );

    expect(rows.map((row) => row.privilege_type)).toEqual(['INSERT', 'SELECT']);
  });

  it('앱 계정과 전용 계정은 운영자 작업 기록에 접근할 수 없다', async () => {
    await expect(db.app.$queryRaw`SELECT * FROM operator_actions`).rejects.toThrow();
    await expect(db.auth.$queryRaw`SELECT * FROM operator_actions`).rejects.toThrow();
  });

  it('초대 테이블은 앱 계정이 접근할 수 없고 삭제 권한은 아무도 없다', async () => {
    await expect(db.app.$queryRaw`SELECT * FROM invitations`).rejects.toThrow();

    const { rows } = await db.ownerPool.query(
      `SELECT grantee FROM information_schema.role_table_grants
        WHERE table_name = 'invitations' AND privilege_type = 'DELETE'
          AND grantee IN ('field_note_app', 'field_note_auth', 'field_note_operator')`,
    );

    expect(rows).toEqual([]);
  });

  it('인증 코드·재설정 링크 테이블은 전용 계정만 접근하고 삭제 권한은 아무도 없다', async () => {
    for (const table of ['email_verifications', 'password_resets']) {
      await expect(db.app.$queryRawUnsafe(`SELECT * FROM ${table}`)).rejects.toThrow();
      await expect(db.operator.$queryRawUnsafe(`SELECT * FROM ${table}`)).rejects.toThrow();
    }

    const { rows } = await db.ownerPool.query(
      `SELECT grantee FROM information_schema.role_table_grants
        WHERE table_name IN ('email_verifications', 'password_resets') AND privilege_type = 'DELETE'
          AND grantee IN ('field_note_app', 'field_note_auth', 'field_note_operator', 'field_note_queue')`,
    );

    expect(rows).toEqual([]);
  });

  it('소셜 연동 테이블은 전용 계정만 접근하고, 앱·운영자·큐 계정은 읽을 수 없다', async () => {
    await expect(db.app.$queryRaw`SELECT * FROM social_accounts`).rejects.toThrow();
    await expect(db.operator.$queryRaw`SELECT * FROM social_accounts`).rejects.toThrow();

    const { rows } = await db.ownerPool.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants
        WHERE table_name = 'social_accounts' AND grantee = 'field_note_auth' ORDER BY privilege_type`,
    );

    // 연동 해제를 위한 삭제만 허용, 수정 권한은 없음 (소셜 계정을 다른 계정으로 옮길 수 없음)
    expect(rows.map((row) => row.privilege_type)).toEqual(['DELETE', 'INSERT', 'SELECT']);
  });
  it('모든 회사 범위 테이블은 해지 삭제 정책(PURGE_POLICY)에 등록되어 있다', async () => {
    const { rows } = await db.ownerPool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          AND table_name <> ALL($1)`,
      [[...GLOBAL_TABLES, ...MIGRATION_TABLES]],
    );

    expect(rows.map((row) => row.table_name).sort()).toEqual(Object.keys(PURGE_POLICY).sort());
  });

  it('삭제 전용 계정은 삭제·익명화 대상 정책에 맞는 권한만 가진다', async () => {
    const { rows } = await db.ownerPool.query<{ table_name: string; privilege_type: string }>(
      `SELECT table_name, privilege_type FROM information_schema.table_privileges
        WHERE grantee = 'field_note_purge' AND table_schema = 'public'`,
    );
    const granted = (table: string) =>
      rows
        .filter((row) => row.table_name === table)
        .map((row) => row.privilege_type)
        .sort();

    for (const [table, policy] of Object.entries(PURGE_POLICY)) {
      if (policy === 'DELETE') {
        expect(granted(table)).toEqual(['DELETE', 'SELECT']);
      }
    }

    // KEEP 대상(동의 이력·운영자 작업 기록)은 접근 불가, 해지 기록은 조회와 삭제 완료 시각 갱신만
    expect(granted('consents')).toEqual([]);
    expect(granted('operator_actions')).toEqual([]);
    expect(granted('legal_documents')).toEqual([]);
    // 회사·계정·해지 기록은 조회만 테이블 단위로 허용하고, 수정은 아래 컬럼으로만 한정
    expect(granted('company_closures')).toEqual(['SELECT']);
    expect(granted('users')).toEqual(['SELECT']);
    expect(granted('companies')).toEqual(['SELECT']);

    const { rows: columns } = await db.ownerPool.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.column_privileges
        WHERE grantee = 'field_note_purge' AND privilege_type = 'UPDATE' AND table_schema = 'public'
        ORDER BY table_name, column_name`,
    );

    expect(columns.map((row) => `${row.table_name}.${row.column_name}`)).toEqual([
      'companies.name',
      'companies.status',
      'company_closures.purged_at',
      'company_closures.updated_at',
      'users.age_confirmed_at',
      'users.display_name',
      'users.email',
      'users.email_verified_at',
      'users.phone',
      'users.updated_at',
    ]);
  });

  it('삭제 전용 계정은 해지 중이 아닌 회사의 행을 읽을 수 없다', async () => {
    await db.ownerPool.query(`INSERT INTO companies (name, status) VALUES ('활성 회사', 'ACTIVE')`);

    const rows = await db.purge.$queryRaw<
      { name: string }[]
    >`SELECT name FROM companies WHERE status = 'ACTIVE'`;

    expect(rows).toEqual([]);
  });
});
