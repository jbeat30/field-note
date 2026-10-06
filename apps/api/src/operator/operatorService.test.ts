import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createPrismaInvitationStore } from '../invitation/invitationStore';

import {
  buildInvitationLink,
  createCompanyWithInvitation,
  InvitationReissueError,
  listCompanies,
  reissueInvitation,
} from './operatorService';

let db: TestDatabase;

jest.setTimeout(180_000);

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await db.stop();
});

describe('운영자 초대 발급', () => {
  it('회사와 가입 전 관리자 계정, 초대 링크, 작업 기록을 함께 만든다', async () => {
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '테스트설비',
      adminName: '홍관리',
      operator: 'operator-a',
    });

    const company = await db.owner.company.findUnique({ where: { id: invitation.companyId } });
    const user = await db.owner.user.findFirst({ where: { companyId: invitation.companyId } });
    const actions = await db.owner.operatorAction.findMany({
      where: { companyId: invitation.companyId },
    });

    expect(company?.status).toBe('ACTIVE');
    expect(user).toMatchObject({ displayName: '홍관리', status: 'INVITED', email: null });
    expect(actions.map((action) => action.action).sort()).toEqual([
      'COMPANY_CREATED',
      'INVITATION_ISSUED',
    ]);
    expect(actions.every((action) => action.operator === 'operator-a')).toBe(true);
  });

  it('토큰 원문은 저장하지 않고 링크로만 전달한다', async () => {
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '해시설비',
      adminName: '김해시',
      operator: 'operator-a',
    });
    const stored = await db.owner.invitation.findMany({
      where: { companyId: invitation.companyId },
    });

    expect(stored).toHaveLength(1);
    expect(JSON.stringify(stored)).not.toContain(invitation.token);
    expect(buildInvitationLink('http://localhost:5173/', invitation.token)).toBe(
      `http://localhost:5173/invite/${invitation.token}`,
    );
  });

  it('발급한 링크는 확인되고 한 번 사용하면 폐기된다', async () => {
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '일회설비',
      adminName: '박일회',
      operator: 'operator-a',
    });
    const store = createPrismaInvitationStore(db.auth);

    expect(await store.find(invitation.token)).toMatchObject({
      companyName: '일회설비',
      adminName: '박일회',
    });
    expect(await store.consume(invitation.token)).toEqual({
      companyId: invitation.companyId,
      userId: invitation.userId,
    });
    expect(await store.consume(invitation.token)).toBeNull();
    expect(await store.find(invitation.token)).toBeNull();
  });

  it('동시에 두 번 사용해도 한 번만 성공한다', async () => {
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '동시설비',
      adminName: '이동시',
      operator: 'operator-a',
    });
    const store = createPrismaInvitationStore(db.auth);
    const results = await Promise.all([
      store.consume(invitation.token),
      store.consume(invitation.token),
    ]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
  });

  it('유효기간이 지난 링크는 사용할 수 없다', async () => {
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '만료설비',
      adminName: '최만료',
      operator: 'operator-a',
      days: 1,
    });
    const dayAfter = createPrismaInvitationStore(
      db.auth,
      () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    );

    expect(await dayAfter.find(invitation.token)).toBeNull();
    expect(await dayAfter.consume(invitation.token)).toBeNull();
  });

  it('정지된 회사의 링크는 사용할 수 없다', async () => {
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '정지설비',
      adminName: '정정지',
      operator: 'operator-a',
    });

    await db.owner.company.update({
      where: { id: invitation.companyId },
      data: { status: 'SUSPENDED' },
    });

    expect(await createPrismaInvitationStore(db.auth).find(invitation.token)).toBeNull();
  });

  it('알 수 없는 토큰은 없는 링크와 같이 처리한다', async () => {
    expect(await createPrismaInvitationStore(db.auth).find('unknown-token-0000')).toBeNull();
  });
});

describe('재발급과 목록', () => {
  it('재발급하면 기존 링크는 즉시 만료되고 새 링크만 유효하다', async () => {
    const first = await createCompanyWithInvitation(db.operator, {
      companyName: '재발급설비',
      adminName: '강재발',
      operator: 'operator-a',
    });
    const second = await reissueInvitation(db.operator, {
      companyId: first.companyId,
      operator: 'operator-b',
    });
    const store = createPrismaInvitationStore(db.auth);

    expect(await store.find(first.token)).toBeNull();
    expect(await store.find(second.token)).not.toBeNull();
    expect(second.token).not.toBe(first.token);
  });

  it('이미 가입한 회사와 없는 회사는 재발급할 수 없다', async () => {
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '가입설비',
      adminName: '윤가입',
      operator: 'operator-a',
    });

    await db.owner.user.updateMany({
      where: { companyId: invitation.companyId },
      data: { status: 'ACTIVE' },
    });

    await expect(
      reissueInvitation(db.operator, { companyId: invitation.companyId, operator: 'operator-a' }),
    ).rejects.toThrow(InvitationReissueError);
    await expect(
      reissueInvitation(db.operator, {
        companyId: '0198e000-0000-7000-8000-000000000000',
        operator: 'operator-a',
      }),
    ).rejects.toThrow('COMPANY_NOT_FOUND');
  });

  it('목록에 가입 상태가 표시되고 회사 업무 데이터는 포함되지 않는다', async () => {
    const list = await listCompanies(db.operator);
    const byName = Object.fromEntries(list.map((item) => [item.companyName, item]));

    expect(byName['재발급설비']?.registration).toBe('INVITED');
    expect(byName['가입설비']?.registration).toBe('REGISTERED');
    // 링크를 사용했지만 이메일 인증 전이라 아직 가입 완료가 아님
    expect(byName['일회설비']?.registration).toBe('SIGNING_UP');
    expect(byName['만료설비']?.registration).toBe('INVITED');
    expect(Object.keys(list[0]!).sort()).toEqual([
      'adminName',
      'companyId',
      'companyName',
      'companyStatus',
      'registration',
    ]);
  });

  it('작업 기록 때문에 한 트랜잭션이 실패하면 회사도 남지 않는다', async () => {
    const before = await db.owner.company.count();

    await expect(
      createCompanyWithInvitation(db.operator, {
        companyName: '롤백설비',
        adminName: '정롤백',
        // 빈 작업자는 허용되지만 비정상 일수로 날짜 계산이 깨지면 전체가 취소되는지 확인
        operator: 'operator-a',
        days: Number.NaN,
      }),
    ).rejects.toThrow();

    expect(await db.owner.company.count()).toBe(before);
  });
});
