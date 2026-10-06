import { DEFAULT_COMPANY_SETTINGS } from '@field-note/shared';

import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { withCompany } from '../db/withCompany';

import { createCompanySettingsService } from './companySettingsService';

let db: TestDatabase;

const COMPANY_A = '0198e100-0000-7000-8000-00000000000a';
const COMPANY_B = '0198e100-0000-7000-8000-00000000000b';

jest.setTimeout(180_000);

beforeAll(async () => {
  db = await startTestDatabase();
  await db.ownerPool.query(
    `INSERT INTO companies (id, name) VALUES ($1, '회사 A'), ($2, '회사 B')`,
    [COMPANY_A, COMPANY_B],
  );
});

afterAll(async () => {
  await db.stop();
});

const service = () => createCompanySettingsService(db.app);

describe('회사 설정', () => {
  it('저장한 적이 없으면 기본값(8시간·22일·비율)을 돌려준다', async () => {
    expect(await service().get(COMPANY_A)).toEqual(DEFAULT_COMPANY_SETTINGS);
    expect(DEFAULT_COMPANY_SETTINGS).toEqual({
      standardWorkMinutes: 480,
      monthlyWorkDays: 22,
      workUnitMode: 'RATIO',
    });
  });

  it('저장하면 다시 조회할 때 같은 값이고, 한 번 더 저장하면 갱신된다', async () => {
    const first = { standardWorkMinutes: 450, monthlyWorkDays: 24, workUnitMode: 'HOURS' as const };

    expect(await service().save(COMPANY_A, first)).toEqual(first);
    expect(await service().get(COMPANY_A)).toEqual(first);

    const second = {
      standardWorkMinutes: 540,
      monthlyWorkDays: 26,
      workUnitMode: 'RATIO' as const,
    };

    await service().save(COMPANY_A, second);

    expect(await service().get(COMPANY_A)).toEqual(second);
    expect(await db.owner.companySettings.count({ where: { companyId: COMPANY_A } })).toBe(1);
  });

  it('한 회사의 설정은 다른 회사에 영향을 주지 않는다', async () => {
    await service().save(COMPANY_A, {
      standardWorkMinutes: 420,
      monthlyWorkDays: 20,
      workUnitMode: 'HOURS',
    });

    expect(await service().get(COMPANY_B)).toEqual(DEFAULT_COMPANY_SETTINGS);
  });

  it('회사 범위에서는 다른 회사의 설정 행이 보이지 않는다', async () => {
    await service().save(COMPANY_B, {
      standardWorkMinutes: 600,
      monthlyWorkDays: 30,
      workUnitMode: 'RATIO',
    });

    const visible = await withCompany(db.app, COMPANY_A, (tx) => tx.companySettings.findMany());

    expect(visible.map((row) => row.companyId)).toEqual([COMPANY_A]);
    expect(await db.app.companySettings.findMany()).toEqual([]);
  });

  it('다른 회사의 설정을 만들거나 고칠 수 없다 (회사 범위 검사)', async () => {
    await expect(
      withCompany(db.app, COMPANY_A, (tx) =>
        tx.companySettings.create({
          data: { companyId: COMPANY_B, standardWorkMinutes: 480, monthlyWorkDays: 22 },
        }),
      ),
    ).rejects.toThrow();

    const result = await withCompany(db.app, COMPANY_A, (tx) =>
      tx.companySettings.updateMany({
        where: { companyId: COMPANY_B },
        data: { monthlyWorkDays: 1 },
      }),
    );

    expect(result.count).toBe(0);
  });

  it('범위를 벗어난 값은 DB도 거부한다 (API 검증을 우회해도 저장되지 않음)', async () => {
    await expect(
      service().save(COMPANY_A, {
        standardWorkMinutes: 30,
        monthlyWorkDays: 22,
        workUnitMode: 'RATIO',
      }),
    ).rejects.toThrow();
    await expect(
      service().save(COMPANY_A, {
        standardWorkMinutes: 480,
        monthlyWorkDays: 40,
        workUnitMode: 'RATIO',
      }),
    ).rejects.toThrow();
  });

  it('앱 계정은 설정 행을 삭제할 수 없다', async () => {
    await expect(
      withCompany(db.app, COMPANY_A, (tx) => tx.companySettings.deleteMany()),
    ).rejects.toThrow();
  });
});
