import { storageUsageSchema } from '@field-note/shared';
import ExcelJS from 'exceljs';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { createCompanyDataService } from '../companyData/companyDataService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { markCompanyEmailsVerified } from '../db/testFixtures';
import { createEmployeeService } from '../employee/employeeService';
import { createFileService } from '../file/fileService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createLedgerService } from '../ledger/ledgerService';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createProjectService } from '../project/projectService';
import { createMemoryQueue } from '../queue/jobQueue';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';
import { createMemoryStorage } from '../storage/objectStorage';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

const NOW = new Date('2026-10-16T03:00:00Z');
const PASSWORD = 'Correct-horse-2026!';

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

let sequence = 0;

const setup = async () => {
  const accountService = createAccountService({ auth: db.auth, app: db.app });
  const instance = createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService,
    employees: createEmployeeService(db.app, () => NOW),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => NOW),
    ledger: createLedgerService(db.app, () => NOW),
    files: createFileService({
      app: db.app,
      storage: createMemoryStorage().storage,
      queue: createMemoryQueue().queue,
      now: () => NOW,
    }),
    // 업로드 신청 시각은 DB 시계로 기록되므로 서비스도 실제 시각 사용
    companyData: createCompanyDataService({ auth: db.auth, app: db.app, accountService }),
    appOrigin: 'http://localhost:5173',
  });

  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `데이터회사${sequence}`,
    adminName: '데이터관리자',
    operator: 'test',
  });
  const signup = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `data-${sequence}`,
      password: PASSWORD,
      email: `data${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });
  await markCompanyEmailsVerified(db.ownerPool, invitation.companyId);
  const cookie = (signup.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
  const post = (path: string, body: object = {}) =>
    request(instance)
      .post(`/api/v1${path}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body);
  const get = (path: string) => request(instance).get(`/api/v1${path}`).set('Cookie', cookie);
  const clientId = (await post('/partners', { kind: 'CLIENT', name: '가나다건설' })).body.id;
  const managerId = (await post('/employees', { name: '박소장', phone: '010-1111-2222' })).body.id;
  const projectId = (
    await post('/projects', {
      name: 'A동 판금 공사',
      siteName: 'A동 현장',
      clientId,
      managerId,
      contractDate: '2026-09-01',
      plannedStart: '2026-10-01',
      plannedEnd: '2026-12-31',
    })
  ).body.id as string;
  const download = (body: object) =>
    post('/company/export', body)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

  return { instance, post, get, projectId, download, companyId: invitation.companyId };
};

describe('저장 용량 현황', () => {
  it('로그인 없이는 401, 파일이 없으면 사용량 0이고 한도는 5GB다', async () => {
    const { instance, get } = await setup();

    expect((await request(instance).get('/api/v1/company/storage')).status).toBe(401);
    expect(storageUsageSchema.parse((await get('/company/storage')).body)).toEqual({
      quotaBytes: 5_368_709_120,
      usedBytes: 0,
      stagedBytes: 0,
      stagedCount: 0,
      byPurpose: [],
      byProject: [],
    });
  });

  it('업로드 신청한 파일이 용도별·프로젝트별로 집계되고 큰 프로젝트가 먼저다', async () => {
    const { post, get, projectId } = await setup();

    for (const [name, size] of [
      ['a.jpg', 3000],
      ['b.jpg', 1000],
    ] as const) {
      await post(`/projects/${projectId}/files`, {
        name,
        contentType: 'image/jpeg',
        purpose: 'PHOTO',
        size,
      });
    }

    const usage = storageUsageSchema.parse((await get('/company/storage')).body);

    expect(usage.usedBytes).toBe(4000);
    expect(usage.stagedBytes).toBe(0);
    expect(usage.byPurpose).toEqual([{ purpose: 'PHOTO', bytes: 4000, count: 2 }]);
    expect(usage.byProject[0]).toMatchObject({
      projectId,
      name: 'A동 판금 공사',
      bytes: 4000,
      count: 2,
    });
  });
});

describe('저장 용량의 임시 파일', () => {
  it('폼에 연결되지 않은 임시 파일은 사용량에 포함되고 따로도 집계된다', async () => {
    const { post, get, projectId, companyId } = await setup();

    await post(`/projects/${projectId}/files`, {
      name: 'a.jpg',
      contentType: 'image/jpeg',
      purpose: 'PHOTO',
      size: 3000,
    });
    await db.owner.storedFile.updateMany({ where: { companyId }, data: { status: 'STAGED' } });

    const usage = storageUsageSchema.parse((await get('/company/storage')).body);

    expect(usage).toMatchObject({ usedBytes: 3000, stagedBytes: 3000, stagedCount: 1 });
  });
});

describe('전체 데이터 내보내기', () => {
  it('비밀번호가 없거나 틀리면 거부하고 맞으면 시트별 엑셀을 내려주며 기록이 남는다', async () => {
    const { instance, post, download, projectId, companyId } = await setup();

    await post(`/projects/${projectId}/ledger-entries`, {
      entryDate: '2026-10-05',
      kind: 'EXPENSE',
      amount: 12000,
      content: '실리콘',
    });

    expect(
      (
        await request(instance)
          .post('/api/v1/company/export')
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ currentPassword: PASSWORD })
      ).status,
    ).toBe(401);
    expect((await post('/company/export', {})).status).toBe(400);
    const wrong = await post('/company/export', { currentPassword: 'wrong-password-1' });

    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('CURRENT_PASSWORD_INVALID');

    const res = await download({ currentPassword: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(
      decodeURIComponent(String(res.headers['content-disposition']).split("UTF-8''")[1]!),
    ).toMatch(/^전체데이터_\d{4}-\d{2}-\d{2}\.xlsx$/);

    const book = new ExcelJS.Workbook();

    await book.xlsx.load(res.body as never);

    const rowsOf = (name: string) =>
      book
        .getWorksheet(name)!
        .getSheetValues()
        .slice(1)
        .map((row) => (row as unknown[]).slice(1));

    expect(book.worksheets.map((sheet) => sheet.name)).toEqual([
      '안내',
      '프로젝트',
      '직원',
      '명부',
      '투입',
      '작업 내역',
      '자재 기록',
      '지출·수입',
      '변경·추가 작업',
      '보증·보수',
      '메모',
      '직원 단가',
      '파일 목록',
    ]);
    expect(rowsOf('프로젝트')[1]).toEqual(
      expect.arrayContaining(['A동 판금 공사', '가나다건설', '박소장']),
    );
    expect(rowsOf('직원')[1]).toEqual(expect.arrayContaining(['박소장', '010-1111-2222']));
    expect(rowsOf('지출·수입')[1]).toEqual(expect.arrayContaining(['지출', 12000, '실리콘']));

    const { rows } = await db.ownerPool.query(
      `SELECT detail FROM audit_logs WHERE action = 'REPORT_EXPORTED' AND detail->>'kind' = 'COMPANY_DATA_XLSX' AND company_id = $1`,
      [companyId],
    );

    // 틀린 비밀번호 시도는 기록되지 않고 성공한 내보내기만 한 건 기록
    expect(rows).toHaveLength(1);
  });
});
