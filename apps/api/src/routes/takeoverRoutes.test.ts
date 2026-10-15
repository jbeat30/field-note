import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createPrismaInvitationStore } from '../invitation/invitationStore';
import {
  createCompanyWithInvitation,
  issueTakeoverInvitation,
  TakeoverIssueError,
} from '../operator/operatorService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

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

const notices: { kind: string; to: string }[] = [];

const app = () =>
  createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    invitationStore: createPrismaInvitationStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    notifier: {
      notify: async (kind, to) => {
        notices.push({ kind, to });
      },
    },
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const post = (instance: ReturnType<typeof app>, path: string, body: object, cookie?: string) => {
  const call = request(instance).post(`/api/v1${path}`).set(CSRF_HEADER, CSRF_HEADER_VALUE);

  return (cookie ? call.set('Cookie', cookie) : call).send(body);
};

const signupBody = (token: string, loginId: string, email: string, password: string) => ({
  inviteToken: token,
  loginId,
  password,
  email,
  isAgeConfirmed: true,
  consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
});

// 가입을 마친 회사 (이메일 인증까지 끝난 활성 계정)와 로그인 쿠키
const registeredCompany = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `복구회사${sequence}`,
    adminName: '기존소유자',
    operator: 'test',
  });
  const loginId = `owner-${sequence}`;
  const email = `owner${sequence}@example.com`;
  const res = await post(
    instance,
    '/auth/signup',
    signupBody(invitation.token, loginId, email, 'Correct-horse-2026!'),
  );
  const cookie = (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;

  await db.owner.user.update({
    where: { companyId_id: { companyId: invitation.companyId, id: invitation.userId } },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
  });

  return { companyId: invitation.companyId, userId: invitation.userId, loginId, email, cookie };
};

const login = (instance: ReturnType<typeof app>, loginId: string, password: string) =>
  post(instance, '/auth/login', { loginId, password, isRemembered: false });

describe('계정 복구·소유자 이전 링크 발급 (운영자)', () => {
  it('본인 확인 방법을 필수로 남기고 가입 전 계정은 발급할 수 없다', async () => {
    const instance = app();
    const owner = await registeredCompany(instance);

    await expect(
      issueTakeoverInvitation(db.operator, {
        companyId: owner.companyId,
        kind: 'RECOVERY',
        note: '  ',
        operator: 'op',
      }),
    ).rejects.toThrow(TakeoverIssueError);

    const issued = await issueTakeoverInvitation(db.operator, {
      companyId: owner.companyId,
      kind: 'RECOVERY',
      note: '사업자등록증 대조·통화 확인',
      operator: 'op',
    });
    const action = await db.owner.operatorAction.findFirstOrThrow({
      where: { companyId: owner.companyId, action: 'ACCOUNT_RECOVERY_ISSUED' },
    });

    expect(action).toMatchObject({ note: '사업자등록증 대조·통화 확인', operator: 'op' });
    expect(issued.token).toBeTruthy();

    // 토큰 원문은 저장 제외
    expect(
      JSON.stringify(await db.owner.invitation.findMany({ where: { companyId: owner.companyId } })),
    ).not.toContain(issued.token);

    const invited = await createCompanyWithInvitation(db.operator, {
      companyName: `가입전회사${sequence}`,
      adminName: '아직가입전',
      operator: 'test',
    });

    await expect(
      issueTakeoverInvitation(db.operator, {
        companyId: invited.companyId,
        kind: 'RECOVERY',
        note: '확인',
        operator: 'op',
      }),
    ).rejects.toThrow(TakeoverIssueError);
  });
});

describe('복구 링크 사용', () => {
  it('링크를 쓰는 순간 기존 로그인이 모두 풀리고 새 정보로 다시 등록되며 회사 데이터는 그대로다', async () => {
    const instance = app();
    const owner = await registeredCompany(instance);
    const issued = await issueTakeoverInvitation(db.operator, {
      companyId: owner.companyId,
      kind: 'RECOVERY',
      note: '통화 확인',
      operator: 'op',
    });

    // 링크 확인 화면은 복구 용도로 안내
    const info = await request(instance).get(`/api/v1/invitations/${issued.token}`);

    expect(info.status).toBe(200);
    expect(info.body).toMatchObject({ purpose: 'RECOVERY', adminName: '기존소유자' });

    // 사용 전에는 기존 로그인이 유지됨
    expect((await login(instance, owner.loginId, 'Correct-horse-2026!')).status).toBe(200);

    const before = await db.owner.company.findUniqueOrThrow({ where: { id: owner.companyId } });
    const newLoginId = `recovered-${sequence}`;
    const newEmail = `recovered${sequence}@example.com`;
    const done = await post(
      instance,
      '/auth/signup',
      signupBody(issued.token, newLoginId, newEmail, 'Another-horse-2027!'),
    );

    expect(done.status).toBe(201);

    // 이전 이메일로 보안 알림
    expect(notices).toContainEqual({ kind: 'OWNER_REGISTERED_AGAIN', to: owner.email });
    // 이전 아이디·비밀번호·세션은 쓸 수 없음
    expect((await login(instance, owner.loginId, 'Correct-horse-2026!')).status).toBe(401);
    expect((await request(instance).get('/api/v1/me').set('Cookie', owner.cookie)).status).toBe(
      401,
    );

    const user = await db.owner.user.findFirstOrThrow({ where: { id: owner.userId } });
    const credential = await db.owner.userCredential.findFirstOrThrow({
      where: { userId: owner.userId },
    });

    // 새 이메일 인증 전까지 로그인 대기 상태, 계정 ID와 회사는 그대로
    expect(user).toMatchObject({ email: newEmail, status: 'INVITED', emailVerifiedAt: null });
    expect(credential.loginId).toBe(newLoginId);
    expect(user.companyId).toBe(before.id);

    // 링크는 한 번만 사용
    expect(
      (
        await post(
          instance,
          '/auth/signup',
          signupBody(
            issued.token,
            `again-${sequence}`,
            `again${sequence}@example.com`,
            'Third-horse-2028!',
          ),
        )
      ).status,
    ).toBe(404);
  });

  it('소유자 이전은 새 소유자 이름으로 바뀌고 링크 확인 화면에도 새 이름이 보인다', async () => {
    const instance = app();
    const owner = await registeredCompany(instance);
    const issued = await issueTakeoverInvitation(db.operator, {
      companyId: owner.companyId,
      kind: 'TRANSFER',
      note: '위임장 확인',
      newDisplayName: '새소유자',
      operator: 'op',
    });

    expect((await request(instance).get(`/api/v1/invitations/${issued.token}`)).body).toMatchObject(
      {
        purpose: 'TRANSFER',
        adminName: '새소유자',
      },
    );

    await post(
      instance,
      '/auth/signup',
      signupBody(
        issued.token,
        `next-${sequence}`,
        `next${sequence}@example.com`,
        'Another-horse-2027!',
      ),
    );

    expect(
      (await db.owner.user.findFirstOrThrow({ where: { id: owner.userId } })).displayName,
    ).toBe('새소유자');
    expect(
      await db.owner.operatorAction.count({
        where: { companyId: owner.companyId, action: 'OWNER_TRANSFER_ISSUED' },
      }),
    ).toBe(1);
  });

  it('입력이 잘못돼 가입이 실패하면 링크도 기존 로그인도 그대로 남는다', async () => {
    const instance = app();
    const owner = await registeredCompany(instance);
    const other = await registeredCompany(instance);
    const issued = await issueTakeoverInvitation(db.operator, {
      companyId: owner.companyId,
      kind: 'RECOVERY',
      note: '통화 확인',
      operator: 'op',
    });
    // 다른 회사가 쓰는 이메일은 쓸 수 없음
    const failed = await post(
      instance,
      '/auth/signup',
      signupBody(issued.token, `x-${sequence}`, other.email, 'Another-horse-2027!'),
    );

    expect(failed.status).toBeGreaterThanOrEqual(400);
    expect((await login(instance, owner.loginId, 'Correct-horse-2026!')).status).toBe(200);
    expect((await request(instance).get(`/api/v1/invitations/${issued.token}`)).status).toBe(200);
  });

  it('기존 가입 링크는 이미 가입한 계정에는 쓸 수 없다', async () => {
    const instance = app();
    const owner = await registeredCompany(instance);
    const invitation = await db.owner.invitation.findFirstOrThrow({
      where: { companyId: owner.companyId },
    });

    // 가입에 쓰인 링크는 폐기된 상태 (용도가 가입이므로 활성 계정에는 다시 열리지 않음)
    expect(invitation.usedAt).not.toBeNull();
    expect(invitation.purpose).toBe('SIGNUP');
  });
});
