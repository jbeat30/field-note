import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createMemoryMailer } from '../email/mailer';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createMemoryQueue } from '../queue/jobQueue';

import { createAccountService } from './accountService';
import {
  CODE_TTL_MS,
  createEmailVerificationService,
  EmailVerificationError,
  MAX_CODE_ATTEMPTS,
  MAX_REQUESTS_PER_HOUR,
  registerEmailVerificationWorker,
  RESEND_INTERVAL_MS,
} from './emailVerification';

let db: TestDatabase;
let nowMs = Date.now();
let documentIds: string[];

jest.setTimeout(180_000);

const SECRET = 'unit-test-secret-unit-test-secret-0000';

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

beforeEach(() => {
  nowMs = Date.now();
});

afterAll(async () => {
  await db.stop();
});

let sequence = 0;

// 가입을 마친 (이메일 인증 전) 계정과, 같은 계정을 다루는 서비스 묶음
const setup = async () => {
  const { queue, sent } = createMemoryQueue();
  const { mailer, sent: mails } = createMemoryMailer();
  const verification = createEmailVerificationService({
    auth: db.auth,
    queue,
    mailer,
    secret: SECRET,
    now: () => new Date(nowMs),
  });

  // 처리기를 등록하면 보낸 작업이 즉시 처리됨 (실제 큐의 비동기 처리를 단순화)
  await registerEmailVerificationWorker(queue, verification);

  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `인증회사${sequence}`,
    adminName: '인증관리자',
    operator: 'test',
  });
  const email = `verify${sequence}@example.com`;

  await createAccountService({ auth: db.auth, app: db.app, now: () => new Date(nowMs) }).signup({
    inviteToken: invitation.token,
    loginId: `verify-user-${sequence}`,
    password: 'Correct-horse-2026!',
    email,
    consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
  });

  const account = { userId: invitation.userId, companyId: invitation.companyId };

  // 메일 본문에서 6자리 코드를 꺼냄
  const lastCode = () => /(\d{6})/.exec(mails.at(-1)?.text ?? '')?.[1] ?? '';

  return { verification, account, email, mails, sent, lastCode };
};

const expectError = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toBeInstanceOf(EmailVerificationError);
  await expect(promise).rejects.toMatchObject({ code });
};

describe('인증 코드 발송', () => {
  it('요청하면 작업 큐를 거쳐 6자리 코드가 메일로 발송된다', async () => {
    const { verification, account, email, mails, lastCode } = await setup();

    await expect(verification.request(account)).resolves.toEqual({ resendAfterSeconds: 30 });

    expect(mails).toHaveLength(1);
    expect(mails[0]?.to).toBe(email);
    expect(lastCode()).toMatch(/^\d{6}$/);
  });

  it('작업 큐에는 계정 식별자만 담기고 코드 원문은 담기지 않는다', async () => {
    const { verification, account, sent, lastCode } = await setup();

    await verification.request(account);

    expect(sent).toHaveLength(1);
    expect(JSON.stringify(sent[0]?.data)).not.toContain(lastCode());
    expect(Object.keys(sent[0]!.data).sort()).toEqual(['companyId', 'userId']);
  });

  it('DB에는 코드 원문이 아닌 해시만 저장된다', async () => {
    const { verification, account, lastCode } = await setup();

    await verification.request(account);

    const stored = await db.owner.emailVerification.findFirst({
      where: { companyId: account.companyId },
    });

    expect(stored?.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(lastCode());
  });

  it('메일 본문에는 코드와 유효 시간만 있고 개인정보는 없다', async () => {
    const { verification, account, mails } = await setup();

    await verification.request(account);

    expect(mails[0]?.text).toContain('10분');
    expect(mails[0]?.text).not.toMatch(/인증관리자|인증회사/);
  });

  it('재발송 간격 안에 다시 요청하면 거부한다', async () => {
    const { verification, account, mails } = await setup();

    await verification.request(account);
    await expectError(verification.request(account), 'RESEND_TOO_SOON');

    expect(mails).toHaveLength(1);

    nowMs += RESEND_INTERVAL_MS + 1000;

    await expect(verification.request(account)).resolves.toBeDefined();
    expect(mails).toHaveLength(2);
  });

  it(`한 시간에 ${MAX_REQUESTS_PER_HOUR}번까지만 요청할 수 있고, 시간이 지나면 다시 가능하다`, async () => {
    const { verification, account } = await setup();

    for (let count = 0; count < MAX_REQUESTS_PER_HOUR; count += 1) {
      await verification.request(account);
      nowMs += RESEND_INTERVAL_MS + 1000;
    }

    await expectError(verification.request(account), 'HOURLY_LIMIT');

    nowMs += 60 * 60 * 1000;

    await expect(verification.request(account)).resolves.toBeDefined();
  });

  it('이미 인증한 계정은 요청할 수 없다', async () => {
    const { verification, account, lastCode } = await setup();

    await verification.request(account);
    await verification.verify(account, lastCode());

    nowMs += RESEND_INTERVAL_MS + 1000;

    await expectError(verification.request(account), 'ALREADY_VERIFIED');
  });
});

describe('인증 코드 확인', () => {
  it('맞는 코드면 이메일 인증이 끝나고 계정이 활성화된다', async () => {
    const { verification, account, lastCode } = await setup();

    await verification.request(account);
    await verification.verify(account, lastCode());

    const user = await db.owner.user.findFirst({ where: { companyId: account.companyId } });

    expect(user?.status).toBe('ACTIVE');
    expect(user?.emailVerifiedAt).not.toBeNull();
  });

  it('사용한 코드는 다시 쓸 수 없다', async () => {
    const { verification, account, lastCode } = await setup();

    await verification.request(account);

    const code = lastCode();

    await verification.verify(account, code);
    await expectError(verification.verify(account, code), 'ALREADY_VERIFIED');
  });

  it('틀린 코드는 거부하고 상태를 바꾸지 않는다', async () => {
    const { verification, account, lastCode } = await setup();

    await verification.request(account);

    const wrong = lastCode() === '000000' ? '111111' : '000000';

    await expectError(verification.verify(account, wrong), 'CODE_INVALID');

    const user = await db.owner.user.findFirst({ where: { companyId: account.companyId } });

    expect(user?.emailVerifiedAt).toBeNull();
  });

  it(`${MAX_CODE_ATTEMPTS}번 틀리면 맞는 코드도 거부하고, 새 코드를 받으면 다시 입력할 수 있다`, async () => {
    const { verification, account, lastCode } = await setup();

    await verification.request(account);

    const code = lastCode();
    const wrong = code === '000000' ? '111111' : '000000';

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      await expectError(verification.verify(account, wrong), 'CODE_INVALID');
    }

    await expectError(verification.verify(account, code), 'CODE_INVALID');

    nowMs += RESEND_INTERVAL_MS + 1000;
    await verification.request(account);

    await expect(verification.verify(account, lastCode())).resolves.toEqual({
      previousEmail: null,
    });
  });

  it('유효 시간이 지난 코드는 거부한다', async () => {
    const { verification, account, lastCode } = await setup();

    await verification.request(account);

    const code = lastCode();

    nowMs += CODE_TTL_MS + 1000;

    await expectError(verification.verify(account, code), 'CODE_INVALID');
  });

  it('새 코드를 받으면 이전 코드는 무효가 된다', async () => {
    const { verification, account, lastCode } = await setup();

    await verification.request(account);

    const first = lastCode();

    nowMs += RESEND_INTERVAL_MS + 1000;
    await verification.request(account);

    const second = lastCode();

    // 우연히 같은 코드가 나온 경우는 비교 대상이 아님
    if (first !== second) {
      await expectError(verification.verify(account, first), 'CODE_INVALID');
    }

    await expect(verification.verify(account, second)).resolves.toEqual({ previousEmail: null });
  });

  it('다른 회사 계정의 코드로는 인증할 수 없다', async () => {
    const a = await setup();
    const b = await setup();

    await a.verification.request(a.account);
    await b.verification.request(b.account);

    await expectError(b.verification.verify(b.account, a.lastCode()), 'CODE_INVALID');
  });

  it('코드는 계정마다 다른 해시로 저장되어 같은 코드여도 다른 계정에서 통하지 않는다', async () => {
    const a = await setup();
    const b = await setup();

    await a.verification.request(a.account);
    await b.verification.request(b.account);

    const [rowA, rowB] = await Promise.all([
      db.owner.emailVerification.findFirst({ where: { companyId: a.account.companyId } }),
      db.owner.emailVerification.findFirst({ where: { companyId: b.account.companyId } }),
    ]);

    expect(rowA?.codeHash).not.toBe(rowB?.codeHash);
  });
});

describe('이메일 변경', () => {
  // 인증을 마친 계정 (변경 전에는 인증된 이메일이 있어야 함)
  const verified = async () => {
    const context = await setup();

    await context.verification.request(context.account);
    await context.verification.verify(context.account, context.lastCode());
    nowMs += RESEND_INTERVAL_MS + 1000;

    return context;
  };

  it('새 주소로 코드가 가고, 인증하기 전에는 계정 이메일이 바뀌지 않는다', async () => {
    const { verification, account, email, mails } = await verified();

    await verification.requestChange(account, 'changed@example.com');

    expect(mails.at(-1)?.to).toBe('changed@example.com');
    expect(
      (await db.owner.user.findFirst({ where: { companyId: account.companyId } }))?.email,
    ).toBe(email);
  });

  it('새 주소의 코드를 확인하면 이메일이 바뀌고 이전 주소를 알려 준다', async () => {
    const { verification, account, email, lastCode } = await verified();

    await verification.requestChange(account, 'changed2@example.com');

    await expect(verification.verify(account, lastCode())).resolves.toEqual({
      previousEmail: email,
    });

    const user = await db.owner.user.findFirst({ where: { companyId: account.companyId } });

    expect(user?.email).toBe('changed2@example.com');
    expect(user?.emailVerifiedAt).not.toBeNull();
  });

  it('변경 중에는 새 주소로 코드를 다시 받을 수 있다', async () => {
    const { verification, account, mails } = await verified();

    await verification.requestChange(account, 'resend@example.com');
    nowMs += RESEND_INTERVAL_MS + 1000;
    await verification.request(account);

    expect(mails.at(-1)?.to).toBe('resend@example.com');
  });

  it('이미 쓰는 주소와 현재 주소로는 바꿀 수 없다', async () => {
    const a = await verified();
    const b = await verified();

    await expectError(a.verification.requestChange(a.account, b.email), 'EMAIL_TAKEN');
    await expectError(a.verification.requestChange(a.account, a.email), 'SAME_EMAIL');
  });

  it('변경을 요청했다가 다른 주소로 다시 요청하면 이전 코드는 쓸 수 없다', async () => {
    const { verification, account, lastCode } = await verified();

    await verification.requestChange(account, 'first-change@example.com');

    const firstCode = lastCode();

    nowMs += RESEND_INTERVAL_MS + 1000;
    await verification.requestChange(account, 'second-change@example.com');

    if (firstCode !== lastCode()) {
      await expectError(verification.verify(account, firstCode), 'CODE_INVALID');
    }

    await verification.verify(account, lastCode());

    expect(
      (await db.owner.user.findFirst({ where: { companyId: account.companyId } }))?.email,
    ).toBe('second-change@example.com');
  });

  it('인증 전 계정도 잘못 입력한 이메일을 바꿀 수 있다', async () => {
    const { verification, account, lastCode } = await setup();

    await verification.requestChange(account, 'typo-fixed@example.com');
    await verification.verify(account, lastCode());

    const user = await db.owner.user.findFirst({ where: { companyId: account.companyId } });

    expect(user).toMatchObject({ email: 'typo-fixed@example.com', status: 'ACTIVE' });
  });

  it('변경 요청에도 재발송 간격 제한이 적용된다', async () => {
    const { verification, account } = await verified();

    await verification.requestChange(account, 'limit@example.com');
    await expectError(verification.requestChange(account, 'limit2@example.com'), 'RESEND_TOO_SOON');
  });
});

describe('발송 실패', () => {
  it('메일 발송이 실패하면 오류를 큐로 전달해 재시도되게 한다', async () => {
    const { queue } = createMemoryQueue();
    const failing = createEmailVerificationService({
      auth: db.auth,
      queue,
      mailer: { send: async () => Promise.reject(new Error('SMTP 연결 실패')) },
      secret: SECRET,
    });
    const { account } = await setup();

    await expect(failing.deliver(account)).rejects.toThrow('SMTP 연결 실패');
  });
});
