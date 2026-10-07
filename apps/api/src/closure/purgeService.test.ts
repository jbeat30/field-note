import { startTestDatabase, type TestDatabase } from '../db/testDatabase';

import { createClosureHarness, OLD_PASSWORD } from './closureHarness';
import { CLOSURE_GRACE_MS } from './closureService';
import { ANONYMIZED_COMPANY_NAME, ANONYMIZED_USER_NAME } from './purgePolicy';
import {
  listDueClosures,
  NotDueForPurgeError,
  purgeCompany,
  purgeDueCompanies,
} from './purgeService';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

beforeAll(async () => {
  db = await startTestDatabase();

  const { rows } = await db.ownerPool.query<{ id: string }>(
    `INSERT INTO legal_documents (type, version, effective_at, content_hash, is_required) VALUES
      ('TERMS_OF_SERVICE', '2026-10-01', '2026-10-01', 'h1', true),
      ('PRIVACY_POLICY', '2026-10-01', '2026-10-01', 'h2', true)
     RETURNING id`,
  );

  documentIds = rows.map((row) => row.id);
});

afterAll(async () => {
  await db.stop();
});

// 가입 후 업무 데이터를 만들고 해지를 요청 (시간 이동은 호출하는 쪽에서, 가입 초대가 만료되지 않게 모든 가입 뒤에 함)
const closeAccount = async (h: Awaited<ReturnType<typeof createClosureHarness>>) => {
  const { account, ...rest } = await h.passwordAccount();

  await db.owner.project.create({ data: { companyId: account.companyId, name: '삭제될 현장' } });

  const project = await db.owner.project.findFirstOrThrow({
    where: { companyId: account.companyId },
  });

  await db.owner.memo.create({
    data: { companyId: account.companyId, projectId: project.id, content: '삭제될 메모' },
  });
  await db.owner.optionItem.create({
    data: {
      companyId: account.companyId,
      kind: 'TRADE',
      name: '삭제될 공종',
      nameKey: '삭제될 공종',
      sortOrder: 0,
    },
  });
  await h.sessionStore.create(account);
  await h.closure.request(account, OLD_PASSWORD);

  return { account, ...rest };
};

const expire = (h: { clock: { ms: number } }) => {
  h.clock.ms += CLOSURE_GRACE_MS + 1000;
};

describe('삭제·익명화', () => {
  it('유예가 끝나면 업무 데이터는 삭제하고 계정은 익명화하며 동의 이력은 남긴다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const { account, email, loginId } = await closeAccount(h);

    expire(h);
    const where = { companyId: account.companyId };
    const consentsBefore = await db.owner.consent.count({ where });

    const result = await purgeCompany(db.purge, account.companyId, h.now);

    expect(result.anonymizedUsers).toBe(1);
    expect(await db.owner.project.count({ where })).toBe(0);
    expect(await db.owner.memo.count({ where })).toBe(0);
    expect(await db.owner.optionItem.count({ where })).toBe(0);
    expect(await db.owner.session.count({ where })).toBe(0);
    expect(await db.owner.userCredential.count({ where })).toBe(0);
    expect(await db.owner.invitation.count({ where })).toBe(0);
    expect(await db.owner.companySettings.count({ where })).toBe(0);
    expect(await db.owner.consent.count({ where })).toBe(consentsBefore);

    const user = await db.owner.user.findFirstOrThrow({ where });
    const company = await db.owner.company.findUniqueOrThrow({ where: { id: account.companyId } });
    const closure = await db.owner.companyClosure.findUniqueOrThrow({
      where: { companyId: account.companyId },
    });

    expect(user).toMatchObject({ displayName: ANONYMIZED_USER_NAME, email: null, phone: null });
    expect(company).toMatchObject({ name: ANONYMIZED_COMPANY_NAME, status: 'CLOSED' });
    expect(closure.purgedAt).not.toBeNull();
    // 개인 식별값(이메일·아이디)이 어떤 테이블에도 남지 않음
    expect(JSON.stringify(user)).not.toContain(email);
    expect(await db.owner.userCredential.count({ where: { loginId } })).toBe(0);
  });

  it('로그인은 삭제 뒤에도 일반 실패로만 보인다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const { account, loginId } = await closeAccount(h);

    expire(h);

    await purgeCompany(db.purge, account.companyId, h.now);

    await expect(h.accountService.login({ loginId, password: OLD_PASSWORD })).rejects.toMatchObject(
      {
        code: 'INVALID_CREDENTIALS',
      },
    );
  });

  it('유예 중·취소됨·이미 삭제된 회사는 삭제하지 않는다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const waiting = await h.passwordAccount();
    const cancelled = await h.passwordAccount();
    const active = await h.passwordAccount();

    await h.closure.request(waiting.account, OLD_PASSWORD);
    await h.closure.request(cancelled.account, OLD_PASSWORD);
    await h.closure.cancel(h.lastCancelToken());

    h.clock.ms += CLOSURE_GRACE_MS - 60_000;

    await expect(purgeCompany(db.purge, waiting.account.companyId, h.now)).rejects.toBeInstanceOf(
      NotDueForPurgeError,
    );

    h.clock.ms += 120_000;

    await expect(purgeCompany(db.purge, cancelled.account.companyId, h.now)).rejects.toBeInstanceOf(
      NotDueForPurgeError,
    );
    await expect(purgeCompany(db.purge, active.account.companyId, h.now)).rejects.toBeInstanceOf(
      NotDueForPurgeError,
    );

    await purgeCompany(db.purge, waiting.account.companyId, h.now);
    await expect(purgeCompany(db.purge, waiting.account.companyId, h.now)).rejects.toBeInstanceOf(
      NotDueForPurgeError,
    );
    expect(
      await db.owner.userCredential.count({ where: { companyId: active.account.companyId } }),
    ).toBe(1);
  });

  it('다른 회사의 데이터는 건드리지 않는다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const other = await h.passwordAccount();
    const closing = await closeAccount(h);

    expire(h);

    await db.owner.project.create({
      data: { companyId: other.account.companyId, name: '남는 현장' },
    });
    await purgeCompany(db.purge, closing.account.companyId, h.now);

    expect(await db.owner.project.count({ where: { companyId: other.account.companyId } })).toBe(1);
    expect(
      (await db.owner.company.findUniqueOrThrow({ where: { id: other.account.companyId } })).status,
    ).toBe('ACTIVE');
  });

  it('삭제 전용 계정은 해지 대상이 아닌 회사의 데이터를 지울 수 없다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const active = await h.passwordAccount();

    await db.owner.project.create({
      data: { companyId: active.account.companyId, name: '활성 현장' },
    });
    await expect(
      db.purge.project.deleteMany({ where: { companyId: active.account.companyId } }),
    ).resolves.toMatchObject({ count: 0 });
    expect(await db.owner.project.count({ where: { companyId: active.account.companyId } })).toBe(
      1,
    );
    await expect(
      db.purge.userCredential.deleteMany({ where: { companyId: active.account.companyId } }),
    ).resolves.toMatchObject({ count: 0 });
    expect(
      await db.owner.userCredential.count({ where: { companyId: active.account.companyId } }),
    ).toBe(1);
  });
});

describe('일괄 삭제', () => {
  it('유예가 끝난 회사만 골라 처리하고 한 곳이 실패해도 나머지는 계속한다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const notYet = await h.passwordAccount();
    const due = await closeAccount(h);
    const dueToo = await closeAccount(h);

    expire(h);
    await h.closure.request(notYet.account, OLD_PASSWORD);

    const listed = await listDueClosures(db.purge, h.now);

    expect(listed.map((item) => item.companyId)).toEqual(
      expect.arrayContaining([due.account.companyId, dueToo.account.companyId]),
    );
    expect(listed.map((item) => item.companyId)).not.toContain(notYet.account.companyId);

    const summary = await purgeDueCompanies(db.purge, h.now);

    expect(summary.failed).toEqual([]);
    expect(summary.purged.map((item) => item.companyId)).toEqual(
      expect.arrayContaining([due.account.companyId, dueToo.account.companyId]),
    );
    expect(
      (await db.owner.company.findUniqueOrThrow({ where: { id: notYet.account.companyId } }))
        .status,
    ).toBe('CLOSING');
    expect((await purgeDueCompanies(db.purge, h.now)).purged).toEqual([]);
  });
});
