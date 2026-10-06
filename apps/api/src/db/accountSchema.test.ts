import { startTestDatabase, type TestDatabase } from './testDatabase';
import { withCompany } from './withCompany';

const COMPANY_A = '0198b000-0000-7000-8000-00000000000a';
const COMPANY_B = '0198b000-0000-7000-8000-00000000000b';
const USER_A = '0198b000-0000-7000-8000-0000000000a1';
const USER_B = '0198b000-0000-7000-8000-0000000000b1';
const DOC_TERMS = '0198b000-0000-7000-8000-0000000000d1';

let db: TestDatabase;

jest.setTimeout(120_000);

beforeAll(async () => {
  db = await startTestDatabase();

  await db.ownerPool.query(
    `INSERT INTO companies (id, name) VALUES ($1, '회사 A'), ($2, '회사 B')`,
    [COMPANY_A, COMPANY_B],
  );
  await db.ownerPool.query(
    `INSERT INTO users (id, company_id, display_name, email) VALUES ($1, $2, '관리자 A', 'a@example.com'), ($3, $4, '관리자 B', 'b@example.com')`,
    [USER_A, COMPANY_A, USER_B, COMPANY_B],
  );
  await db.ownerPool.query(
    `INSERT INTO user_credentials (company_id, user_id, login_id, password_hash) VALUES ($1, $2, 'admin-a', 'hash-a'), ($3, $4, 'admin-b', 'hash-b')`,
    [COMPANY_A, USER_A, COMPANY_B, USER_B],
  );
  await db.ownerPool.query(
    `INSERT INTO legal_documents (id, type, version, effective_at, content_hash, is_required)
     VALUES ($1, 'TERMS_OF_SERVICE', '2026-10-01', now(), 'hash-terms', true)`,
    [DOC_TERMS],
  );
  await db.ownerPool.query(
    `INSERT INTO consents (company_id, user_id, document_id) VALUES ($1, $2, $5), ($3, $4, $5)`,
    [COMPANY_A, USER_A, COMPANY_B, USER_B, DOC_TERMS],
  );
});

afterAll(async () => {
  await db.stop();
});

describe('계정·동의 격리', () => {
  it('앱 계정은 자기 회사 계정만 조회한다', async () => {
    const users = await withCompany(db.app, COMPANY_A, (tx) => tx.user.findMany());

    expect(users.map((user) => user.displayName)).toEqual(['관리자 A']);
  });

  it('앱 계정은 다른 회사 계정을 이메일로 찾을 수 없다', async () => {
    const found = await withCompany(db.app, COMPANY_A, (tx) =>
      tx.user.findFirst({ where: { email: 'b@example.com' } }),
    );

    expect(found).toBeNull();
  });

  it('회사 범위 없이는 계정이 하나도 보이지 않는다', async () => {
    expect(await db.app.user.findMany()).toEqual([]);
    expect(await db.app.consent.findMany()).toEqual([]);
  });

  it('앱 계정은 자기 회사 동의 이력만 조회하고 약관 버전은 모두 볼 수 있다', async () => {
    const result = await withCompany(db.app, COMPANY_A, async (tx) => ({
      consents: await tx.consent.findMany(),
      documents: await tx.legalDocument.findMany(),
    }));

    expect(result.consents).toHaveLength(1);
    expect(result.consents[0]?.userId).toBe(USER_A);
    expect(result.documents).toHaveLength(1);
  });

  it('앱 계정은 동의 이력을 쓰거나 계정을 수정할 수 없다', async () => {
    await expect(
      withCompany(db.app, COMPANY_A, (tx) =>
        tx.consent.create({
          data: { companyId: COMPANY_A, userId: USER_A, documentId: DOC_TERMS },
        }),
      ),
    ).rejects.toThrow();
    await expect(
      withCompany(db.app, COMPANY_A, (tx) => tx.user.updateMany({ data: { displayName: '변조' } })),
    ).rejects.toThrow();
  });

  it('전용 계정은 로그인 아이디로 자격을 찾고 회사 ID를 얻는다', async () => {
    const credential = await db.auth.userCredential.findUnique({ where: { loginId: 'admin-b' } });

    expect(credential?.companyId).toBe(COMPANY_B);
    expect(credential?.passwordHash).toBe('hash-b');
  });

  it('전용 계정은 동의 이력을 추가할 수 있지만 수정·삭제할 수 없다', async () => {
    await db.auth.consent.create({
      data: { companyId: COMPANY_A, userId: USER_A, documentId: DOC_TERMS, isAgreed: false },
    });

    await expect(db.auth.consent.updateMany({ data: { isAgreed: true } })).rejects.toThrow();
    await expect(db.auth.consent.deleteMany()).rejects.toThrow();
  });
});

describe('계정 제약', () => {
  it('한 회사에 계정을 둘 만들 수 없다', async () => {
    await expect(
      db.ownerPool.query(
        `INSERT INTO users (company_id, display_name) VALUES ($1, '두 번째 관리자')`,
        [COMPANY_A],
      ),
    ).rejects.toThrow(/users_company_id_key/);
  });

  it('로그인 아이디와 이메일은 서비스 전체에서 유일하다', async () => {
    await expect(
      db.ownerPool.query(`UPDATE user_credentials SET login_id = 'admin-a' WHERE company_id = $1`, [
        COMPANY_B,
      ]),
    ).rejects.toThrow(/login_id_key/);
    await expect(
      db.ownerPool.query(`UPDATE users SET email = 'a@example.com' WHERE company_id = $1`, [
        COMPANY_B,
      ]),
    ).rejects.toThrow(/users_email_key/);
  });

  it('로그인 아이디와 이메일은 소문자만 저장할 수 있다', async () => {
    await expect(
      db.ownerPool.query(`UPDATE user_credentials SET login_id = 'Admin-A' WHERE company_id = $1`, [
        COMPANY_A,
      ]),
    ).rejects.toThrow(/lowercase/);
    await expect(
      db.ownerPool.query(`UPDATE users SET email = 'A@Example.com' WHERE company_id = $1`, [
        COMPANY_A,
      ]),
    ).rejects.toThrow(/lowercase/);
  });

  it('소셜 로그인만 쓰는 계정은 아이디 없이도 자격 행을 가질 수 있다', async () => {
    const { rows } = await db.ownerPool.query(
      `SELECT count(*)::int AS count FROM user_credentials WHERE login_id IS NULL`,
    );

    expect(rows[0].count).toBe(0);
    await expect(
      db.ownerPool.query(
        `UPDATE user_credentials SET login_id = NULL, password_hash = NULL WHERE company_id = $1`,
        [COMPANY_A],
      ),
    ).resolves.toBeDefined();
  });

  it('약관 문서는 종류와 버전 조합이 유일하다', async () => {
    await expect(
      db.ownerPool.query(
        `INSERT INTO legal_documents (type, version, effective_at, content_hash, is_required)
         VALUES ('TERMS_OF_SERVICE', '2026-10-01', now(), 'other', true)`,
      ),
    ).rejects.toThrow(/legal_documents_type_version_key/);
  });

  it('다른 회사 계정으로 세션이나 동의 이력을 만들 수 없다 (복합 외래 키)', async () => {
    await expect(
      db.ownerPool.query(
        `INSERT INTO sessions (token_hash, user_id, company_id, expires_at) VALUES ('h', $1, $2, now() + interval '1 day')`,
        [USER_B, COMPANY_A],
      ),
    ).rejects.toThrow(/sessions_company_id_user_id_fkey/);
    await expect(
      db.ownerPool.query(
        `INSERT INTO consents (company_id, user_id, document_id) VALUES ($1, $2, $3)`,
        [COMPANY_A, USER_B, DOC_TERMS],
      ),
    ).rejects.toThrow(/consents_company_id_user_id_fkey/);
  });

  it('회사 상태 기본값은 활성이다', async () => {
    const company = await db.owner.company.findUnique({ where: { id: COMPANY_A } });

    expect(company?.status).toBe('ACTIVE');
  });
});
