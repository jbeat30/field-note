import {
  optionsResponseSchema,
  projectCompletionSummarySchema,
  transitionNoticesSchema,
} from '@field-note/shared';
import ExcelJS from 'exceljs';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createChangeWorkService } from '../changeWork/changeWorkService';
import { createCompletionService } from '../completion/completionService';
import { createOptionService } from '../company/optionService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { documentCategoryIdOf, markCompanyEmailsVerified } from '../db/testFixtures';
import { createDocumentService } from '../document/documentService';
import { createEmployeeService } from '../employee/employeeService';
import { createFileService } from '../file/fileService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createMaterialService } from '../material/materialService';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createPhotoService } from '../photo/photoService';
import { createProgressService } from '../progress/progressService';
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
    photos: createPhotoService(db.app, storage, () => NOW),
    progress: createProgressService(db.app, () => NOW),
    changeWorks: createChangeWorkService(db.app, () => NOW),
    completion: createCompletionService(db.app, storage, () => NOW),
    appOrigin: 'http://localhost:5173',
  });
};

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `요약회사${sequence}`,
    adminName: '요약관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `sum-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `sum${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });
  await markCompanyEmailsVerified(db.ownerPool, invitation.companyId);

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const api = (instance: ReturnType<typeof app>, cookie: string) => {
  const send = (method: 'post' | 'put' | 'patch', path: string, body: object) =>
    (method === 'post'
      ? request(instance).post(`/api/v1${path}`)
      : method === 'put'
        ? request(instance).put(`/api/v1${path}`)
        : request(instance).patch(`/api/v1${path}`)
    )
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body);
  const get = (path: string) => request(instance).get(`/api/v1${path}`).set('Cookie', cookie);

  return {
    get,
    send,
    id: async (path: string, body: object) => (await send('post', path, body)).body.id as string,
    notices: (projectId: string, to: string) =>
      get(`/projects/${projectId}/transition-notices?to=${to}`),
    summary: (projectId: string) => get(`/projects/${projectId}/summary`),
    downloadSummary: (projectId: string) =>
      get(`/projects/${projectId}/summary.xlsx`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];

          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        }),
    saveLog: (projectId: string, date: string, body: object) =>
      send('put', `/projects/${projectId}/work-logs/${date}`, body),
    updateDocument: (id: string, body: object) => send('patch', `/documents/${id}`, body),
    updatePhoto: (id: string, body: object) => send('patch', `/photos/${id}`, body),
    makeDocument: async (
      projectId: string,
      title: string,
      category: string,
      extra: object = {},
    ) => {
      const fileId = (
        await send('post', `/projects/${projectId}/files`, {
          name: `${title}.pdf`,
          contentType: 'application/pdf',
          purpose: 'DOCUMENT',
          size: 1000,
        })
      ).body.file.id as string;

      return (
        await send('post', `/projects/${projectId}/documents`, {
          fileId,
          title,
          categoryId: documentCategoryIdOf((await get('/company/options')).body, category),
          ...extra,
        })
      ).body.id as string;
    },
  };
};

// 진행 중 프로젝트(2026-09-01 ~ 2026-12-31)와 직원 두 명(계획 공수 김작업 10일)
const setup = async (plannedEnd = '2026-12-31') => {
  const instance = app();
  const cookie = await signedUp(instance);
  const client = api(instance, cookie);
  const clientId = await client.id('/partners', { kind: 'CLIENT', name: '가나다건설' });
  const managerId = await client.id('/employees', { name: '박소장' });
  const worker = await client.id('/employees', { name: '김작업' });
  const worker2 = await client.id('/employees', { name: '이작업' });
  const options = optionsResponseSchema.parse((await client.get('/company/options')).body).items;
  const categories = options.filter((item) => item.kind === 'WORK_CATEGORY');
  const project = await client.id('/projects', {
    name: 'A동 판금 공사',
    siteName: 'A동 현장',
    siteAddress: '서울시 중구',
    clientId,
    managerId,
    contractDate: '2026-08-01',
    plannedStart: '2026-09-01',
    plannedEnd,
  });

  await client.id(`/projects/${project}/status`, {
    toStatus: 'IN_PROGRESS',
    effectiveOn: '2026-09-01',
  });
  await client.id(`/projects/${project}/assignments`, {
    employeeId: worker,
    startDate: '2026-09-01',
    endDate: plannedEnd,
    plannedMinutes: 10 * 480,
  });
  await client.id(`/projects/${project}/assignments`, {
    employeeId: worker2,
    startDate: '2026-09-01',
    endDate: plannedEnd,
  });

  return { instance, client, project, worker, worker2, categories, managerId };
};

const names = (items: { type: string }[]) => items.map((item) => item.type);

describe('상태 전환 안내', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const { instance, project } = await setup();

    expect(
      (await request(instance).get(`/api/v1/projects/${project}/transition-notices?to=COMPLETED`))
        .status,
    ).toBe(401);
    expect((await request(instance).get(`/api/v1/projects/${project}/summary`)).status).toBe(401);
  });

  it('기록이 깨끗하면 완료 전에도 진행률 기록 요청만 나온다', async () => {
    const { client, project } = await setup();
    const notices = transitionNoticesSchema.parse(
      (await client.notices(project, 'COMPLETED')).body,
    );

    expect(notices.items).toEqual([{ type: 'PROGRESS_BELOW_100', percent: null }]);

    await client.send('post', `/projects/${project}/progress`, { percent: 100 });
    expect(
      transitionNoticesSchema.parse((await client.notices(project, 'COMPLETED')).body).items,
    ).toEqual([]);
  });

  it('임시 저장 작업 내역·진행률·남은 자재·협의 중 변경 작업을 모두 알린다', async () => {
    const { client, project, worker, categories } = await setup();
    const category = categories[0]!.id;
    const entries = [{ employeeId: worker, categoryId: category, minutes: 480 }];

    await client.saveLog(project, '2026-10-05', { status: 'SAVED', content: '일반', entries });
    await client.saveLog(project, '2026-10-06', { status: 'DRAFT', content: '임시', entries });
    await client.saveLog(project, '2026-10-07', { status: 'DRAFT', content: '임시2', entries });
    await client.send('post', `/projects/${project}/progress`, { percent: 85 });

    const duct = await client.id('/materials', { name: '덕트', unit: '장' });
    const bolt = await client.id('/materials', { name: '볼트', unit: '개' });
    const record = (materialId: string, kind: string, quantity: number) =>
      client.send('post', `/projects/${project}/material-records`, {
        materialId,
        recordDate: '2026-10-05',
        kind,
        quantity,
      });

    await record(duct, 'RECEIVED', 100);
    await record(duct, 'USED', 85);
    // 잔량이 0이면 안내 제외
    await record(bolt, 'RECEIVED', 10);
    await record(bolt, 'USED', 10);
    await client.send('post', `/projects/${project}/change-works`, {
      requester: '고객',
      content: '협의 중 변경',
    });

    const notices = transitionNoticesSchema.parse(
      (await client.notices(project, 'COMPLETED')).body,
    );

    expect(names(notices.items)).toEqual([
      'DRAFT_LOGS',
      'PROGRESS_BELOW_100',
      'REMAINING_MATERIALS',
      'NEGOTIATING_CHANGES',
    ]);
    expect(notices.items[0]).toEqual({ type: 'DRAFT_LOGS', count: 2 });
    expect(notices.items[1]).toEqual({ type: 'PROGRESS_BELOW_100', percent: 85 });
    expect(notices.items[2]).toMatchObject({
      items: [{ name: '덕트', unit: '장', remaining: 15 }],
    });
    expect(notices.items[3]).toEqual({ type: 'NEGOTIATING_CHANGES', count: 1 });
  });

  it('중단 뒤 재개는 종료 예정일이 지났을 때만 기간 연장을 알린다', async () => {
    const late = await setup('2026-10-05');

    await late.client.send('post', `/projects/${late.project}/status`, {
      toStatus: 'SUSPENDED',
      reason: '자재 지연',
    });

    expect(
      transitionNoticesSchema.parse((await late.client.notices(late.project, 'IN_PROGRESS')).body)
        .items,
    ).toEqual([{ type: 'PERIOD_OVER', plannedEnd: '2026-10-05' }]);

    const ok = await setup();

    await ok.client.send('post', `/projects/${ok.project}/status`, {
      toStatus: 'SUSPENDED',
      reason: '자재 지연',
    });
    expect(
      transitionNoticesSchema.parse((await ok.client.notices(ok.project, 'IN_PROGRESS')).body)
        .items,
    ).toEqual([]);
  });

  it('안내가 없는 전환은 빈 목록이고 잘못된 목표 상태·없는 프로젝트는 거부한다', async () => {
    const { client, project } = await setup();

    expect(
      transitionNoticesSchema.parse((await client.notices(project, 'SUSPENDED')).body).items,
    ).toEqual([]);
    expect((await client.notices(project, 'NOPE')).status).toBe(400);
    expect((await client.get(`/projects/${project}/transition-notices`)).status).toBe(400);
    expect((await client.notices('0198d000-0000-7000-8000-00000000dead', 'COMPLETED')).status).toBe(
      404,
    );
  });
});

describe('프로젝트 요약', () => {
  it('없는 프로젝트는 404다', async () => {
    const { client } = await setup();

    expect((await client.summary('0198d000-0000-7000-8000-00000000dead')).status).toBe(404);
  });

  it('기록이 없어도 기본정보와 빈 집계로 요약이 만들어진다', async () => {
    const { client, project } = await setup();
    const summary = projectCompletionSummarySchema.parse((await client.summary(project)).body);

    expect(summary).toMatchObject({
      generatedOn: '2026-10-11',
      project: {
        name: 'A동 판금 공사',
        status: 'IN_PROGRESS',
        clientName: '가나다건설',
        managerName: '박소장',
        siteAddress: '서울시 중구',
        plannedStart: '2026-09-01',
        actualStart: '2026-09-01',
        actualEnd: null,
      },
      progressPercent: null,
      work: {
        totalMinutes: 0,
        plannedMinutes: 4800,
        workedDays: 0,
        byEmployee: [],
        byCategory: [],
      },
      materials: [],
      changeWorks: { items: [], minutes: 0, workLogCount: 0 },
      afterService: { minutes: 0, workLogCount: 0 },
      photos: { total: 0, items: [] },
      documents: { sensitiveExcluded: 0, items: [] },
    });
    expect(summary.companyName).toMatch(/^요약회사/);
  });

  it('공수는 저장된 작업 내역만 직원별·작업 구분별로 합산하고 변경·사후 표시를 따로 센다', async () => {
    const { client, project, worker, worker2, categories } = await setup();
    const [a, b] = categories;
    const log = (date: string, entries: object[], extra: object = {}) =>
      client.saveLog(project, date, {
        status: 'SAVED',
        content: `작업 ${date}`,
        entries,
        ...extra,
      });

    await log('2026-10-05', [
      { employeeId: worker, categoryId: a!.id, minutes: 480 },
      { employeeId: worker2, categoryId: b!.id, minutes: 240 },
    ]);
    await log('2026-10-06', [{ employeeId: worker, categoryId: a!.id, minutes: 480 }], {
      isChange: true,
    });
    await log('2026-10-07', [{ employeeId: worker2, categoryId: b!.id, minutes: 120 }], {
      isAfterService: true,
    });
    // 임시 저장은 제외
    await log('2026-10-08', [{ employeeId: worker, categoryId: a!.id, minutes: 480 }], {
      status: 'DRAFT',
    });

    const { work, changeWorks, afterService } = projectCompletionSummarySchema.parse(
      (await client.summary(project)).body,
    );

    expect(work).toMatchObject({ totalMinutes: 1320, workedDays: 3, savedLogCount: 3 });
    expect(work.byEmployee).toEqual([
      { employeeId: worker, name: '김작업', workedDays: 2, minutes: 960 },
      { employeeId: worker2, name: '이작업', workedDays: 2, minutes: 360 },
    ]);
    expect(work.byCategory.map((row) => row.minutes)).toEqual([960, 360]);
    expect(changeWorks).toMatchObject({ minutes: 480, workLogCount: 1 });
    expect(afterService).toEqual({ minutes: 120, workLogCount: 1 });
  });

  it('요약을 엑셀로 내려받으면 시트별로 같은 내용이 들어가고 내보낸 기록이 남는다', async () => {
    const { client, project, worker, categories } = await setup();

    await client.saveLog(project, '2026-10-05', {
      status: 'SAVED',
      content: '작업',
      entries: [{ employeeId: worker, categoryId: categories[0]!.id, minutes: 480 }],
    });

    const res = await client.downloadSummary(project);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(
      decodeURIComponent(String(res.headers['content-disposition']).split("UTF-8''")[1]!),
    ).toMatch(/^프로젝트요약_\d{4}-\d{3}\.xlsx$/);

    const book = new ExcelJS.Workbook();

    await book.xlsx.load(res.body as never);

    const rowsOf = (name: string) =>
      book
        .getWorksheet(name)!
        .getSheetValues()
        .slice(1)
        .map((row) => (row as unknown[]).slice(1));

    expect(book.worksheets.map((sheet) => sheet.name)).toEqual([
      '요약',
      '인원별 공수',
      '작업 구분별 공수',
      '쓴 자재',
      '변경·추가 작업',
    ]);
    expect(rowsOf('인원별 공수')).toEqual([
      ['이름', '일한 날 수', '공수 (MD)'],
      ['김작업', 1, 1],
    ]);
    expect(rowsOf('요약')).toContainEqual(['총 공수 (MD)', 1]);

    const { rows } = await db.ownerPool.query(
      `SELECT detail, project_id FROM audit_logs WHERE action = 'REPORT_EXPORTED' AND detail->>'kind' = 'PROJECT_SUMMARY_XLSX'`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].project_id).toBe(project);
  });

  it('요약 엑셀은 로그인 없이는 401, 없는 프로젝트는 404다', async () => {
    const { instance, client } = await setup();

    expect(
      (
        await request(instance).get(
          '/api/v1/projects/0198d000-0000-7000-8000-00000000dead/summary.xlsx',
        )
      ).status,
    ).toBe(401);
    expect((await client.downloadSummary('0198d000-0000-7000-8000-00000000dead')).status).toBe(404);
  });

  it('자재 현황과 변경·추가 작업 목록, 최신 진행률이 들어간다', async () => {
    const { client, project } = await setup();
    const duct = await client.id('/materials', { name: '덕트', unit: '장' });
    const record = (kind: string, quantity: number) =>
      client.send('post', `/projects/${project}/material-records`, {
        materialId: duct,
        recordDate: '2026-10-05',
        kind,
        quantity,
      });

    await record('RECEIVED', 100);
    await record('USED', 72);
    await client.send('post', `/projects/${project}/progress`, {
      percent: 30,
      recordedOn: '2026-10-01',
    });
    await client.send('post', `/projects/${project}/progress`, { percent: 55 });
    await client.send('post', `/projects/${project}/change-works`, {
      requestedOn: '2026-10-02',
      requester: '고객 담당',
      content: '덕트 추가',
    });

    const summary = projectCompletionSummarySchema.parse((await client.summary(project)).body);

    expect(summary.progressPercent).toBe(55);
    expect(summary.materials).toEqual([
      expect.objectContaining({ name: '덕트', received: 100, used: 72, remaining: 28 }),
    ]);
    expect(summary.changeWorks.items).toEqual([
      {
        seq: 1,
        requestedOn: '2026-10-02',
        requester: '고객 담당',
        content: '덕트 추가',
        status: 'NEGOTIATING',
      },
    ]);
  });

  it('요약에 넣기로 고른 민감하지 않은 문서만 싣고, 고르지 않으면 싣지 않는다', async () => {
    const { client, project } = await setup();

    const drawing = await client.makeDocument(project, '도면', '도면·작업지시서');
    const contract = await client.makeDocument(project, '도급 계약서', '계약·공문');
    // 계약 종류는 기본이 민감, 다른 종류도 직접 민감 표시 가능
    await client.makeDocument(project, '안전 점검표', '안전·검사', { isSensitive: true });
    const safe = await client.makeDocument(project, '준공 검사서', '안전·검사');
    const summary = async () =>
      projectCompletionSummarySchema.parse((await client.summary(project)).body).documents;

    // 고르지 않으면 싣는 문서가 없고, 민감 자료는 건수만 알림
    let documents = await summary();

    expect(documents.sensitiveExcluded).toBe(2);
    expect(documents.items).toEqual([]);

    // 민감 자료는 요약에 넣기로 표시해도 제외
    expect((await client.updateDocument(contract, { includeInSummary: true })).status).toBe(200);
    documents = await summary();
    expect(documents.items).toEqual([]);

    // 종류와 상관없이 고른 문서만 포함
    await client.updateDocument(safe, { includeInSummary: true });
    await client.updateDocument(drawing, { includeInSummary: true });
    documents = await summary();
    expect(documents.items.map((item) => item.title).sort()).toEqual(['도면', '준공 검사서']);
    expect(documents.items).toContainEqual(
      expect.objectContaining({ title: '준공 검사서', categoryName: '안전·검사', versionCount: 1 }),
    );
    expect(JSON.stringify(documents)).not.toContain('계약서');
  });

  it('고른 사진이 있으면 최근 촬영순으로 그것만, 없으면 작업 후 사진 최근 8장을 싣고 거부된 사진은 세지 않는다', async () => {
    const { client, project } = await setup();
    const row = await db.owner.project.findFirstOrThrow({ where: { id: project } });
    const user = await db.owner.user.findFirstOrThrow({ where: { companyId: row.companyId } });
    const photo = async (index: number, status: 'READY' | 'REJECTED', isCover = false) => {
      const file = await db.owner.storedFile.create({
        data: {
          companyId: row.companyId,
          projectId: project,
          purpose: 'PHOTO',
          status,
          originalName: `p${index}.jpg`,
          contentType: 'image/jpeg',
          sizeBytes: 10n,
          objectKey: `company/${row.companyId}/project/${project}/p${index}/original`,
          thumbnailKey:
            status === 'READY'
              ? `company/${row.companyId}/project/${project}/p${index}/thumb`
              : null,
          sha256: 'a'.repeat(64),
          uploadedBy: user.id,
          ...(status === 'READY' ? { readyAt: new Date() } : { rejectReason: 'CONTENT_MISMATCH' }),
        },
      });

      return db.owner.photo.create({
        data: {
          companyId: row.companyId,
          projectId: project,
          fileId: file.id,
          takenAt: new Date(`2026-10-0${(index % 9) + 1}T03:00:00Z`),
          workDate: new Date('2026-10-05T00:00:00Z'),
          uploadedBy: user.id,
          isCover,
        },
      });
    };

    const ids: string[] = [];

    // 작업 전 2장 + 작업 후 10장 (촬영일이 서로 다름)
    for (let index = 0; index < 12; index += 1) {
      const created = await photo(index, 'READY', index === 0);

      await db.owner.photo.update({
        where: { companyId_id: { companyId: created.companyId, id: created.id } },
        data: { category: index < 2 ? 'BEFORE' : 'AFTER' },
      });
      ids.push(created.id);
    }

    await photo(20, 'REJECTED');

    const summary = async () =>
      projectCompletionSummarySchema.parse((await client.summary(project)).body).photos;

    // 고르지 않았으면 작업 후 사진 최근 8장 (작업 전 사진은 싣지 않음)
    let photos = await summary();

    expect(photos.total).toBe(12);
    expect(photos.items).toHaveLength(8);
    expect(photos.items.every((item) => item.category === 'AFTER')).toBe(true);
    expect(photos.items[0]!.thumbnailUrl).toContain('/thumb?download');

    // 직접 고른 사진이 있으면 종류와 상관없이 그 사진만 포함
    expect((await client.updatePhoto(ids[0]!, { includeInSummary: true })).status).toBe(200);
    expect((await client.updatePhoto(ids[5]!, { includeInSummary: true })).status).toBe(200);
    photos = await summary();
    expect(photos.items.map((item) => item.id).sort()).toEqual([ids[0]!, ids[5]!].sort());

    // 최대 12장까지만 고를 수 있음 (이미 2장을 골랐으니 10장까지 더 가능)
    for (const id of ids.filter((item) => item !== ids[0] && item !== ids[5])) {
      expect((await client.updatePhoto(id, { includeInSummary: true })).status).toBe(200);
    }

    const extra = await photo(30, 'READY');
    const over = await client.updatePhoto(extra.id, { includeInSummary: true });

    expect(over.status).toBe(400);
    expect(over.body.error.details).toEqual([
      expect.objectContaining({ path: 'body.includeInSummary' }),
    ]);
  });
});
