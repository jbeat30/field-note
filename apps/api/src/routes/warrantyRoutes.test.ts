import { errorResponseSchema, projectWarrantySchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { createWarrantyService } from '../warranty/warrantyService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createDocumentService } from '../document/documentService';
import { createEmployeeService } from '../employee/employeeService';
import { createFileService } from '../file/fileService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createMaterialService } from '../material/materialService';
import { createCompanySettingsService } from '../company/companySettingsService';
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

const app = () =>
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
    materials: createMaterialService(db.app, () => NOW),
    documents: createDocumentService(db.app, createMemoryStorage().storage, () => NOW),
    warranty: createWarrantyService(db.app, () => NOW),
    companySettings: createCompanySettingsService(db.app),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `보증회사${sequence}`,
    adminName: '보증관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `wr-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `wr${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

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

  const del = (path: string) =>
    request(instance)
      .delete(`/api/v1${path}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie);

  return {
    get,
    del,
    id: async (path: string, body: object) => (await send('post', path, body)).body.id as string,
    warranty: (projectId: string) => get(`/projects/${projectId}/warranty`),
    setRules: (body: object) => send('put', '/company/rules', body),
    setWarranty: (projectId: string, body: object) =>
      send('put', `/projects/${projectId}/warranty`, body),
    addCertificate: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/warranty/certificates`, body),
    updateCertificate: (projectId: string, certificateId: string, body: object) =>
      send('patch', `/projects/${projectId}/warranty/certificates/${certificateId}`, body),
    removeCertificate: (projectId: string, certificateId: string) =>
      del(`/projects/${projectId}/warranty/certificates/${certificateId}`),
    projectStatus: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/status`, body),
    makeDocument: async (projectId: string, title: string) => {
      const fileId = (
        await send('post', `/projects/${projectId}/files`, {
          name: `${title}.pdf`,
          contentType: 'application/pdf',
          purpose: 'DOCUMENT',
          size: 1000,
        })
      ).body.file.id as string;

      return send('post', `/projects/${projectId}/documents`, {
        fileId,
        title,
        category: 'OTHER',
      }).then((res) => res.body.id as string);
    },
  };
};

// 프로젝트를 만들어 진행 상태까지 올린다 (2026-09-01 시작)
const setup = async () => {
  const instance = app();
  const cookie = await signedUp(instance);
  const client = api(instance, cookie);
  const clientId = await client.id('/partners', { kind: 'CLIENT', name: '가나다건설' });
  const managerId = await client.id('/employees', { name: '박소장' });
  const create = async (name = 'A동 판금 공사') => {
    const project = await client.id('/projects', {
      name,
      siteName: 'A동 현장',
      clientId,
      managerId,
      contractDate: '2026-08-01',
      plannedStart: '2026-09-01',
      plannedEnd: '2026-12-31',
    });

    await client.projectStatus(project, { toStatus: 'IN_PROGRESS', effectiveOn: '2026-09-01' });

    return project;
  };
  const complete = async (project: string, date = '2026-09-20') =>
    client.projectStatus(project, { toStatus: 'COMPLETED', effectiveOn: date });
  const project = await create();

  return { instance, client, project, create, complete };
};

const errorPath = (body: unknown) => errorResponseSchema.parse(body).error.details?.[0]?.path;

describe('보증 설정', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const { instance, project } = await setup();

    expect((await request(instance).get(`/api/v1/projects/${project}/warranty`)).status).toBe(401);
    expect(
      (
        await request(instance)
          .put(`/api/v1/projects/${project}/warranty`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ months: 12, startBasis: 'ACTUAL_END' })
      ).status,
    ).toBe(401);
  });

  it('완료 전에는 설정할 수 없고 조회하면 시작일·종료 예정일이 비어 있다', async () => {
    const { client, project } = await setup();
    const res = await client.warranty(project);

    expect(projectWarrantySchema.parse(res.body)).toMatchObject({
      configured: false,
      months: 12,
      startOn: null,
      endOn: null,
      daysLeft: null,
      certificates: [],
      changes: [],
    });

    const set = await client.setWarranty(project, { months: 12, startBasis: 'ACTUAL_END' });

    expect(set.status).toBe(400);
    expect(errorPath(set.body)).toBe('body.projectId');
  });

  it('완료하면 기본 12개월과 실제 완료일로 계산한 값을 미리 보여 준다', async () => {
    const { client, project, complete } = await setup();

    await complete(project, '2026-09-20');

    expect(projectWarrantySchema.parse((await client.warranty(project)).body)).toMatchObject({
      configured: false,
      months: 12,
      startBasis: 'ACTUAL_END',
      startOn: '2026-09-20',
      endOn: '2027-09-20',
      daysLeft: 344,
    });
  });

  it('회사가 정한 보증 기본 기간으로 미리 보여 주고 완료·보증 전환 때 만든다', async () => {
    const { client, project, complete } = await setup();

    await client.setRules({
      burnWarnPercent: 80,
      burnLimitPercent: 100,
      aheadGapPercent: 20,
      warrantyDefaultMonths: 24,
    });
    await complete(project, '2026-09-20');

    expect(projectWarrantySchema.parse((await client.warranty(project)).body)).toMatchObject({
      configured: false,
      months: 24,
      defaultMonths: 24,
      endOn: '2028-09-20',
    });

    await client.projectStatus(project, { toStatus: 'WARRANTY', confirmSummary: true });

    expect(projectWarrantySchema.parse((await client.warranty(project)).body)).toMatchObject({
      configured: true,
      months: 24,
      endOn: '2028-09-20',
    });
  });

  it('처음 저장은 사유 없이, 이후 변경은 사유가 있어야 하고 이력이 남는다', async () => {
    const { client, project, complete } = await setup();

    await complete(project, '2026-09-20');

    const first = await client.setWarranty(project, { months: 24, startBasis: 'ACTUAL_END' });

    expect(projectWarrantySchema.parse(first.body)).toMatchObject({
      configured: true,
      months: 24,
      startOn: '2026-09-20',
      endOn: '2028-09-20',
    });

    // 같은 내용, 사유 없는 변경 거부
    const same = await client.setWarranty(project, {
      months: 24,
      startBasis: 'ACTUAL_END',
      reason: '변경 없음',
    });

    expect(same.status).toBe(400);

    const noReason = await client.setWarranty(project, { months: 18, startBasis: 'ACTUAL_END' });

    expect(noReason.status).toBe(400);
    expect(errorPath(noReason.body)).toBe('body.reason');

    const changed = projectWarrantySchema.parse(
      (
        await client.setWarranty(project, {
          months: 18,
          startBasis: 'INSPECTION',
          startOn: '2026-09-25',
          reason: ' 고객 검수일 기준으로 정정 ',
        })
      ).body,
    );

    expect(changed).toMatchObject({ months: 18, startBasis: 'INSPECTION', endOn: '2028-03-25' });
    expect(changed.changes.map((item) => `${item.fromMonths}>${item.toMonths}`)).toEqual([
      '24>18',
      'null>24',
    ]);
    expect(changed.changes[0]).toMatchObject({
      reason: '고객 검수일 기준으로 정정',
      fromEndOn: '2028-09-20',
      toEndOn: '2028-03-25',
    });
  });

  it('종료 예정일을 직접 바꾸면 사유가 필수이고 시작일보다 빠를 수 없다', async () => {
    const { client, project, complete } = await setup();

    await complete(project, '2026-09-20');

    const noReason = await client.setWarranty(project, {
      months: 12,
      startBasis: 'ACTUAL_END',
      endOn: '2028-01-31',
    });

    expect(errorPath(noReason.body)).toBe('body.reason');

    const early = await client.setWarranty(project, {
      months: 12,
      startBasis: 'ACTUAL_END',
      endOn: '2026-09-01',
      reason: '오입력',
    });

    expect(errorPath(early.body)).toBe('body.endOn');
    expect(
      projectWarrantySchema.parse(
        (
          await client.setWarranty(project, {
            months: 12,
            startBasis: 'ACTUAL_END',
            endOn: '2028-01-31',
            reason: '재보수로 연장',
          })
        ).body,
      ),
    ).toMatchObject({ endOn: '2028-01-31', months: 12 });
  });

  it('검수일 기준인데 시작일이 없으면 거부한다', async () => {
    const { client, project, complete } = await setup();

    await complete(project);

    const res = await client.setWarranty(project, { months: 12, startBasis: 'INSPECTION' });

    expect(res.status).toBe(400);
    expect(errorPath(res.body)).toBe('body.startOn');
  });

  it('없는 프로젝트는 404, 보증 기간이 범위를 벗어나면 400이다', async () => {
    const { client, project, complete } = await setup();

    await complete(project);

    expect((await client.warranty('0198d000-0000-7000-8000-00000000ffff')).status).toBe(404);
    expect(
      (await client.setWarranty(project, { months: 121, startBasis: 'ACTUAL_END' })).status,
    ).toBe(400);
  });
});

describe('보증과 상태 전환', () => {
  it('보증 기간이 있으면 완료에서 바로 종료할 수 없고 0개월로 바꾸면 종료할 수 있다', async () => {
    const { client, project, complete } = await setup();

    await complete(project);

    const blocked = await client.projectStatus(project, { toStatus: 'CLOSED' });

    expect(blocked.status).toBe(400);
    expect(errorPath(blocked.body)).toBe('body.toStatus');

    await client.setWarranty(project, { months: 0, startBasis: 'ACTUAL_END' });

    // 보증 기간 0이면 보증 중으로는 바꿀 수 없다
    const warranty = await client.projectStatus(project, {
      toStatus: 'WARRANTY',
      confirmSummary: true,
    });

    expect(warranty.status).toBe(400);
    expect((await client.projectStatus(project, { toStatus: 'CLOSED' })).body).toMatchObject({
      status: 'CLOSED',
    });
  });

  it('보증 중이 되면 설정이 없을 때 기본값으로 만들고 이력을 남긴다', async () => {
    const { client, project, complete } = await setup();

    await complete(project, '2026-09-20');

    const started = await client.projectStatus(project, {
      toStatus: 'WARRANTY',
      effectiveOn: '2026-09-21',
      confirmSummary: true,
    });

    expect(started.body).toMatchObject({ status: 'WARRANTY' });
    expect(projectWarrantySchema.parse((await client.warranty(project)).body)).toMatchObject({
      configured: true,
      months: 12,
      startOn: '2026-09-20',
      endOn: '2027-09-20',
      changes: [{ fromMonths: null, toMonths: 12, reason: null }],
    });
  });

  it('종료 예정일 전에 종료하면 사유가 필요하고 예정일 이후에는 필요 없다', async () => {
    const { client, project, create, complete } = await setup();

    await complete(project, '2026-09-20');
    await client.projectStatus(project, { toStatus: 'WARRANTY', confirmSummary: true });

    const early = await client.projectStatus(project, { toStatus: 'CLOSED' });

    expect(early.status).toBe(400);
    expect(errorPath(early.body)).toBe('body.reason');
    expect(
      (await client.projectStatus(project, { toStatus: 'CLOSED', reason: '고객 요청' })).body,
    ).toMatchObject({ status: 'CLOSED' });

    // 1개월 보증이 이미 끝난 프로젝트 (2026-08-01 ~ 2026-09-01 사이가 아니라 오늘 기준 지남)
    const ended = await create('B동 판금 공사');

    await complete(ended, '2026-09-02');
    await client.projectStatus(ended, { toStatus: 'WARRANTY', confirmSummary: true });
    await client.setWarranty(ended, {
      months: 1,
      startBasis: 'MANUAL',
      startOn: '2026-08-01',
      reason: '계약상 8월 시작',
    });

    expect((await client.projectStatus(ended, { toStatus: 'CLOSED' })).body).toMatchObject({
      status: 'CLOSED',
    });
  });

  it('보증 중에는 보증 기간을 0개월로 바꿀 수 없고 종료된 뒤에는 바꿀 수 없다', async () => {
    const { client, project, complete } = await setup();

    await complete(project, '2026-09-20');
    await client.projectStatus(project, { toStatus: 'WARRANTY', confirmSummary: true });

    const zero = await client.setWarranty(project, {
      months: 0,
      startBasis: 'ACTUAL_END',
      reason: '보증 취소',
    });

    expect(zero.status).toBe(400);
    expect(errorPath(zero.body)).toBe('body.months');

    await client.projectStatus(project, { toStatus: 'CLOSED', reason: '조기 종료' });

    const closed = await client.setWarranty(project, {
      months: 6,
      startBasis: 'ACTUAL_END',
      reason: '수정',
    });

    expect(closed.status).toBe(400);
    expect(errorPath(closed.body)).toBe('body.projectId');
  });
});

describe('보증서', () => {
  const certificate = (documentId: string, extra: object = {}) => ({
    documentId,
    expiresOn: '2027-03-01',
    ...extra,
  });

  it('문서함 문서를 만료일과 함께 등록하고 만료일 순으로 보여 준다', async () => {
    const { client, project, complete } = await setup();

    await complete(project, '2026-09-20');

    const early = await client.makeDocument(project, '보증증권 A');
    const late = await client.makeDocument(project, '보증증권 B');

    await client.addCertificate(project, certificate(late, { expiresOn: '2027-12-01' }));

    const added = projectWarrantySchema.parse(
      (
        await client.addCertificate(
          project,
          certificate(early, { expiresOn: '2026-10-21', issuer: ' 서울보증 ' }),
        )
      ).body,
    );

    expect(added.certificates.map((item) => item.title)).toEqual(['보증증권 A', '보증증권 B']);
    expect(added.certificates[0]).toMatchObject({ issuer: '서울보증', daysLeft: 10 });
  });

  it('같은 문서의 중복 등록, 다른 프로젝트의 문서, 없는 문서는 거부한다', async () => {
    const { client, project, create, complete } = await setup();

    await complete(project, '2026-09-20');

    const other = await create('B동 판금 공사');
    const document = await client.makeDocument(project, '보증증권');
    const foreign = await client.makeDocument(other, '다른 현장 문서');

    expect((await client.addCertificate(project, certificate(document))).status).toBe(201);
    expect((await client.addCertificate(project, certificate(document))).status).toBe(400);
    expect((await client.addCertificate(project, certificate(foreign))).status).toBe(400);
    expect(
      (await client.addCertificate(project, certificate('0198d000-0000-7000-8000-00000000ffff')))
        .status,
    ).toBe(400);
  });

  it('만료일·발급처를 고치고 지울 수 있다 (지운 뒤에는 다시 등록할 수 있다)', async () => {
    const { client, project, complete } = await setup();

    await complete(project, '2026-09-20');

    const document = await client.makeDocument(project, '보증증권');
    const added = projectWarrantySchema.parse(
      (await client.addCertificate(project, certificate(document))).body,
    );
    const id = added.certificates[0]!.id;
    const updated = projectWarrantySchema.parse(
      (await client.updateCertificate(project, id, { expiresOn: '2027-06-30', issuer: '보증기금' }))
        .body,
    );

    expect(updated.certificates[0]).toMatchObject({ expiresOn: '2027-06-30', issuer: '보증기금' });
    expect((await client.updateCertificate(project, id, {})).status).toBe(400);

    const removed = projectWarrantySchema.parse((await client.removeCertificate(project, id)).body);

    expect(removed.certificates).toEqual([]);
    expect((await client.removeCertificate(project, id)).status).toBe(404);
    expect((await client.updateCertificate(project, id, { expiresOn: '2027-07-01' })).status).toBe(
      404,
    );
    expect((await client.addCertificate(project, certificate(document))).status).toBe(201);
  });

  it('종료된 프로젝트에는 보증서를 등록할 수 없다', async () => {
    const { client, project, complete } = await setup();

    await complete(project, '2026-09-20');
    await client.setWarranty(project, { months: 0, startBasis: 'ACTUAL_END' });
    await client.projectStatus(project, { toStatus: 'CLOSED' });

    const document = await client.makeDocument(project, '보증증권');
    const res = await client.addCertificate(project, certificate(document));

    expect(res.status).toBe(400);
    expect(errorPath(res.body)).toBe('body.projectId');
  });
});
