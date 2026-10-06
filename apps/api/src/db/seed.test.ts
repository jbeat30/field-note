import { DEMO_ACCOUNTS, DEMO_INVITATION } from '@field-note/shared/demo';

import { verifyPassword } from '../auth/password';
import { createPrismaInvitationStore } from '../invitation/invitationStore';

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
    expect(await db.owner.company.count()).toBe(4);
    expect(await db.owner.user.count()).toBe(4);
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
    const users = await db.owner.user.findMany({
      where: { companyId: { not: DEMO_INVITATION.companyId } },
    });
    const byName = Object.fromEntries(users.map((user) => [user.displayName, user]));

    expect(byName[newbie.displayName]?.status).toBe('INVITED');
    expect(byName[newbie.displayName]?.emailVerifiedAt).toBeNull();
    expect(byName[hanbit.displayName]?.status).toBe('ACTIVE');
    expect(byName[hanbit.displayName]?.emailVerifiedAt).not.toBeNull();
  });

  it('회사 설정이 시드되고 다시 실행해도 바꾼 값을 되돌리지 않는다', async () => {
    const before = await db.owner.companySettings.findUnique({
      where: { companyId: saeron.companyId },
    });

    expect(before).toMatchObject({
      standardWorkMinutes: 540,
      monthlyWorkDays: 26,
      workUnitMode: 'HOURS',
    });

    await db.owner.companySettings.update({
      where: { companyId: saeron.companyId },
      data: { monthlyWorkDays: 20 },
    });
    await seedDemoData(db.owner);

    expect(
      (await db.owner.companySettings.findUnique({ where: { companyId: saeron.companyId } }))
        ?.monthlyWorkDays,
    ).toBe(20);
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

  it('데모 초대 링크는 해시로만 저장되고 한 번만 사용할 수 있다', async () => {
    const stored = await db.owner.invitation.findMany();

    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).not.toContain(DEMO_INVITATION.token);

    const store = createPrismaInvitationStore(db.auth);

    expect((await store.find(DEMO_INVITATION.token))?.companyName).toBe(
      DEMO_INVITATION.companyName,
    );
    expect(await store.consume(DEMO_INVITATION.token)).not.toBeNull();
    expect(await store.consume(DEMO_INVITATION.token)).toBeNull();

    // 시드를 다시 실행해도 사용한 링크는 되살아나지 않음
    await seedDemoData(db.owner);

    expect(await store.find(DEMO_INVITATION.token)).toBeNull();
  });
});
