import { auditLogsResponseSchema, errorResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { createAuditService } from '../audit/auditService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { markCompanyEmailsVerified } from '../db/testFixtures';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createMonthlyService } from '../monthly/monthlyService';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

// 서울 기준 2026-10-11
const NOW = new Date('2026-10-11T03:00:00Z');

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

const app = () =>
  createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    monthly: createMonthlyService(db.app, () => NOW),
    audit: createAuditService(db.app),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const setup = async () => {
  const instance = app();

  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `기록회사${sequence}`,
    adminName: '기록관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `audit-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `audit${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });
  await markCompanyEmailsVerified(db.ownerPool, invitation.companyId);
  const cookie = (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
  const post = (path: string, body: object) =>
    request(instance)
      .post(`/api/v1${path}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body);
  const logs = async (query = '') =>
    auditLogsResponseSchema.parse(
      (await request(instance).get(`/api/v1/audit-logs${query}`).set('Cookie', cookie)).body,
    );

  return { instance, cookie, post, logs, companyName: `기록회사${sequence}` };
};

describe('GET /audit-logs', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const { instance } = await setup();

    expect((await request(instance).get('/api/v1/audit-logs')).status).toBe(401);
  });

  it('기록이 없으면 빈 목록이다', async () => {
    const { logs } = await setup();

    expect(await logs()).toEqual({ items: [], nextCursor: null });
  });

  it('월 공수 확정·재오픈·내보내기가 최근순으로 쌓이고 대상 이름과 설명이 붙는다', async () => {
    const { instance, cookie, post, logs, companyName } = await setup();

    expect((await post('/monthly-hours/close', { month: '2026-09' })).status).toBe(200);
    expect(
      (await post('/monthly-hours/reopen', { month: '2026-09', reason: '작업 내역 정정' })).status,
    ).toBe(200);
    await request(instance).get('/api/v1/monthly-hours.xlsx?month=2026-09').set('Cookie', cookie);

    const { items } = await logs();

    expect(items.map((item) => item.action)).toEqual([
      'REPORT_EXPORTED',
      'MONTH_REOPENED',
      'MONTH_CLOSED',
    ]);
    expect(items[0]).toMatchObject({
      targetType: 'COMPANY',
      targetName: companyName,
      summary: '월 공수표 엑셀 · 2026-09',
      actorName: '기록관리자',
    });
    expect(items[1]).toMatchObject({ summary: '2026-09 · 작업 내역 정정' });
    expect(items[2]).toMatchObject({ summary: '2026-09' });
  });

  it('행위와 날짜 범위로 거르고 커서로 이어서 읽는다', async () => {
    const { post, logs } = await setup();

    await post('/monthly-hours/close', { month: '2026-08' });
    await post('/monthly-hours/reopen', { month: '2026-08', reason: '정정' });
    await post('/monthly-hours/close', { month: '2026-08' });

    expect((await logs('?action=MONTH_CLOSED')).items).toHaveLength(2);
    expect((await logs('?action=MONTH_REOPENED')).items).toHaveLength(1);
    // 날짜 범위(서울 기준): 기록 시각은 2026-10-11이 아니라 실제 저장 시각이므로 오늘 하루를 포함하는 범위로 확인
    expect((await logs('?from=2000-01-01&to=2000-01-02')).items).toHaveLength(0);
    expect((await logs('?from=2000-01-01&to=2100-01-01')).items).toHaveLength(3);

    const first = await logs('?limit=2');

    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    const second = await logs(`?limit=2&cursor=${first.nextCursor}`);

    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(3);
  });

  it('잘못된 조건은 거부한다', async () => {
    const { instance, cookie } = await setup();
    const get = (query: string) =>
      request(instance).get(`/api/v1/audit-logs${query}`).set('Cookie', cookie);

    expect((await get('?action=NOPE')).status).toBe(400);
    expect((await get('?from=2026-10-02&to=2026-10-01')).status).toBe(400);

    const bad = await get('?cursor=zzz');

    expect(bad.status).toBe(400);
    expect(errorResponseSchema.parse(bad.body).error.details?.[0]?.path).toBe('query.cursor');
  });

  it('다른 회사의 기록은 보이지 않는다', async () => {
    const a = await setup();
    const b = await setup();

    await a.post('/monthly-hours/close', { month: '2026-09' });

    expect((await a.logs()).items).toHaveLength(1);
    expect((await b.logs()).items).toEqual([]);
  });
});
