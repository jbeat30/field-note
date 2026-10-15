import {
  errorResponseSchema,
  optionsResponseSchema,
  repairRequestDetailSchema,
  repairRequestsResponseSchema,
  repairUsageSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { createRepairService } from '../repair/repairService';
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
    repairs: createRepairService(db.app, () => NOW),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `보수회사${sequence}`,
    adminName: '보수관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `rp-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `rp${sequence}@example.com`,
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
    id: async (path: string, body: object) => (await send('post', path, body)).body.id as string,
    list: (projectId: string, query = '') => get(`/projects/${projectId}/repair-requests${query}`),
    create: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/repair-requests`, body),
    detail: (id: string) => get(`/repair-requests/${id}`),
    update: (id: string, body: object) => send('patch', `/repair-requests/${id}`, body),
    transition: (id: string, body: object) => send('post', `/repair-requests/${id}/status`, body),
    link: (id: string, body: object) => send('post', `/repair-requests/${id}/links`, body),
    unlink: (id: string, linkId: string) => del(`/repair-requests/${id}/links/${linkId}`),
    usage: (projectId: string) => get(`/projects/${projectId}/after-service-usage`),
    materialRecord: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/material-records`, body),
    saveLog: (projectId: string, date: string, body: object) =>
      send('put', `/projects/${projectId}/work-logs/${date}`, body),
    projectStatus: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/status`, body),
  };
};

// 진행 중 프로젝트(2026-09-01 ~ 2026-12-31)를 생성해 보증 중까지 진행
const setup = async () => {
  const instance = app();
  const cookie = await signedUp(instance);
  const client = api(instance, cookie);
  const clientId = await client.id('/partners', { kind: 'CLIENT', name: '가나다건설' });
  const managerId = await client.id('/employees', { name: '박소장' });
  const worker = await client.id('/employees', { name: '김작업' });
  const category = optionsResponseSchema
    .parse((await client.get('/company/options')).body)
    .items.find((item) => item.kind === 'WORK_CATEGORY')!.id;
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
    await client.id(`/projects/${project}/assignments`, {
      employeeId: worker,
      startDate: '2026-09-01',
      endDate: '2026-12-31',
    });

    return project;
  };
  // 완료 → 보증 중까지 진행
  const warranty = async (project: string) => {
    await client.projectStatus(project, { toStatus: 'COMPLETED', effectiveOn: '2026-09-20' });
    await client.projectStatus(project, { toStatus: 'WARRANTY', confirmSummary: true });
  };
  const project = await create();

  await warranty(project);

  return { instance, client, project, create, warranty, worker, category };
};

const errorPath = (body: unknown) => errorResponseSchema.parse(body).error.details?.[0]?.path;

const body = {
  receivedOn: '2026-10-05',
  requester: '관리사무소 김과장',
  content: '옥상 누수',
  location: '옥상 B구역',
};

const detail = (res: { body: unknown }) => repairRequestDetailSchema.parse(res.body);

describe('보수 요청 접수', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const { instance, project } = await setup();

    for (const path of [
      `/projects/${project}/repair-requests`,
      `/projects/${project}/after-service-usage`,
    ]) {
      expect((await request(instance).get(`/api/v1${path}`)).status).toBe(401);
    }
  });

  it('보증 중에만 접수할 수 있고 완료·진행 중에는 조회만 된다', async () => {
    const { client, create, warranty } = await setup();
    const running = await create('B동');

    expect((await client.list(running)).status).toBe(200);

    const early = await client.create(running, body);

    expect(early.status).toBe(400);
    expect(errorPath(early.body)).toBe('body.projectId');

    await client.projectStatus(running, { toStatus: 'COMPLETED', effectiveOn: '2026-09-20' });
    expect((await client.create(running, body)).status).toBe(400);

    await client.projectStatus(running, { toStatus: 'WARRANTY', confirmSummary: true });
    expect((await client.create(running, body)).status).toBe(201);
    expect(warranty).toBeDefined();
  });

  it('접수하면 접수 상태로 시작하고 프로젝트마다 번호가 1부터 올라간다', async () => {
    const { client, project, create, warranty } = await setup();
    const first = detail(await client.create(project, body));
    const second = detail(
      await client.create(project, { ...body, content: '벽체 균열', location: '' }),
    );

    expect(first).toMatchObject({
      seq: 1,
      status: 'RECEIVED',
      receivedOn: '2026-10-05',
      statusChangedOn: '2026-10-05',
      resolvedOn: null,
      location: '옥상 B구역',
      history: [],
      links: [],
      usage: { workLogCount: 0, minutes: 0, materials: [] },
    });
    expect(second).toMatchObject({ seq: 2, location: null });

    // 다른 프로젝트는 다시 1부터
    const other = await create('C동');

    await warranty(other);
    expect(detail(await client.create(other, body)).seq).toBe(1);

    const list = repairRequestsResponseSchema.parse((await client.list(project)).body).items;

    expect(list.map((item) => item.seq)).toEqual([2, 1]);
    expect((await client.list(project, '?status=DONE')).body.items).toEqual([]);
  });

  it('접수일을 비우면 오늘이고 미래 날짜·빈 요청자·빈 내용은 거부한다', async () => {
    const { client, project } = await setup();

    expect(
      detail(await client.create(project, { requester: '고객', content: '누수' })).receivedOn,
    ).toBe('2026-10-11');
    expect((await client.create(project, { ...body, receivedOn: '2026-10-12' })).status).toBe(400);
    expect((await client.create(project, { ...body, requester: ' ' })).status).toBe(400);
    expect((await client.create(project, { ...body, content: '' })).status).toBe(400);
  });

  it('없는 프로젝트·보수 요청은 404이다', async () => {
    const { client } = await setup();
    const missing = '0198d000-0000-7000-8000-00000000ffff';

    expect((await client.list(missing)).status).toBe(404);
    expect((await client.create(missing, body)).status).toBe(404);
    expect((await client.detail(missing)).status).toBe(404);
    expect((await client.update(missing, { content: 'x' })).status).toBe(404);
    expect((await client.transition(missing, { toStatus: 'DONE' })).status).toBe(404);
  });
});

describe('보수 요청 수정·상태 변경', () => {
  it('완료 전에는 수정할 수 있고 접수일은 상태가 된 날보다 늦을 수 없다', async () => {
    const { client, project } = await setup();
    const id = detail(await client.create(project, body)).id;

    expect(
      detail(await client.update(id, { content: ' 누수 재발 ', location: null })),
    ).toMatchObject({
      content: '누수 재발',
      location: null,
    });
    expect((await client.update(id, {})).status).toBe(400);
    expect((await client.update(id, { receivedOn: '2026-10-06' })).status).toBe(400);
    expect(detail(await client.update(id, { receivedOn: '2026-10-04' })).receivedOn).toBe(
      '2026-10-04',
    );
  });

  it('상태를 바꾸면 이력이 남고 완료일이 기록되며 완료된 건은 수정할 수 없다', async () => {
    const { client, project } = await setup();
    const id = detail(await client.create(project, body)).id;

    // 같은 상태, 보류 사유 없음, 미래·접수일 이전 날짜는 거부
    expect((await client.transition(id, { toStatus: 'RECEIVED' })).status).toBe(400);
    expect(errorPath((await client.transition(id, { toStatus: 'ON_HOLD' })).body)).toBe(
      'body.note',
    );
    expect(
      (await client.transition(id, { toStatus: 'IN_PROGRESS', effectiveOn: '2026-10-12' })).status,
    ).toBe(400);
    expect(
      (await client.transition(id, { toStatus: 'IN_PROGRESS', effectiveOn: '2026-10-04' })).status,
    ).toBe(400);

    expect(
      detail(await client.transition(id, { toStatus: 'IN_PROGRESS', effectiveOn: '2026-10-06' })),
    ).toMatchObject({ status: 'IN_PROGRESS', statusChangedOn: '2026-10-06', resolvedOn: null });
    expect(
      detail(await client.transition(id, { toStatus: 'ON_HOLD', note: ' 자재 입고 대기 ' }))
        .history[0],
    ).toMatchObject({ fromStatus: 'IN_PROGRESS', toStatus: 'ON_HOLD', note: '자재 입고 대기' });

    const done = detail(
      await client.transition(id, { toStatus: 'DONE', effectiveOn: '2026-10-09' }),
    );

    expect(done).toMatchObject({ status: 'DONE', resolvedOn: '2026-10-09' });
    expect(done.history.map((item) => `${item.fromStatus}>${item.toStatus}`)).toEqual([
      'ON_HOLD>DONE',
      'IN_PROGRESS>ON_HOLD',
      'RECEIVED>IN_PROGRESS',
    ]);

    // 완료된 건은 수정 불가, 되돌릴 때는 사유 필요, 되돌리면 완료일 삭제
    expect((await client.update(id, { content: '수정' })).status).toBe(400);
    expect(errorPath((await client.transition(id, { toStatus: 'IN_PROGRESS' })).body)).toBe(
      'body.note',
    );
    expect(
      detail(await client.transition(id, { toStatus: 'IN_PROGRESS', note: '재발' })),
    ).toMatchObject({ status: 'IN_PROGRESS', resolvedOn: null });
    expect((await client.update(id, { content: '수정' })).status).toBe(200);
  });

  it('보증이 끝나 종료된 프로젝트에서는 바꿀 수 없다', async () => {
    const { client, project } = await setup();
    const id = detail(await client.create(project, body)).id;

    await client.transition(id, { toStatus: 'DONE' });
    await client.projectStatus(project, { toStatus: 'CLOSED', reason: '조기 종료' });

    for (const res of [
      await client.update(id, { content: '수정' }),
      await client.transition(id, { toStatus: 'IN_PROGRESS', note: '재발' }),
      await client.create(project, body),
    ]) {
      expect(res.status).toBe(400);
      expect(errorPath(res.body)).toBe('body.projectId');
    }

    // 조회는 계속 가능
    expect(detail(await client.detail(id)).status).toBe('DONE');
  });
});

describe('보증 종료와 보수 요청', () => {
  it('접수·처리 중인 보수 요청이 있으면 종료할 수 없고 보류·완료는 막지 않는다', async () => {
    const { client, project } = await setup();
    const a = detail(await client.create(project, body)).id;
    const b = detail(await client.create(project, { ...body, content: '균열' })).id;

    const blocked = await client.projectStatus(project, {
      toStatus: 'CLOSED',
      reason: '조기 종료',
    });

    expect(blocked.status).toBe(400);
    expect(errorPath(blocked.body)).toBe('body.toStatus');

    await client.transition(a, { toStatus: 'IN_PROGRESS' });
    expect(
      (await client.projectStatus(project, { toStatus: 'CLOSED', reason: '조기 종료' })).status,
    ).toBe(400);

    await client.transition(a, { toStatus: 'DONE' });
    await client.transition(b, { toStatus: 'ON_HOLD', note: '고객 일정 조율' });

    expect(
      (await client.projectStatus(project, { toStatus: 'CLOSED', reason: '조기 종료' })).body,
    ).toMatchObject({ status: 'CLOSED' });
  });
});

describe('사후 작업 연결', () => {
  // 보증 중 사후 작업으로 표시한 작업 내역 2건(공수 480·240)과 사용 자재 기록 생성
  const afterService = async () => {
    const base = await setup();
    const { client, worker, category } = base;
    // 진행 중에는 일반 작업 내역·자재를 먼저 기록하고, 보증 중에는 사후 작업 작업 내역·자재 기록
    const project = await base.create('사후 작업 시험');
    const entries = (minutes: number) => [{ employeeId: worker, categoryId: category, minutes }];
    const log = async (date: string, extra: object, minutes = 480) =>
      client.saveLog(project, date, {
        status: 'SAVED',
        content: `작업 내역 ${date}`,
        entries: entries(minutes),
        ...extra,
      });
    const duct = await client.id('/materials', { name: '덕트', unit: '장' });
    const record = async (extra: object) =>
      (
        await client.materialRecord(project, {
          materialId: duct,
          recordDate: '2026-10-06',
          kind: 'USED',
          quantity: 2,
          ...extra,
        })
      ).body.id as string;

    expect((await log('2026-09-10', {})).status).toBe(200);

    const normalMaterial = await record({});

    await base.warranty(project);

    expect((await log('2026-10-05', { isAfterService: true })).status).toBe(200);
    expect((await log('2026-10-06', { isAfterService: true }, 240)).status).toBe(200);

    const afterMaterial = await record({ isAfterService: true });
    const logIds = (
      await db.ownerPool.query<{ id: string; work_date: string }>(
        `SELECT id, to_char(work_date, 'YYYY-MM-DD') AS work_date FROM work_logs WHERE project_id = $1 ORDER BY work_date`,
        [project],
      )
    ).rows;

    return {
      ...base,
      project,
      duct,
      afterMaterial,
      normalMaterial,
      normalLog: logIds[0]!.id,
      afterLog1: logIds[1]!.id,
      afterLog2: logIds[2]!.id,
    };
  };

  it('사후 작업 작업 내역과 자재 기록을 연결하면 건별 공수·자재가 합계된다', async () => {
    const { client, project, afterLog1, afterLog2, afterMaterial, duct } = await afterService();
    const id = detail(await client.create(project, body)).id;

    await client.link(id, { workLogId: afterLog1 });
    await client.link(id, { workLogId: afterLog2 });

    const linked = detail(await client.link(id, { materialRecordId: afterMaterial }));

    expect(linked.linkCount).toBe(3);
    expect(linked.links.map((item) => item.kind)).toEqual(['WORK_LOG', 'WORK_LOG', 'MATERIAL']);
    expect(linked.links[0]).toMatchObject({ workDate: '2026-10-05', minutes: 480 });
    expect(linked.usage).toEqual({
      workLogCount: 2,
      minutes: 720,
      materials: [{ materialId: duct, name: '덕트', spec: null, unit: '장', quantity: 2 }],
    });
    expect(
      repairRequestsResponseSchema.parse((await client.list(project)).body).items[0]!.linkCount,
    ).toBe(3);
  });

  it('사후 작업이 아닌 기록·중복·다른 프로젝트 기록은 연결할 수 없다', async () => {
    const {
      client,
      project,
      create,
      warranty,
      afterLog1,
      normalLog,
      afterMaterial,
      normalMaterial,
    } = await afterService();
    const id = detail(await client.create(project, body)).id;

    expect(errorPath((await client.link(id, { workLogId: normalLog })).body)).toBe(
      'body.workLogId',
    );
    expect(errorPath((await client.link(id, { materialRecordId: normalMaterial })).body)).toBe(
      'body.materialRecordId',
    );
    expect((await client.link(id, {})).status).toBe(400);
    expect(
      (await client.link(id, { workLogId: afterLog1, materialRecordId: afterMaterial })).status,
    ).toBe(400);

    expect((await client.link(id, { workLogId: afterLog1 })).status).toBe(200);
    expect((await client.link(id, { workLogId: afterLog1 })).status).toBe(400);

    // 다른 프로젝트의 보수 요청에는 이 프로젝트의 작업 내역 연결 불가
    const other = await create('C동');

    await warranty(other);

    const otherId = detail(await client.create(other, body)).id;

    expect((await client.link(otherId, { workLogId: afterLog1 })).status).toBe(400);
    expect((await client.link(otherId, { materialRecordId: afterMaterial })).status).toBe(400);
  });

  it('연결을 해제하면 합계에서 빠지고 다시 연결할 수 있다', async () => {
    const { client, project, afterLog1 } = await afterService();
    const id = detail(await client.create(project, body)).id;
    const linkId = detail(await client.link(id, { workLogId: afterLog1 })).links[0]!.id;

    expect(detail(await client.unlink(id, linkId)).usage.minutes).toBe(0);
    expect((await client.unlink(id, linkId)).status).toBe(404);
    expect(detail(await client.link(id, { workLogId: afterLog1 })).usage.minutes).toBe(480);
  });

  it('삭제한 자재 기록은 연결 목록과 합계에서 빠진다', async () => {
    const { client, project, afterMaterial } = await afterService();
    const id = detail(await client.create(project, body)).id;

    await client.link(id, { materialRecordId: afterMaterial });
    await db.ownerPool.query(`UPDATE material_records SET deleted_at = now() WHERE id = $1`, [
      afterMaterial,
    ]);

    expect(detail(await client.detail(id))).toMatchObject({
      linkCount: 0,
      links: [],
      usage: { materials: [] },
    });
  });

  it('프로젝트의 사후 작업 합계는 연결과 무관하게 사후 작업 표시가 된 기록을 합산한다', async () => {
    const { client, project, duct } = await afterService();

    expect(repairUsageSchema.parse((await client.usage(project)).body)).toEqual({
      workLogCount: 2,
      minutes: 720,
      materials: [{ materialId: duct, name: '덕트', spec: null, unit: '장', quantity: 2 }],
    });
  });
});
