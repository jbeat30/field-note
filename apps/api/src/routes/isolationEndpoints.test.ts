import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  employeesResponseSchema,
  optionsResponseSchema,
  partnersResponseSchema,
  projectsResponseSchema,
  searchResponseSchema,
  workLogsResponseSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createEmployeeService } from '../employee/employeeService';
import { createFileService } from '../file/fileService';
import { createDocumentService } from '../document/documentService';
import { createMaterialService } from '../material/materialService';
import { createMemoService } from '../memo/memoService';
import { createReportService } from '../report/reportService';
import { createSearchService } from '../search/searchService';
import { createPhotoService } from '../photo/photoService';
import { createMemoryQueue } from '../queue/jobQueue';
import { createMemoryStorage } from '../storage/objectStorage';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createProjectService } from '../project/projectService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';
import { withCompany } from '../db/withCompany';
import { createWorkLogService } from '../workLog/workLogService';

// 1단계(직원·프로젝트·투입·일지) 모든 엔드포인트의 회사 격리를 HTTP 수준에서 확인한다 (기술 기획서 §5.1)
// 회사 A의 데이터를 만들고, 회사 B의 세션으로 A의 ID를 쓰는 모든 경로를 호출해 막히는지 본다
let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

const NOW = new Date('2026-10-07T03:00:00Z');
const DAY = '2026-10-05';

beforeAll(async () => {
  db = await startTestDatabase();

  const { rows } = await db.ownerPool.query<{ id: string }>(
    `INSERT INTO legal_documents (type, version, effective_at, content_hash, is_required) VALUES
      ('TERMS_OF_SERVICE', '2026-10-01', '2026-10-01', 'h1', true),
      ('PRIVACY_POLICY', '2026-10-01', '2026-10-01', 'h2', true)
     RETURNING id`,
  );

  documentIds = rows.map((row) => row.id);
  app = instance();
});

afterAll(async () => {
  await db.stop();
});

const instance = () =>
  createApp({
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
      storage: createMemoryStorage().storage,
      queue: createMemoryQueue().queue,
      now: () => NOW,
    }),
    photos: createPhotoService(db.app, createMemoryStorage().storage, () => NOW),
    memos: createMemoService(db.app, () => NOW),
    materials: createMaterialService(db.app, () => NOW),
    search: createSearchService(db.app),
    reports: createReportService(db.app, createMemoryStorage().storage, () => NOW),
    documents: createDocumentService(db.app, createMemoryStorage().storage, () => NOW),
    appOrigin: 'http://localhost:5173',
  });

let app: ReturnType<typeof instance>;
let sequence = 0;

const signUp = async () => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `격리회사${sequence}`,
    adminName: '격리관리자',
    operator: 'test',
  });
  const res = await request(app)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `iso-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `iso${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

const client = (cookie: string) => {
  const call = (method: Method, path: string, body?: object) => {
    const req = request(app)[method](`/api/v1${path}`).set('Cookie', cookie);

    return method === 'get' ? req : req.set(CSRF_HEADER, CSRF_HEADER_VALUE).send(body ?? {});
  };

  return {
    call,
    id: async (path: string, body: object) => (await call('post', path, body)).body.id as string,
  };
};

const FILE_REQUEST = { name: '현장.jpg', contentType: 'image/jpeg', purpose: 'PHOTO', size: 1000 };

// 회사 A: 거래처·직원·프로젝트·투입·일지·선택 목록 항목을 한 벌씩
const buildCompany = async () => {
  const cookie = await signUp();
  const c = client(cookie);
  const clientId = await c.id('/partners', { kind: 'CLIENT', name: '가나다건설' });
  const managerId = await c.id('/employees', { name: '박소장' });
  const worker = await c.id('/employees', { name: '김작업' });
  const options = optionsResponseSchema.parse((await c.call('get', '/company/options')).body).items;
  const category = options.find((item) => item.kind === 'WORK_CATEGORY')!.id;
  const jobType = options.find((item) => item.kind === 'JOB_TYPE')!.id;
  const projectId = await c.id('/projects', {
    name: 'A동 판금 공사',
    siteName: 'A동 현장',
    clientId,
    managerId,
    contractDate: '2026-09-01',
    plannedStart: '2026-10-01',
    plannedEnd: '2026-12-31',
  });

  await c.call('post', `/projects/${projectId}/status`, {
    toStatus: 'IN_PROGRESS',
    effectiveOn: '2026-10-01',
  });

  const assignment = await c.id(`/projects/${projectId}/assignments`, {
    employeeId: worker,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    plannedMinutes: 4800,
  });

  await c.call('put', `/projects/${projectId}/work-logs/${DAY}`, {
    status: 'SAVED',
    content: '회사 A의 일지',
    entries: [{ employeeId: worker, categoryId: category, minutes: 480 }],
  });

  // 수정 이력·기간 변경 이력도 한 건씩 만든다
  await c.call('put', `/projects/${projectId}/work-logs/${DAY}`, {
    status: 'SAVED',
    content: '회사 A의 일지 (수정)',
    expectedVersion: 1,
    entries: [{ employeeId: worker, categoryId: category, minutes: 480 }],
  });
  await c.call('patch', `/projects/${projectId}`, {
    plannedEnd: '2027-01-31',
    periodChangeReason: '기간 연장',
  });

  // 업로드를 신청해 둔 파일 한 건 (검사 전 상태여도 다른 회사에는 보이지 않아야 함)
  const fileId = (await c.call('post', `/projects/${projectId}/files`, FILE_REQUEST)).body.file
    .id as string;
  const photoId = await c.id(`/projects/${projectId}/photos`, { fileId });
  const memoId = await c.id('/memos', { content: '회사 A의 메모', projectId });
  // 문서용 파일을 올려 신청해 두고(검사 전이어도 됨) 민감 문서를 한 건 만든다
  const docFileId = (
    await c.call('post', `/projects/${projectId}/files`, {
      name: '계약서.pdf',
      contentType: 'application/pdf',
      purpose: 'DOCUMENT',
      size: 1000,
    })
  ).body.file.id as string;
  const documentId = await c.id(`/projects/${projectId}/documents`, {
    fileId: docFileId,
    title: '회사 A의 계약서',
    category: 'CONTRACT',
  });
  const materialId = await c.id('/materials', { name: '회사 A의 자재', unit: '장' });
  const materialRecordId = await c.id(`/projects/${projectId}/material-records`, {
    materialId,
    recordDate: '2026-10-05',
    kind: 'RECEIVED',
    quantity: 10,
  });

  return {
    cookie,
    c,
    clientId,
    managerId,
    worker,
    category,
    jobType,
    projectId,
    assignment,
    fileId,
    photoId,
    memoId,
    materialId,
    materialRecordId,
    docFileId,
    documentId,
  };
};

// B에게 A의 ID로 접근하는 요청 전부. 하나라도 성공하면 격리가 깨진 것이다
const attacks = (a: Awaited<ReturnType<typeof buildCompany>>) =>
  [
    ['GET /employees/{id}', 'get', `/employees/${a.worker}`],
    ['PATCH /employees/{id}', 'patch', `/employees/${a.worker}`, { name: '침투' }],
    ['GET /employees/{id}/work-history', 'get', `/employees/${a.worker}/work-history`],
    ['GET /partners/{id}', 'get', `/partners/${a.clientId}`],
    ['PATCH /partners/{id}', 'patch', `/partners/${a.clientId}`, { name: '침투' }],
    ['PATCH /company/options/{id}', 'patch', `/company/options/${a.category}`, { name: '침투' }],
    ['GET /projects/{id}', 'get', `/projects/${a.projectId}`],
    ['PATCH /projects/{id}', 'patch', `/projects/${a.projectId}`, { name: '침투' }],
    [
      'POST /projects/{id}/status',
      'post',
      `/projects/${a.projectId}/status`,
      { toStatus: 'SUSPENDED', effectiveOn: '2026-10-06' },
    ],
    ['GET /projects/{id}/status-history', 'get', `/projects/${a.projectId}/status-history`],
    ['GET /projects/{id}/period-history', 'get', `/projects/${a.projectId}/period-history`],
    ['GET /projects/{id}/assignments', 'get', `/projects/${a.projectId}/assignments`],
    [
      'POST /projects/{id}/assignments',
      'post',
      `/projects/${a.projectId}/assignments`,
      { employeeId: a.worker, startDate: '2026-11-01', endDate: '2026-11-05' },
    ],
    [
      'PATCH /projects/{id}/assignments/{assignmentId}',
      'patch',
      `/projects/${a.projectId}/assignments/${a.assignment}`,
      { endDate: '2026-10-10', reason: '침투' },
    ],
    [
      'POST /projects/{id}/assignments/{assignmentId}/cancel',
      'post',
      `/projects/${a.projectId}/assignments/${a.assignment}/cancel`,
      {},
    ],
    ['GET /projects/{id}/work-logs', 'get', `/projects/${a.projectId}/work-logs`],
    ['GET /projects/{id}/work-summary', 'get', `/projects/${a.projectId}/work-summary`],
    ['GET /projects/{id}/work-logs/{workDate}', 'get', `/projects/${a.projectId}/work-logs/${DAY}`],
    [
      'PUT /projects/{id}/work-logs/{workDate}',
      'put',
      `/projects/${a.projectId}/work-logs/${DAY}`,
      {
        status: 'SAVED',
        content: '침투',
        expectedVersion: 1,
        entries: [{ employeeId: a.worker, categoryId: a.category, minutes: 60 }],
      },
    ],
    [
      'GET /projects/{id}/work-logs/{workDate}/revisions',
      'get',
      `/projects/${a.projectId}/work-logs/${DAY}/revisions`,
    ],
    ['POST /projects/{projectId}/files', 'post', `/projects/${a.projectId}/files`, FILE_REQUEST],
    ['GET /files/{id}', 'get', `/files/${a.fileId}`],
    ['POST /files/{id}/complete', 'post', `/files/${a.fileId}/complete`],
    ['GET /files/{id}/url', 'get', `/files/${a.fileId}/url`],
    [
      'POST /projects/{projectId}/photos',
      'post',
      `/projects/${a.projectId}/photos`,
      { fileId: a.fileId },
    ],
    ['GET /projects/{projectId}/photos', 'get', `/projects/${a.projectId}/photos`],
    ['GET /photos/{id}', 'get', `/photos/${a.photoId}`],
    ['PATCH /photos/{id}', 'patch', `/photos/${a.photoId}`, { category: 'AFTER' }],
    ['DELETE /photos/{id}', 'delete', `/photos/${a.photoId}`],
    ['GET /memos/{id}', 'get', `/memos/${a.memoId}`],
    ['PATCH /memos/{id}', 'patch', `/memos/${a.memoId}`, { content: '침투' }],
    ['DELETE /memos/{id}', 'delete', `/memos/${a.memoId}`],
    [
      'GET /projects/{projectId}/daily-reports/{date}',
      'get',
      `/projects/${a.projectId}/daily-reports/${DAY}`,
    ],
    [
      'GET /projects/{projectId}/daily-reports.xlsx',
      'get',
      `/projects/${a.projectId}/daily-reports.xlsx?from=${DAY}&to=${DAY}`,
    ],
    ['GET /search', 'get', `/search?q=A&projectId=${a.projectId}`],
    ['GET /documents/{id}', 'get', `/documents/${a.documentId}`],
    ['PATCH /documents/{id}', 'patch', `/documents/${a.documentId}`, { title: '침투' }],
    ['DELETE /documents/{id}', 'delete', `/documents/${a.documentId}`],
    [
      'POST /documents/{id}/versions',
      'post',
      `/documents/${a.documentId}/versions`,
      { fileId: a.docFileId },
    ],
    [
      'GET /documents/{id}/versions/{versionNo}/url',
      'get',
      `/documents/${a.documentId}/versions/1/url`,
    ],
    ['GET /documents/{id}/access-logs', 'get', `/documents/${a.documentId}/access-logs`],
    [
      'POST /projects/{projectId}/documents',
      'post',
      `/projects/${a.projectId}/documents`,
      { fileId: a.docFileId, title: '침투' },
    ],
    ['GET /projects/{projectId}/documents', 'get', `/projects/${a.projectId}/documents`],
    ['PATCH /materials/{id}', 'patch', `/materials/${a.materialId}`, { name: '침투' }],
    [
      'POST /projects/{projectId}/material-records',
      'post',
      `/projects/${a.projectId}/material-records`,
      { materialId: a.materialId, recordDate: '2026-10-05', kind: 'USED', quantity: 1 },
    ],
    [
      'POST /projects/{projectId}/material-records/batch',
      'post',
      `/projects/${a.projectId}/material-records/batch`,
      {
        records: [
          { materialId: a.materialId, recordDate: '2026-10-05', kind: 'USED', quantity: 1 },
        ],
      },
    ],
    [
      'GET /projects/{projectId}/material-records',
      'get',
      `/projects/${a.projectId}/material-records`,
    ],
    [
      'GET /projects/{projectId}/material-balance',
      'get',
      `/projects/${a.projectId}/material-balance`,
    ],
    [
      'PATCH /material-records/{id}',
      'patch',
      `/material-records/${a.materialRecordId}`,
      { quantity: 99 },
    ],
    ['DELETE /material-records/{id}', 'delete', `/material-records/${a.materialRecordId}`],
  ] as const;

// 이 접두사 아래의 인증 필요 엔드포인트는 모두 위 목록에 있어야 한다 (새 엔드포인트가 격리 검사를 빠뜨리지 않게 함)
const ID_BOUND = [
  '/search',
  '/company/options/{id}',
  '/employees/{id}',
  '/files/{id}',
  '/documents/{id}',
  '/materials/{id}',
  '/material-records/{id}',
  '/memos/{id}',
  '/photos/{id}',
  '/partners/{id}',
  '/projects/{id}',
];
// ID 없이 목록·등록을 하는 엔드포인트는 아래 별도 시험에서 본다
const COLLECTIONS = [
  'GET /company/options',
  'POST /company/options',
  'PUT /company/options/order',
  'GET /employees',
  'POST /employees',
  'GET /materials',
  'POST /materials',
  'GET /memos',
  'POST /memos',
  'GET /memos/summary',
  'GET /partners',
  'POST /partners',
  'GET /projects',
  'POST /projects',
];

describe('회사 격리: 1단계 엔드포인트', () => {
  it('새로 만든 1단계 엔드포인트는 모두 격리 시험 목록에 있다', async () => {
    const spec = JSON.parse(
      readFileSync(join(__dirname, '../../../../packages/shared/openapi/openapi.json'), 'utf8'),
    ) as { paths: Record<string, Record<string, { security?: unknown }>> };
    const found = Object.entries(spec.paths).flatMap(([path, methods]) =>
      Object.entries(methods)
        .filter(([, operation]) => operation.security)
        .map(([method]) => `${method.toUpperCase()} ${path.replace('/api/v1', '')}`),
    );
    const stepOne = found.filter((entry) =>
      [
        ...ID_BOUND,
        '/company/options',
        '/employees',
        '/files',
        '/photos',
        '/partners',
        '/projects',
      ].some((prefix) => entry.split(' ')[1]!.startsWith(prefix.replace('/{id}', ''))),
    );
    const dummy = {
      cookie: '',
      c: client(''),
      clientId: '{id}',
      managerId: '{id}',
      worker: '{id}',
      category: '{id}',
      jobType: '{id}',
      projectId: '{id}',
      assignment: '{assignmentId}',
      fileId: '{id}',
      photoId: '{id}',
      memoId: '{id}',
      materialId: '{id}',
      materialRecordId: '{id}',
      docFileId: '{id}',
      documentId: '{id}',
    };
    const covered = new Set([...COLLECTIONS, ...attacks(dummy).map(([name]) => name)]);
    const missing = stepOne.filter((entry) => !covered.has(entry));

    expect(stepOne.length).toBeGreaterThan(25);

    expect(missing).toEqual([]);
  });

  it('회사 B는 회사 A의 ID로 조회·수정·전환·취소·저장 어느 것도 할 수 없다', async () => {
    const a = await buildCompany();
    const b = await buildCompany();
    const bClient = b.c;

    for (const [name, method, path, body] of attacks(a)) {
      const res = await bClient.call(method, path, body);

      // 없는 것처럼 보여야 한다 (존재 여부도 알려 주지 않음)
      expect({ name, status: res.status }).toEqual({ name, status: 404 });
    }

    // A의 데이터는 그대로
    const project = await a.c.call('get', `/projects/${a.projectId}`);
    const employee = await a.c.call('get', `/employees/${a.worker}`);
    const logs = workLogsResponseSchema.parse(
      (await a.c.call('get', `/projects/${a.projectId}/work-logs`)).body,
    );
    const log = await a.c.call('get', `/projects/${a.projectId}/work-logs/${DAY}`);
    const assignments = await a.c.call('get', `/projects/${a.projectId}/assignments`);

    expect(project.body).toMatchObject({ name: 'A동 판금 공사', status: 'IN_PROGRESS' });
    expect(employee.body.name).toBe('김작업');
    expect(logs.items).toHaveLength(1);
    expect(log.body).toMatchObject({ content: '회사 A의 일지 (수정)', version: 2 });
    expect(assignments.body.items[0].cancelledAt).toBeNull();
  });

  it('목록과 선택 목록에는 다른 회사 데이터가 섞여 나오지 않는다', async () => {
    const a = await buildCompany();
    const b = await buildCompany();
    const aOptionIds = new Set(
      optionsResponseSchema
        .parse((await a.c.call('get', '/company/options')).body)
        .items.map((item) => item.id),
    );
    const bOptions = optionsResponseSchema.parse((await b.c.call('get', '/company/options')).body);
    const employees = employeesResponseSchema.parse((await b.c.call('get', '/employees')).body);
    const partners = partnersResponseSchema.parse((await b.c.call('get', '/partners')).body);
    const projects = projectsResponseSchema.parse((await b.c.call('get', '/projects')).body);

    expect(bOptions.items.some((item) => aOptionIds.has(item.id))).toBe(false);
    expect(employees.items.map((item) => item.id)).not.toContain(a.worker);
    expect(partners.items.map((item) => item.id)).not.toContain(a.clientId);
    expect(projects.items.map((item) => item.id)).not.toContain(a.projectId);

    // 통합 검색에도 다른 회사 데이터가 섞이지 않음
    const hits = async (q: string) =>
      searchResponseSchema.parse(
        (await b.c.call('get', `/search?q=${encodeURIComponent(q)}&limit=20`)).body,
      );

    // 회사 A에만 있는 말을 직원·메모에 심어 둠 (회사마다 같은 더미 데이터가 있으므로 A 전용 값을 따로 만든다)
    await a.c.call('post', '/employees', { name: '에이전용직원' });
    await a.c.call('post', '/memos', { content: '에이전용메모키워드' });

    for (const term of ['에이전용직원', '에이전용메모키워드']) {
      const result = await hits(term);
      const total = [
        result.employees,
        result.memos,
        result.documents,
        result.workLogs,
        result.projects,
      ].flatMap((group) => group.items);

      expect({ term, total }).toEqual({ term, total: [] });
    }

    // A는 자기 데이터를 찾음 (검색 자체가 막힌 것이 아님)
    const own = searchResponseSchema.parse(
      (await a.c.call('get', `/search?q=${encodeURIComponent('에이전용직원')}`)).body,
    );

    expect(own.employees.items).toHaveLength(1);

    // 같은 이름의 프로젝트는 회사마다 따로: B의 검색에는 B의 프로젝트만
    const found = (await hits('판금')).projects.items.map((item) => item.id);

    expect(found).toContain(b.projectId);
    expect(found).not.toContain(a.projectId);
    expect(a.projectId).not.toBe(b.projectId);
  });

  it('자기 데이터를 만들 때 다른 회사의 ID를 끼워 넣어도 거부된다', async () => {
    const a = await buildCompany();
    const b = await buildCompany();
    const bOwn = {
      name: 'B동 공사',
      siteName: 'B동 현장',
      clientId: b.clientId,
      managerId: b.managerId,
      contractDate: '2026-09-01',
      plannedStart: '2026-10-01',
      plannedEnd: '2026-12-31',
    };
    const rejected: [string, number][] = [];
    const record = async (name: string, res: request.Response) => {
      rejected.push([name, res.status]);
    };

    await record(
      '프로젝트 고객',
      await b.c.call('post', '/projects', { ...bOwn, clientId: a.clientId }),
    );
    await record(
      '프로젝트 담당자',
      await b.c.call('post', '/projects', { ...bOwn, managerId: a.managerId }),
    );
    await record(
      '메모 프로젝트',
      await b.c.call('post', '/memos', { content: '침투', projectId: a.projectId }),
    );
    await record(
      '메모 연결',
      await b.c.call('patch', `/memos/${await b.c.id('/memos', { content: 'B 메모' })}`, {
        projectId: a.projectId,
      }),
    );
    const bProjectOwn = await b.c.id('/projects', bOwn);
    const bMaterial = await b.c.id('/materials', { name: 'B 자재', unit: '개' });
    const bRecord = {
      recordDate: '2026-10-05',
      kind: 'USED',
      quantity: 1,
    };

    await record(
      '문서 파일',
      await b.c.call('post', `/projects/${bProjectOwn}/documents`, {
        fileId: a.docFileId,
        title: '침투',
      }),
    );
    await record(
      '기록 자재',
      await b.c.call('post', `/projects/${bProjectOwn}/material-records`, {
        ...bRecord,
        materialId: a.materialId,
      }),
    );
    await record(
      '기록 작업 구분',
      await b.c.call('post', `/projects/${bProjectOwn}/material-records`, {
        ...bRecord,
        materialId: bMaterial,
        categoryId: a.category,
      }),
    );
    await record(
      '기록 업체',
      await b.c.call('post', `/projects/${bProjectOwn}/material-records`, {
        ...bRecord,
        materialId: bMaterial,
        partnerId: a.clientId,
      }),
    );
    await record(
      '직원 직종',
      await b.c.call('post', '/employees', { name: '침투', jobTypeId: a.jobType }),
    );
    await record(
      '옵션 순서',
      await b.c.call('put', '/company/options/order', {
        kind: 'WORK_CATEGORY',
        ids: [a.category],
      }),
    );

    // B의 정상 프로젝트에 A의 직원을 투입·일지에 넣기
    const bProject = await b.c.id('/projects', bOwn);

    await b.c.call('post', `/projects/${bProject}/status`, {
      toStatus: 'IN_PROGRESS',
      effectiveOn: '2026-10-01',
    });
    await record(
      '투입 직원',
      await b.c.call('post', `/projects/${bProject}/assignments`, {
        employeeId: a.worker,
        startDate: '2026-10-01',
        endDate: '2026-10-10',
      }),
    );
    await record(
      '일지 직원',
      await b.c.call('put', `/projects/${bProject}/work-logs/${DAY}`, {
        status: 'DRAFT',
        content: '',
        entries: [{ employeeId: a.worker, categoryId: b.category, minutes: 60 }],
      }),
    );
    await record(
      '일지 작업 구분',
      await b.c.call('put', `/projects/${bProject}/work-logs/${DAY}`, {
        status: 'DRAFT',
        content: '',
        entries: [{ employeeId: b.worker, categoryId: a.category, minutes: 60 }],
      }),
    );
    await record(
      '투입 확인으로 자동 추가',
      await b.c.call('put', `/projects/${bProject}/work-logs/${DAY}`, {
        status: 'SAVED',
        content: '침투',
        addMissingAssignments: true,
        entries: [{ employeeId: a.worker, categoryId: b.category, minutes: 60 }],
      }),
    );

    for (const [name, status] of rejected) {
      expect({ name, rejected: status >= 400 && status < 500 }).toEqual({ name, rejected: true });
    }

    // A의 직원에게 B의 투입·일지가 생기지 않았다
    const history = await a.c.call('get', `/employees/${a.worker}/work-history`);

    expect(history.body.projects).toHaveLength(1);
    expect(history.body.projects[0].projectId).toBe(a.projectId);
    expect((await b.c.call('get', `/projects/${bProject}/assignments`)).body.items).toHaveLength(0);
  });

  it('로그인하지 않으면 모든 1단계 엔드포인트가 401이다', async () => {
    const a = await buildCompany();

    for (const [name, method, path, body] of attacks(a)) {
      const req = request(app)[method](`/api/v1${path}`);
      const res =
        method === 'get'
          ? await req
          : await req.set(CSRF_HEADER, CSRF_HEADER_VALUE).send(body ?? {});

      expect({ name, status: res.status }).toEqual({ name, status: 401 });
    }
  });

  it('DB 수준에서도 회사 범위 테이블마다 다른 회사의 행이 보이지 않는다', async () => {
    const a = await buildCompany();
    const b = await buildCompany();
    const companyOf = async (projectId: string) =>
      (
        await db.ownerPool.query<{ company_id: string }>(
          'SELECT company_id FROM projects WHERE id = $1',
          [projectId],
        )
      ).rows[0]!.company_id;
    const [companyA, companyB] = [await companyOf(a.projectId), await companyOf(b.projectId)];
    const { rows: tables } = await db.ownerPool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'company_id'
          AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
          AND table_name NOT IN ('sessions', 'users', 'user_credentials', 'consents', 'invitations',
            'operator_actions', 'email_verifications', 'password_resets', 'social_accounts', 'company_closures')
        ORDER BY table_name`,
    );
    const seen: Record<string, { own: number; other: number }> = {};

    for (const { table_name: table } of tables) {
      // 테이블 이름은 information_schema에서 읽은 값이라 직접 끼워 넣어도 안전하다
      const [row] = await withCompany(db.app, companyA, (tx) =>
        tx.$queryRawUnsafe<{ own: bigint; other: bigint }[]>(
          `SELECT count(*) FILTER (WHERE company_id = $1::uuid) AS own,
                  count(*) FILTER (WHERE company_id <> $1::uuid) AS other FROM "${table}"`,
          companyA,
        ),
      );

      seen[table] = { own: Number(row!.own), other: Number(row!.other) };
    }

    expect(Object.entries(seen).filter(([, count]) => count.other > 0)).toEqual([]);

    // 1단계 데이터가 실제로 있는 테이블에서는 자기 회사 행은 보인다 (검사가 빈 테이블만 보고 통과하지 않게 함)
    for (const table of [
      'partners',
      'employees',
      'option_items',
      'projects',
      'project_status_changes',
      'project_period_changes',
      'project_assignments',
      'work_logs',
      'work_log_entries',
      'work_log_revisions',
    ]) {
      expect({ table, own: seen[table]?.own }).toEqual({ table, own: expect.any(Number) });
      expect(seen[table]!.own).toBeGreaterThan(0);
    }

    expect(companyB).not.toBe(companyA);
  });
});
