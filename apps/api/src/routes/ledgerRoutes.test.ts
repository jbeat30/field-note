import {
  ledgerEntriesResponseSchema,
  ledgerEntrySchema,
  ledgerSummarySchema,
  optionsResponseSchema,
  type OptionKind,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createAuditService } from '../audit/auditService';
import { createEmployeeService } from '../employee/employeeService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createPrismaIdempotencyStore } from '../http/idempotencyStore';
import { createLedgerService } from '../ledger/ledgerService';
import { createChangeWorkService } from '../changeWork/changeWorkService';
import { createDocumentService } from '../document/documentService';
import { createMemoryStorage } from '../storage/objectStorage';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createProjectService } from '../project/projectService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

const NOW = new Date('2026-10-16T03:00:00Z');

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

const harness = () =>
  createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    options: createOptionService(db.app),
    employees: createEmployeeService(db.app, () => NOW),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => NOW),
    documents: createDocumentService(db.app, createMemoryStorage().storage, () => NOW),
    changeWorks: createChangeWorkService(db.app, () => NOW),
    ledger: createLedgerService(db.app, () => NOW),
    audit: createAuditService(db.app, () => NOW),
    idempotencyStore: createPrismaIdempotencyStore(db.app),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof harness>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `지출회사${sequence}`,
    adminName: '지출관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `ledger-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `ledger${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const setup = async () => {
  const instance = harness();
  const cookie = await signedUp(instance);
  const send = (method: 'post' | 'patch' | 'delete', path: string, body: object = {}) => {
    const req = request(instance);
    const target = `/api/v1${path}`;
    const call =
      method === 'post'
        ? req.post(target)
        : method === 'patch'
          ? req.patch(target)
          : req.delete(target);

    return call.set(CSRF_HEADER, CSRF_HEADER_VALUE).set('Cookie', cookie).send(body);
  };
  const post = (path: string, body: object = {}) => send('post', path, body);
  const patch = (path: string, body: object) => send('patch', path, body);
  const del = (path: string) => send('delete', path);
  const get = (path: string) => request(instance).get(`/api/v1${path}`).set('Cookie', cookie);
  const clientId = (await post('/partners', { kind: 'CLIENT', name: '가나다건설' })).body.id;
  const supplierId = (await post('/partners', { kind: 'SUPPLIER', name: '대한강판' })).body
    .id as string;
  const managerId = (await post('/employees', { name: '박소장' })).body.id;
  const options = optionsResponseSchema.parse((await get('/company/options')).body).items;
  const optionId = (kind: OptionKind, name: string) =>
    options.find((item) => item.kind === kind && item.name === name)!.id;
  const project = async (name = 'A동 판금 공사') =>
    (
      await post('/projects', {
        name,
        siteName: `${name} 현장`,
        clientId,
        managerId,
        contractDate: '2026-09-01',
        plannedStart: '2026-10-01',
        plannedEnd: '2026-12-31',
      })
    ).body.id as string;
  const entry = (projectId: string, body: object) =>
    post(`/projects/${projectId}/ledger-entries`, {
      entryDate: '2026-10-05',
      kind: 'EXPENSE',
      amount: 12000,
      ...body,
    });

  return { instance, post, patch, del, get, supplierId, optionId, project, entry };
};

describe('지출·수입 기록', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const s = await setup();
    const projectId = await s.project();

    expect(
      (await request(s.instance).get(`/api/v1/projects/${projectId}/ledger-entries`)).status,
    ).toBe(401);
  });

  it('지출 분류·거래처를 붙여 기록하고 최근 날짜순으로 본다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const created = ledgerEntrySchema.parse(
      (
        await s.entry(projectId, {
          categoryId: s.optionId('EXPENSE_CATEGORY', '부자재'),
          partnerId: s.supplierId,
          content: '실리콘 20개',
          amount: 84000,
        })
      ).body,
    );

    expect(created).toMatchObject({ kind: 'EXPENSE', amount: 84000, content: '실리콘 20개' });

    await s.entry(projectId, { entryDate: '2026-10-07', amount: 5000 });

    const list = ledgerEntriesResponseSchema.parse(
      (await s.get(`/projects/${projectId}/ledger-entries`)).body,
    );

    expect(list.items.map((item) => item.entryDate)).toEqual(['2026-10-07', '2026-10-05']);
    expect(list.nextCursor).toBeNull();
  });

  it('금액은 0보다 큰 원 단위 정수여야 한다', async () => {
    const s = await setup();
    const projectId = await s.project();

    for (const amount of [0, -1, 1.5, 10_000_000_001]) {
      expect((await s.entry(projectId, { amount })).status).toBe(400);
    }
  });

  it('구분에 맞지 않는 분류는 저장하지 않는다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const response = await s.entry(projectId, {
      kind: 'INCOME',
      categoryId: s.optionId('EXPENSE_CATEGORY', '부자재'),
    });

    expect(response.status).toBe(400);

    expect(
      (
        await s.entry(projectId, {
          kind: 'INCOME',
          categoryId: s.optionId('INCOME_CATEGORY', '고철 판매'),
          amount: 300000,
        })
      ).status,
    ).toBe(201);
  });

  it('다른 프로젝트의 추가 공사는 연결할 수 없다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const otherId = await s.project('B동 공사');
    const created = await s.post(`/projects/${otherId}/change-works`, {
      requestedOn: '2026-10-05',
      requester: '고객',
      content: '문 추가',
      confirmCompleted: true,
    });

    expect(created.status).toBe(201);

    const change = created.body.id as string;

    expect((await s.entry(projectId, { changeWorkId: change })).status).toBe(400);
    expect((await s.entry(otherId, { changeWorkId: change })).status).toBe(201);
  });

  it('합계는 지출과 수입을 따로 내고 필터를 따른다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const material = s.optionId('EXPENSE_CATEGORY', '부자재');

    await s.entry(projectId, { amount: 10000, categoryId: material });
    await s.entry(projectId, { amount: 5000, categoryId: material, entryDate: '2026-10-09' });
    await s.entry(projectId, { amount: 2000 });
    await s.entry(projectId, {
      kind: 'INCOME',
      amount: 70000,
      categoryId: s.optionId('INCOME_CATEGORY', '고철 판매'),
    });

    const all = ledgerSummarySchema.parse(
      (await s.get(`/projects/${projectId}/ledger-summary`)).body,
    );

    expect(all).toMatchObject({ expenseTotal: 17000, incomeTotal: 70000, entryCount: 4 });
    expect(all.byCategory[0]).toMatchObject({
      kind: 'EXPENSE',
      categoryId: material,
      amount: 15000,
    });

    const ranged = ledgerSummarySchema.parse(
      (await s.get(`/projects/${projectId}/ledger-summary?from=2026-10-08&kind=EXPENSE`)).body,
    );

    expect(ranged).toMatchObject({ expenseTotal: 5000, incomeTotal: 0, entryCount: 1 });
    expect(
      (await s.get(`/projects/${projectId}/ledger-summary?from=2026-10-10&to=2026-10-01`)).status,
    ).toBe(400);
  });

  it('구분을 바꾸면 분류는 비워지고, 새 분류를 같이 보내면 그것이 저장된다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const created = ledgerEntrySchema.parse(
      (await s.entry(projectId, { categoryId: s.optionId('EXPENSE_CATEGORY', '장비') })).body,
    );
    const toIncome = ledgerEntrySchema.parse(
      (await s.patch(`/ledger-entries/${created.id}`, { kind: 'INCOME' })).body,
    );

    expect(toIncome).toMatchObject({ kind: 'INCOME', categoryId: null });

    const withCategory = ledgerEntrySchema.parse(
      (
        await s.patch(`/ledger-entries/${created.id}`, {
          kind: 'EXPENSE',
          categoryId: s.optionId('EXPENSE_CATEGORY', '식대'),
          amount: 9000,
        })
      ).body,
    );

    expect(withCategory).toMatchObject({ kind: 'EXPENSE', amount: 9000 });
    expect(withCategory.categoryId).toBe(s.optionId('EXPENSE_CATEGORY', '식대'));
    expect((await s.patch(`/ledger-entries/${created.id}`, {})).status).toBe(400);
  });

  it('지우면 목록과 합계에서 빠지고 활동 기록에 남는다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const created = ledgerEntrySchema.parse(
      (await s.entry(projectId, { amount: 30000, content: '용접봉' })).body,
    );

    expect((await s.del(`/ledger-entries/${created.id}`)).status).toBe(200);
    expect((await s.del(`/ledger-entries/${created.id}`)).status).toBe(404);
    expect(
      ledgerEntriesResponseSchema.parse((await s.get(`/projects/${projectId}/ledger-entries`)).body)
        .items,
    ).toHaveLength(0);
    expect(
      ledgerSummarySchema.parse((await s.get(`/projects/${projectId}/ledger-summary`)).body)
        .expenseTotal,
    ).toBe(0);

    const { rows } = await db.ownerPool.query<{ action: string; detail: { amount: number } }>(
      `SELECT action, detail FROM audit_logs WHERE action = 'LEDGER_ENTRY_DELETED' AND project_id = $1`,
      [projectId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]!.detail.amount).toBe(30000);
  });

  it('같은 멱등 키로 다시 보낸 등록은 한 번만 저장하고 같은 응답을 돌려준다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const send = (key: string, amount: number) =>
      s
        .post(`/projects/${projectId}/ledger-entries`, {
          entryDate: '2026-10-05',
          kind: 'EXPENSE',
          amount,
        })
        .set('Idempotency-Key', key);
    const first = await send('retry-key-0001', 5000);
    const again = await send('retry-key-0001', 5000);

    expect(first.status).toBe(201);
    expect(again.status).toBe(201);
    expect(again.headers['idempotent-replayed']).toBe('true');
    expect(again.body.id).toBe(first.body.id);
    expect(
      ledgerEntriesResponseSchema.parse((await s.get(`/projects/${projectId}/ledger-entries`)).body)
        .items,
    ).toHaveLength(1);

    // 같은 키에 다른 내용은 거부, 실패한 요청은 같은 키로 재시도 가능
    expect((await send('retry-key-0001', 9000)).status).toBe(422);
    expect((await send('retry-key-0002', 0)).status).toBe(400);
    expect((await send('retry-key-0002', 7000)).status).toBe(201);
  });

  it('페이지를 넘겨 가며 볼 수 있다', async () => {
    const s = await setup();
    const projectId = await s.project();

    for (const day of ['01', '02', '03']) {
      await s.entry(projectId, { entryDate: `2026-10-${day}` });
    }

    const first = ledgerEntriesResponseSchema.parse(
      (await s.get(`/projects/${projectId}/ledger-entries?limit=2`)).body,
    );

    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    const second = ledgerEntriesResponseSchema.parse(
      (await s.get(`/projects/${projectId}/ledger-entries?limit=2&cursor=${first.nextCursor}`))
        .body,
    );

    expect(second.items.map((item) => item.entryDate)).toEqual(['2026-10-01']);
    expect(second.nextCursor).toBeNull();
  });
});
