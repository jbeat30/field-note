import { auditLogsResponseSchema, optionsResponseSchema, type AuditLog } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createAuditService } from '../audit/auditService';
import { createOptionService } from '../company/optionService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createDocumentService } from '../document/documentService';
import { createEmployeeService } from '../employee/employeeService';
import { createFileService } from '../file/fileService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createMaterialService } from '../material/materialService';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createProjectService } from '../project/projectService';
import { createMemoryQueue } from '../queue/jobQueue';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';
import { createMemoryStorage } from '../storage/objectStorage';
import { createWorkLogService } from '../workLog/workLogService';

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

const app = () => {
  const storage = createMemoryStorage().storage;

  return createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    options: createOptionService(db.app),
    employees: createEmployeeService(db.app, () => NOW),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => NOW),
    assignments: createAssignmentService(db.app),
    workLogs: createWorkLogService(db.app, () => NOW),
    files: createFileService({
      app: db.app,
      storage,
      queue: createMemoryQueue().queue,
      now: () => NOW,
    }),
    materials: createMaterialService(db.app, () => NOW),
    documents: createDocumentService(db.app, storage, () => NOW),
    audit: createAuditService(db.app, () => NOW),
    appOrigin: 'http://localhost:5173',
  });
};

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `활동기록회사${sequence}`,
    adminName: '활동관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `act-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `act${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const setup = async () => {
  const instance = app();
  const cookie = await signedUp(instance);
  const send = (method: 'post' | 'put' | 'patch' | 'delete', path: string, body?: object) => {
    const agent = request(instance);
    const req = agent[method](`/api/v1${path}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie);

    return body ? req.send(body) : req;
  };
  const get = (path: string) => request(instance).get(`/api/v1${path}`).set('Cookie', cookie);
  const id = async (path: string, body: object) =>
    (await send('post', path, body)).body.id as string;
  const clientId = await id('/partners', { kind: 'CLIENT', name: '가나다건설' });
  const managerId = await id('/employees', { name: '박소장' });
  const worker = await id('/employees', { name: '김작업' });
  const category = optionsResponseSchema
    .parse((await get('/company/options')).body)
    .items.find((item) => item.kind === 'WORK_CATEGORY')!.id;
  const project = await id('/projects', {
    name: 'A동 판금 공사',
    siteName: 'A동 현장',
    clientId,
    managerId,
    contractDate: '2026-08-01',
    plannedStart: '2026-09-01',
    plannedEnd: '2026-12-31',
  });

  await send('post', `/projects/${project}/status`, {
    toStatus: 'IN_PROGRESS',
    effectiveOn: '2026-09-01',
  });

  const logs = async (query = ''): Promise<AuditLog[]> =>
    auditLogsResponseSchema.parse((await get(`/audit-logs${query}`)).body).items;

  return { instance, send, get, id, logs, project, worker, category, managerId };
};

describe('활동 기록', () => {
  it('프로젝트 정보 수정과 상태 변경이 바뀐 내용과 함께 남는다', async () => {
    const { send, logs, project } = await setup();

    await send('patch', `/projects/${project}`, {
      name: 'A동 외장 판금 공사',
      siteName: 'A동 현장',
    });
    await send('post', `/projects/${project}/status`, {
      toStatus: 'SUSPENDED',
      effectiveOn: '2026-10-05',
      reason: '우천 장기화',
    });

    const items = await logs();
    const statuses = items.filter((item) => item.action === 'PROJECT_STATUS_CHANGED');
    const update = items.find((item) => item.action === 'PROJECT_UPDATED')!;

    // 처음 생성 시의 진행 전환도 남아 있고 가장 최근은 중단
    expect(statuses[0]).toMatchObject({
      kind: 'UPDATE',
      projectId: project,
      projectName: 'A동 외장 판금 공사',
      summary: '진행 → 중단',
      changes: [
        { label: '상태', before: '진행', after: '중단' },
        { label: '사유', before: null, after: '우천 장기화' },
      ],
    });
    // 같은 값으로 보낸 항목(현장명)은 제외하고 바뀐 항목만 전·후로 기록
    expect(update.changes).toEqual([
      { label: '프로젝트명', before: 'A동 판금 공사', after: 'A동 외장 판금 공사' },
    ]);
    expect(update.summary).toBe('프로젝트명');
  });

  it('직원 정보 수정은 바뀐 항목을 남기되 개인정보 값은 복사하지 않는다', async () => {
    const { send, logs, worker } = await setup();

    await send('patch', `/employees/${worker}`, { title: '반장', phone: '010-1234-5678' });

    const item = (await logs()).find((log) => log.action === 'EMPLOYEE_UPDATED')!;

    expect(item).toMatchObject({ kind: 'UPDATE', targetId: worker, targetName: '김작업' });
    expect(item.changes).toEqual([
      { label: '직책', before: null, after: '반장' },
      { label: '연락처', before: null, after: null },
    ]);
    expect(JSON.stringify(item)).not.toContain('1234');
  });

  it('저장된 작업 내역은 첫 저장과 수정을 구분해 남기고 임시 저장은 남기지 않는다', async () => {
    const { send, logs, project, worker, category } = await setup();
    const entries = (minutes: number) => [{ employeeId: worker, categoryId: category, minutes }];
    const path = `/projects/${project}/work-logs/2026-10-05`;

    await send('put', path, { status: 'DRAFT', content: '준비', entries: entries(240) });
    expect((await logs()).filter((log) => log.action.startsWith('WORK_LOG'))).toEqual([]);

    const saved = await send('put', path, {
      status: 'SAVED',
      content: '3층 패널 설치',
      addMissingAssignments: true,
      entries: entries(480),
      expectedVersion: 1,
    });

    expect(saved.status).toBe(200);

    await send('put', path, {
      status: 'SAVED',
      content: '3층 패널 설치',
      addMissingAssignments: true,
      entries: entries(600),
      expectedVersion: saved.body.version,
    });

    const items = (await logs()).filter((log) => log.action.startsWith('WORK_LOG'));

    expect(items.map((item) => [item.action, item.kind])).toEqual([
      ['WORK_LOG_UPDATED', 'UPDATE'],
      ['WORK_LOG_SAVED', 'SAVE'],
    ]);
    expect(items[0]).toMatchObject({ projectId: project, summary: '2026-10-05 · 10시간 · 1명' });
    expect(items[0]!.changes).toEqual([{ label: '작업 시간', before: '8시간', after: '10시간' }]);
    expect(items[1]!.changes).toEqual([]);
  });

  it('자재 기록·문서를 지우면 삭제 기록이 남고 프로젝트로 거를 수 있다', async () => {
    const { send, get, logs, id, project } = await setup();
    const material = await id('/materials', { name: '아연도강판', spec: '1.0T', unit: '장' });
    const record = await id(`/projects/${project}/material-records`, {
      materialId: material,
      recordDate: '2026-10-05',
      kind: 'USED',
      quantity: 3,
    });
    const file = (
      await send('post', `/projects/${project}/files`, {
        name: '도면.pdf',
        contentType: 'application/pdf',
        purpose: 'DOCUMENT',
        size: 1000,
      })
    ).body.file.id as string;
    const document = await id(`/projects/${project}/documents`, {
      fileId: file,
      title: '1층 시공도',
      category: 'DRAWING',
    });

    expect((await send('delete', `/material-records/${record}`)).status).toBe(200);
    expect((await send('delete', `/documents/${document}`)).status).toBe(200);

    const deleted = await logs('?kind=DELETE');

    expect(deleted.map((item) => item.action)).toEqual([
      'DOCUMENT_DELETED',
      'MATERIAL_RECORD_DELETED',
    ]);
    expect(deleted[0]).toMatchObject({ summary: '1층 시공도', projectId: project });
    expect(deleted[1]).toMatchObject({
      summary: '아연도강판 (1.0T) · 2026-10-05 · 사용',
      projectId: project,
    });

    // 종류·프로젝트·행위 거르기
    expect((await logs(`?projectId=${project}`)).length).toBeGreaterThanOrEqual(2);
    expect(await logs('?projectId=0198d000-0000-7000-8000-00000000dead')).toEqual([]);
    expect(await logs('?kind=DELETE&action=PHOTO_DELETED')).toEqual([]);
    expect((await logs('?action=DOCUMENT_DELETED')).map((item) => item.kind)).toEqual(['DELETE']);
    expect((await get('/audit-logs?kind=BAD')).status).toBe(400);
  });

  it('다른 회사의 활동 기록은 보이지 않는다', async () => {
    const a = await setup();
    const b = await setup();

    await a.send('patch', `/projects/${a.project}`, { name: 'A사 프로젝트' });

    expect((await b.logs()).filter((item) => item.action === 'PROJECT_UPDATED')).toEqual([]);
    expect((await a.logs()).some((item) => item.action === 'PROJECT_UPDATED')).toBe(true);
  });
});
