import { startTestDatabase, type TestDatabase } from '../db/testDatabase';

import { CLOSURE_GRACE_MS, ClosureError } from './closureService';
import { createClosureHarness, OLD_PASSWORD } from './closureHarness';

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

const harness = () => createClosureHarness(db, documentIds);

const expectCode = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toMatchObject({ code });
};

describe('해지 요청', () => {
  it('요청하면 회사가 해지 중 상태가 되고 14일 뒤가 삭제 예정이다', async () => {
    const h = await harness();
    const { account } = await h.passwordAccount();
    const { purgeAfter } = await h.closure.request(account, OLD_PASSWORD);
    const company = await db.owner.company.findUnique({ where: { id: account.companyId } });
    const closure = await db.owner.companyClosure.findUnique({
      where: { companyId: account.companyId },
    });

    expect(company?.status).toBe('CLOSING');
    expect(purgeAfter.getTime()).toBe(h.clock.ms + CLOSURE_GRACE_MS);
    expect(closure).toMatchObject({ cancelledAt: null, purgedAt: null });
  });

  it('요청 즉시 모든 기기가 로그아웃된다', async () => {
    const h = await harness();
    const { account } = await h.passwordAccount();
    const phone = await h.sessionStore.create(account);
    const desktop = await h.sessionStore.create(account);

    await h.closure.request(account, OLD_PASSWORD);

    expect(await h.sessionStore.find(phone.token)).toBeNull();
    expect(await h.sessionStore.find(desktop.token)).toBeNull();
  });

  it('비밀번호가 틀리거나 없으면 거부하고 아무것도 바뀌지 않는다', async () => {
    const h = await harness();
    const { account } = await h.passwordAccount();

    await expectCode(h.closure.request(account, 'wrong-password-1'), 'CURRENT_PASSWORD_INVALID');
    await expectCode(h.closure.request(account, undefined), 'PASSWORD_REQUIRED');

    expect((await db.owner.company.findUnique({ where: { id: account.companyId } }))?.status).toBe(
      'ACTIVE',
    );
    expect(await db.owner.companyClosure.count({ where: { companyId: account.companyId } })).toBe(
      0,
    );
  });

  it('소셜 로그인만 쓰는 계정은 확인할 비밀번호가 없어 비밀번호 없이 요청할 수 있다', async () => {
    const h = await harness();
    const account = await h.socialOnlyAccount('kakao-closure-1', 'closure-social1@example.com');

    await expect(h.closure.request(account)).resolves.toBeDefined();
  });

  it('이미 해지 중인 회사는 다시 요청할 수 없다', async () => {
    const h = await harness();
    const { account } = await h.passwordAccount();

    await h.closure.request(account, OLD_PASSWORD);

    await expect(h.closure.request(account, OLD_PASSWORD)).rejects.toBeInstanceOf(ClosureError);
  });

  it('취소 링크 메일이 가고 토큰 원문은 DB에 남지 않는다', async () => {
    const h = await harness();
    const { account, email } = await h.passwordAccount();

    await h.closure.request(account, OLD_PASSWORD);

    expect(h.mails.at(-1)?.to).toBe(email);
    expect(h.mails.at(-1)?.subject).toContain('해지 요청');
    expect(h.lastCancelToken().length).toBeGreaterThanOrEqual(43);

    const closure = await db.owner.companyClosure.findUnique({
      where: { companyId: account.companyId },
    });

    expect(closure?.cancelTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(closure)).not.toContain(h.lastCancelToken());
  });
});

describe('해지 중 로그인', () => {
  it('비밀번호가 맞을 때만 해지 중임을 알려 주고 로그인은 막는다', async () => {
    const h = await harness();
    const { account, loginId } = await h.passwordAccount();

    await h.closure.request(account, OLD_PASSWORD);

    await expectCode(
      h.accountService.login({ loginId, password: OLD_PASSWORD }),
      'ACCOUNT_CLOSING',
    );
    await expectCode(
      h.accountService.login({ loginId, password: 'wrong-password-1' }),
      'INVALID_CREDENTIALS',
    );
  });
});

describe('해지 취소', () => {
  it('링크로 취소하면 계정이 복구되어 다시 로그인할 수 있고 알림 메일이 간다', async () => {
    const h = await harness();
    const { account, loginId, email } = await h.passwordAccount();

    await h.closure.request(account, OLD_PASSWORD);

    const token = h.lastCancelToken();

    expect((await h.closure.info(token))?.purgeAfter.getTime()).toBe(h.clock.ms + CLOSURE_GRACE_MS);

    await h.closure.cancel(token);

    expect((await db.owner.company.findUnique({ where: { id: account.companyId } }))?.status).toBe(
      'ACTIVE',
    );
    await expect(
      h.accountService.login({ loginId, password: OLD_PASSWORD }),
    ).resolves.toBeDefined();
    expect(h.mails.at(-1)?.to).toBe(email);
    expect(h.mails.at(-1)?.subject).toContain('취소되었습니다');
  });

  it('링크는 한 번만 쓸 수 있다', async () => {
    const h = await harness();
    const { account } = await h.passwordAccount();

    await h.closure.request(account, OLD_PASSWORD);

    const token = h.lastCancelToken();

    await h.closure.cancel(token);

    await expectCode(h.closure.cancel(token), 'LINK_INVALID');
    expect(await h.closure.info(token)).toBeNull();
  });

  it('동시에 두 번 취소해도 한 번만 성공한다', async () => {
    const h = await harness();
    const { account } = await h.passwordAccount();

    await h.closure.request(account, OLD_PASSWORD);

    const token = h.lastCancelToken();
    const results = await Promise.allSettled([h.closure.cancel(token), h.closure.cancel(token)]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });

  it('유예가 지난 링크와 없는 링크는 쓸 수 없다', async () => {
    const h = await harness();
    const { account } = await h.passwordAccount();

    await h.closure.request(account, OLD_PASSWORD);

    const token = h.lastCancelToken();

    h.clock.ms += CLOSURE_GRACE_MS + 1000;

    expect(await h.closure.info(token)).toBeNull();
    await expectCode(h.closure.cancel(token), 'LINK_INVALID');
    await expectCode(h.closure.cancel('unknown-token-0000'), 'LINK_INVALID');
    expect((await db.owner.company.findUnique({ where: { id: account.companyId } }))?.status).toBe(
      'CLOSING',
    );
  });

  it('취소한 뒤 다시 해지를 요청할 수 있다', async () => {
    const h = await harness();
    const { account } = await h.passwordAccount();

    await h.closure.request(account, OLD_PASSWORD);
    await h.closure.cancel(h.lastCancelToken());
    await h.closure.request(account, OLD_PASSWORD);

    const closure = await db.owner.companyClosure.findUnique({
      where: { companyId: account.companyId },
    });

    expect(closure?.cancelledAt).toBeNull();
    expect((await db.owner.company.findUnique({ where: { id: account.companyId } }))?.status).toBe(
      'CLOSING',
    );
  });

  it('다른 회사의 해지에는 영향을 주지 않는다', async () => {
    const h = await harness();
    const a = await h.passwordAccount();
    const b = await h.passwordAccount();

    await h.closure.request(a.account, OLD_PASSWORD);

    expect(
      (await db.owner.company.findUnique({ where: { id: b.account.companyId } }))?.status,
    ).toBe('ACTIVE');
    await expect(
      h.accountService.login({ loginId: b.loginId, password: OLD_PASSWORD }),
    ).resolves.toBeDefined();
  });
});
