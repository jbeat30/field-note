import { seedDemoData } from '../db/seed';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { PUBLIC_DEMO } from '../demo/publicDemo';
import { createMemoryStorage } from '../storage/objectStorage';

import { deleteCompany, DeleteCompanyError } from './deleteCompany';

let db: TestDatabase;

jest.setTimeout(180_000);

beforeAll(async () => {
  db = await startTestDatabase();
  await seedDemoData(db.owner);
});

afterAll(async () => {
  await db.stop();
});

const COMPANY_NAME = '한빛판금';

// company_id 열이 있는 모든 테이블에서 회사의 남은 행 수 (새 테이블이 삭제 대상에서 빠지면 여기서 드러남)
const remainingRows = async (companyId: string): Promise<Record<string, number>> => {
  const { rows: tables } = await db.ownerPool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = 'company_id'`,
  );
  const remaining: Record<string, number> = {};

  for (const { table_name } of tables) {
    const { rows } = await db.ownerPool.query<{ count: string }>(
      `SELECT count(*) FROM "${table_name}" WHERE company_id = $1`,
      [companyId],
    );

    if (Number(rows[0]!.count) > 0) remaining[table_name] = Number(rows[0]!.count);
  }

  const { rows } = await db.ownerPool.query<{ count: string }>(
    `SELECT count(*) FROM companies WHERE id = $1`,
    [companyId],
  );

  if (Number(rows[0]!.count) > 0) remaining.companies = Number(rows[0]!.count);

  return remaining;
};

describe('회사 즉시 삭제', () => {
  it('회사 이름이 다르거나 회사가 없거나 시연 회사면 아무것도 지우지 않고 거부한다', async () => {
    const company = await db.owner.company.findFirstOrThrow({ where: { name: COMPANY_NAME } });
    const before = await remainingRows(company.id);

    await expect(
      deleteCompany(db.owner, { companyId: company.id, confirmName: '다른 이름', dryRun: false }),
    ).rejects.toBeInstanceOf(DeleteCompanyError);
    await expect(
      deleteCompany(db.owner, {
        companyId: '0198d000-0000-7000-8000-0000000000ff',
        confirmName: COMPANY_NAME,
        dryRun: false,
      }),
    ).rejects.toBeInstanceOf(DeleteCompanyError);
    await expect(
      deleteCompany(db.owner, {
        companyId: PUBLIC_DEMO.companyId,
        confirmName: PUBLIC_DEMO.companyName,
        dryRun: false,
      }),
    ).rejects.toBeInstanceOf(DeleteCompanyError);

    expect(await remainingRows(company.id)).toEqual(before);
  });

  it('미리보기는 지울 행 수만 보여 주고 데이터와 파일을 그대로 둔다', async () => {
    const company = await db.owner.company.findFirstOrThrow({ where: { name: COMPANY_NAME } });
    const memory = createMemoryStorage();
    const before = await remainingRows(company.id);

    await memory.storage.write(`company/${company.id}/files/a.png`, Buffer.from('a'), 'image/png');

    const result = await deleteCompany(db.owner, {
      companyId: company.id,
      confirmName: COMPANY_NAME,
      dryRun: true,
      storage: memory.storage,
    });

    expect(result.dryRun).toBe(true);
    expect(result.removedObjects).toBe(0);
    expect(result.deleted.projects).toBeGreaterThan(0);
    expect(result.deleted.companies).toBe(1);
    expect(await remainingRows(company.id)).toEqual(before);
    expect(await memory.storage.removePrefix(`company/${company.id}/`)).toBe(1);
  });

  it('회사의 모든 테이블 행과 업로드 파일을 지우고 다른 회사는 건드리지 않는다', async () => {
    const target = await db.owner.company.create({ data: { name: '삭제할 회사' } });
    const hanbit = await db.owner.company.findFirstOrThrow({ where: { name: COMPANY_NAME } });
    const memory = createMemoryStorage();
    const hanbitBefore = await remainingRows(hanbit.id);

    await db.owner.user.create({
      data: {
        companyId: target.id,
        displayName: '시험 관리자',
        email: 'delete-target@example.com',
        status: 'ACTIVE',
      },
    });
    await db.owner.operatorAction.create({
      data: { companyId: target.id, action: 'COMPANY_CREATED', operator: 'tester' },
    });
    await memory.storage.write(`company/${target.id}/files/a.png`, Buffer.from('a'), 'image/png');
    await memory.storage.write(`company/${hanbit.id}/files/b.png`, Buffer.from('b'), 'image/png');

    const result = await deleteCompany(db.owner, {
      companyId: target.id,
      confirmName: '삭제할 회사',
      dryRun: false,
      storage: memory.storage,
    });

    expect(result).toMatchObject({ companyName: '삭제할 회사', removedObjects: 1 });
    expect(result.deleted).toMatchObject({ users: 1, operator_actions: 1, companies: 1 });
    expect(await remainingRows(target.id)).toEqual({});
    expect(await remainingRows(hanbit.id)).toEqual(hanbitBefore);
    expect(await memory.storage.removePrefix(`company/${hanbit.id}/`)).toBe(1);
  });

  it('업무 데이터가 쌓인 샘플 회사도 한 번에 모두 지워진다', async () => {
    const company = await db.owner.company.findFirstOrThrow({ where: { name: COMPANY_NAME } });

    await deleteCompany(db.owner, {
      companyId: company.id,
      confirmName: COMPANY_NAME,
      dryRun: false,
    });

    expect(await remainingRows(company.id)).toEqual({});
  });
});
