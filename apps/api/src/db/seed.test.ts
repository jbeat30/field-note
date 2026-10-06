import { DEMO_ACCOUNTS } from '@field-note/shared/demo';

import { verifyPassword } from '../auth/password';

import { startTestDatabase, type TestDatabase } from './testDatabase';
import { seedDemoData } from './seed';
import { withCompany } from './withCompany';

let db: TestDatabase;

jest.setTimeout(180_000);

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await db.stop();
});

const hanbit = DEMO_ACCOUNTS[0]!;
const saeron = DEMO_ACCOUNTS[1]!;
const newbie = DEMO_ACCOUNTS[2]!;

describe('seedDemoData', () => {
  it('여러 번 실행해도 같은 결과다 (비밀번호 해시도 바뀌지 않음)', async () => {
    const first = await seedDemoData(db.owner);
    const hashBefore = (await db.owner.userCredential.findUnique({ where: { loginId: 'hanbit' } }))
      ?.passwordHash;
    const second = await seedDemoData(db.owner);
    const hashAfter = (await db.owner.userCredential.findUnique({ where: { loginId: 'hanbit' } }))
      ?.passwordHash;

    expect(second).toEqual(first);
    expect(await db.owner.company.count()).toBe(3);
    expect(await db.owner.user.count()).toBe(3);
    expect(await db.owner.legalDocument.count()).toBe(3);
    expect(hashAfter).toBe(hashBefore);
  });

  it('데모 비밀번호는 argon2 해시로만 저장된다', async () => {
    const credential = await db.auth.userCredential.findUnique({ where: { loginId: 'saeron' } });

    expect(credential?.passwordHash).not.toContain(saeron.password);
    expect(await verifyPassword(credential!.passwordHash!, saeron.password)).toBe(true);
    expect(await verifyPassword(credential!.passwordHash!, hanbit.password)).toBe(false);
  });

  it('이메일 인증 전 계정은 초대 상태이고 인증한 계정은 활성이다', async () => {
    const users = await db.owner.user.findMany({ orderBy: { createdAt: 'asc' } });
    const byName = Object.fromEntries(users.map((user) => [user.displayName, user]));

    expect(byName[newbie.displayName]?.status).toBe('INVITED');
    expect(byName[newbie.displayName]?.emailVerifiedAt).toBeNull();
    expect(byName[hanbit.displayName]?.status).toBe('ACTIVE');
    expect(byName[hanbit.displayName]?.emailVerifiedAt).not.toBeNull();
  });

  it('필수 약관 동의 이력이 계정마다 한 번씩만 남는다', async () => {
    const consents = await db.owner.consent.findMany({ where: { companyId: hanbit.companyId } });

    expect(consents).toHaveLength(2);
    expect(consents.every((consent) => consent.isAgreed)).toBe(true);
  });

  it('시드로 만든 두 회사도 서로의 데이터가 보이지 않는다', async () => {
    const users = await withCompany(db.app, hanbit.companyId, (tx) => tx.user.findMany());
    const consents = await withCompany(db.app, saeron.companyId, (tx) => tx.consent.findMany());

    expect(users.map((user) => user.displayName)).toEqual([hanbit.displayName]);
    expect(consents.every((consent) => consent.companyId === saeron.companyId)).toBe(true);
  });
});
