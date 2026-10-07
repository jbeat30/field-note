import {
  DEMO_ACCOUNTS,
  DEMO_EMPLOYEES,
  DEMO_INVITATION,
  DEMO_PARTNERS,
  DEMO_PROJECTS,
} from '@field-note/shared/demo';

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

  it('더미 직원을 회사별로 넣고, 선택 목록 항목과 연결하며, 다시 실행해도 늘지 않는다', async () => {
    await seedDemoData(db.owner);

    const count = (companyId: string) =>
      DEMO_EMPLOYEES.filter((item) => item.companyId === companyId).length;

    expect(await db.owner.employee.count({ where: { companyId: hanbit.companyId } })).toBe(
      count(hanbit.companyId),
    );
    expect(await db.owner.employee.count({ where: { companyId: saeron.companyId } })).toBe(
      count(saeron.companyId),
    );

    const welder = await db.owner.employee.findFirstOrThrow({
      where: { companyId: hanbit.companyId, name: '한용접' },
      include: { jobType: true, workerType: true },
    });

    expect(welder.jobType?.name).toBe('용접공');
    expect(welder.workerType?.name).toBe('계약직');
    expect(welder.companyId).toBe(welder.jobType?.companyId);

    // 앱 계정은 자기 회사 직원만 본다
    const visible = await withCompany(db.app, saeron.companyId, (tx) => tx.employee.findMany());

    expect(visible).toHaveLength(count(saeron.companyId));
    expect(visible.every((item) => item.companyId === saeron.companyId)).toBe(true);
  });

  it('시드 직원에는 주민등록번호·계좌 같은 항목이 없고 연락처는 가상 번호다', async () => {
    const phones = (await db.owner.employee.findMany({ select: { phone: true } })).flatMap(
      (item) => (item.phone ? [item.phone] : []),
    );

    expect(phones.length).toBeGreaterThan(0);
    expect(phones.every((phone) => /^010-0000-\d{4}$/.test(phone))).toBe(true);
  });

  it('더미 명부를 회사별로 넣고 다시 실행해도 늘지 않으며 앱 계정은 자기 회사 것만 본다', async () => {
    await seedDemoData(db.owner);

    const count = (companyId: string) =>
      DEMO_PARTNERS.filter((item) => item.companyId === companyId).length;

    expect(await db.owner.partner.count({ where: { companyId: hanbit.companyId } })).toBe(
      count(hanbit.companyId),
    );
    expect(await db.owner.partner.count({ where: { companyId: saeron.companyId } })).toBe(
      count(saeron.companyId),
    );
    // 숨긴 업체도 시드에 있어 화면에서 숨김 표시를 확인할 수 있음
    expect(
      await db.owner.partner.count({ where: { companyId: hanbit.companyId, isActive: false } }),
    ).toBe(1);

    const visible = await withCompany(db.app, saeron.companyId, (tx) => tx.partner.findMany());

    expect(visible).toHaveLength(count(saeron.companyId));
    expect(visible.every((item) => item.companyId === saeron.companyId)).toBe(true);
  });

  it('더미 프로젝트를 고객·담당자·공종과 연결해 넣고 코드 번호표가 이어서 붙게 맞춘다', async () => {
    await seedDemoData(db.owner);

    const count = (companyId: string) =>
      DEMO_PROJECTS.filter((item) => item.companyId === companyId).length;

    expect(await db.owner.project.count({ where: { companyId: hanbit.companyId } })).toBe(
      count(hanbit.companyId),
    );
    expect(await db.owner.project.count({ where: { companyId: saeron.companyId } })).toBe(
      count(saeron.companyId),
    );

    const duct = await db.owner.project.findFirstOrThrow({
      where: { companyId: hanbit.companyId, code: '2026-003' },
      include: { client: true, manager: true, trades: { include: { trade: true } } },
    });

    expect(duct.status).toBe('SUSPENDED');
    expect(duct.client.name).toBe('가나다건설');
    expect(duct.manager.name).toBe('최설치');
    expect(duct.trades.map((item) => item.trade.name).sort()).toEqual(['설비', '판금']);

    // 번호표: 한빛판금 2026년은 4번까지, 2025년은 12번까지 썼으므로 다음 번호는 5번·13번
    const sequences = await db.owner.projectCodeSequence.findMany({
      where: { companyId: hanbit.companyId },
      orderBy: { year: 'asc' },
    });

    expect(sequences.map((item) => [item.year, item.lastNumber])).toEqual([
      [2025, 12],
      [2026, 4],
    ]);

    const visible = await withCompany(db.app, saeron.companyId, (tx) => tx.project.findMany());

    expect(visible).toHaveLength(count(saeron.companyId));
  });

  it('더미 프로젝트의 실제 시작·완료일과 상태 변경 이력을 넣고 다시 실행해도 이력이 늘지 않는다', async () => {
    await seedDemoData(db.owner);

    const history = (code: string) =>
      db.owner.projectStatusChange.findMany({
        where: { companyId: hanbit.companyId, project: { code } },
        orderBy: { effectiveOn: 'asc' },
      });
    const duct = await db.owner.project.findFirstOrThrow({
      where: { companyId: hanbit.companyId, code: '2026-003' },
    });
    const completed = await db.owner.project.findFirstOrThrow({
      where: { companyId: hanbit.companyId, code: '2026-004' },
    });
    const planned = await db.owner.project.findFirstOrThrow({
      where: { companyId: hanbit.companyId, code: '2026-002' },
    });
    const before = (await history('2026-003')).length;

    expect(duct.actualStart?.toISOString().slice(0, 10)).toBe('2026-06-01');
    expect(duct.actualEnd).toBeNull();
    expect(completed.actualEnd?.toISOString().slice(0, 10)).toBe('2026-03-12');
    expect(planned.actualStart).toBeNull();
    expect((await history('2026-003')).at(-1)).toMatchObject({
      toStatus: 'SUSPENDED',
      reason: '철골 자재 납품 지연으로 중단',
    });
    expect(await history('2026-002')).toHaveLength(0);

    await seedDemoData(db.owner);

    expect(await history('2026-003')).toHaveLength(before);
    // 변경자는 같은 회사의 관리자
    expect((await history('2026-003')).every((item) => item.changedBy === hanbit.userId)).toBe(
      true,
    );
  });
});
