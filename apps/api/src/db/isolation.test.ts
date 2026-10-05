import { startTestDatabase, type TestDatabase } from './testDatabase';
import { withCompany } from './withCompany';

let db: TestDatabase;
let companyA: string;
let companyB: string;
let projectA: string;
let projectB: string;

// 컨테이너 기동·마이그레이션 시간 포함
jest.setTimeout(120_000);

beforeAll(async () => {
  db = await startTestDatabase();

  // 소유 계정은 회사 생성 권한이 있는 운영 경로 역할 (앱 계정은 회사를 만들 수 없음)
  companyA = (await db.owner.company.create({ data: { name: '회사 A' } })).id;
  companyB = (await db.owner.company.create({ data: { name: '회사 B' } })).id;
  projectA = (await db.owner.project.create({ data: { companyId: companyA, name: 'A 현장' } })).id;
  projectB = (await db.owner.project.create({ data: { companyId: companyB, name: 'B 현장' } })).id;
  await db.owner.memo.create({
    data: { companyId: companyA, projectId: projectA, content: 'A 메모' },
  });
  await db.owner.memo.create({
    data: { companyId: companyB, projectId: projectB, content: 'B 메모' },
  });
});

afterAll(async () => {
  await db.stop();
});

describe('회사 격리 (RLS)', () => {
  it('회사 A는 자기 프로젝트만 조회한다', async () => {
    const projects = await withCompany(db.app, companyA, (tx) => tx.project.findMany());

    expect(projects.map((project) => project.name)).toEqual(['A 현장']);
  });

  it('회사 B의 행을 ID로 직접 조회해도 존재하지 않는 것처럼 보인다', async () => {
    const found = await withCompany(db.app, companyA, (tx) =>
      tx.project.findFirst({ where: { id: projectB } }),
    );

    expect(found).toBeNull();
  });

  it('회사 조회도 자기 회사만 보인다', async () => {
    const companies = await withCompany(db.app, companyA, (tx) => tx.company.findMany());

    expect(companies.map((company) => company.id)).toEqual([companyA]);
  });

  it('회사 A는 회사 B 소속 행을 만들 수 없다', async () => {
    await expect(
      withCompany(db.app, companyA, (tx) =>
        tx.project.create({ data: { companyId: companyB, name: '침투' } }),
      ),
    ).rejects.toThrow();
  });

  it('회사 A는 회사 B의 행을 수정할 수 없다', async () => {
    const result = await withCompany(db.app, companyA, (tx) =>
      tx.project.updateMany({ where: { id: projectB }, data: { name: '변조' } }),
    );
    const untouched = await db.owner.project.findFirst({ where: { id: projectB } });

    expect(result.count).toBe(0);
    expect(untouched?.name).toBe('B 현장');
  });

  it('앱 계정은 행을 삭제할 수 없다', async () => {
    await expect(
      withCompany(db.app, companyA, (tx) => tx.project.deleteMany({ where: { id: projectA } })),
    ).rejects.toThrow();
  });

  it('withCompany 밖에서는 아무 행도 보이지 않는다', async () => {
    expect(await db.app.project.findMany()).toEqual([]);
    expect(await db.app.memo.count()).toBe(0);
  });

  it('트랜잭션이 끝나면 회사 설정이 남지 않는다', async () => {
    await withCompany(db.app, companyA, (tx) => tx.project.findMany());

    expect(await db.app.project.findMany()).toEqual([]);
  });

  it('회사 ID 형식이 올바르지 않으면 쿼리 전에 거부한다', () => {
    expect(() => withCompany(db.app, "x'; DROP TABLE projects;--", async () => null)).toThrow(
      '회사 ID 형식 오류',
    );
  });

  it('다른 회사 프로젝트에 메모를 연결할 수 없다 (복합 외래 키)', async () => {
    await expect(
      db.owner.memo.create({ data: { companyId: companyA, projectId: projectB, content: '교차' } }),
    ).rejects.toThrow();
  });

  it('앱 계정은 RLS를 우회할 수 있는 권한이 없다', async () => {
    const { rows } = await db.ownerPool.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
      "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'field_note_app'",
    );

    expect(rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
  });
});
