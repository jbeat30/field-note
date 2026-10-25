import {
  changeUsageSchema,
  changeWorkDetailSchema,
  changeWorksResponseSchema,
  optionsResponseSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createChangeWorkService } from '../changeWork/changeWorkService';
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
    changeWorks: createChangeWorkService(db.app, () => NOW),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `변경작업회사${sequence}`,
    adminName: '변경작업관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `cw-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `cw${sequence}@example.com`,
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
    id: async (path: string, body: object) => (await send('post', path, body)).body.id as string,
    create: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/change-works`, body),
    list: (projectId: string, query = '') => get(`/projects/${projectId}/change-works${query}`),
    detail: (id: string) => get(`/change-works/${id}`),
    update: (id: string, body: object) => send('patch', `/change-works/${id}`, body),
    transition: (id: string, body: object) => send('post', `/change-works/${id}/status`, body),
    link: (id: string, body: object) => send('post', `/change-works/${id}/documents`, body),
    unlink: (id: string, documentId: string, query = '') =>
      request(instance)
        .delete(`/api/v1/change-works/${id}/documents/${documentId}${query}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .set('Cookie', cookie),
    projectStatus: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/status`, body),
    materialRecord: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/material-records`, body),
    usage: (projectId: string) => get(`/projects/${projectId}/change-usage`),
    saveLog: (projectId: string, date: string, body: object) =>
      send('put', `/projects/${projectId}/work-logs/${date}`, body),
    uploadFile: async (projectId: string, title: string) =>
      (
        await send('post', `/projects/${projectId}/files`, {
          name: `${title}.pdf`,
          contentType: 'application/pdf',
          purpose: 'DOCUMENT',
          size: 1000,
        })
      ).body.file.id as string,
    evidence: (id: string, body: object) => send('post', `/change-works/${id}/evidence`, body),
    documents: (projectId: string) => get(`/projects/${projectId}/documents`),
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
        categoryId: documentCategoryIdOf((await get('/company/options')).body, '기타'),
      }).then((res) => res.body.id as string);
    },
  };
};

// 진행 중 프로젝트(2026-09-01 ~ 2026-12-31) 한 건
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
  const projectBody = {
    name: 'A동 판금 공사',
    siteName: 'A동 현장',
    clientId,
    managerId,
    contractDate: '2026-08-01',
    plannedStart: '2026-09-01',
    plannedEnd: '2026-12-31',
  };
  const project = await client.id('/projects', projectBody);

  await client.projectStatus(project, { toStatus: 'IN_PROGRESS', effectiveOn: '2026-09-01' });
  await client.id(`/projects/${project}/assignments`, {
    employeeId: worker,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
  });

  return { instance, client, project, projectBody, worker, category };
};

const body = {
  requestedOn: '2026-10-05',
  requester: '현장소장 박OO',
  content: '지하 2층 덕트 추가 설치',
};

describe('변경·추가 작업 등록', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const { instance, project } = await setup();

    for (const path of [`/projects/${project}/change-works`, `/projects/${project}/change-usage`]) {
      expect((await request(instance).get(`/api/v1${path}`)).status).toBe(401);
    }

    expect(
      (
        await request(instance)
          .post(`/api/v1/projects/${project}/change-works`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send(body)
      ).status,
    ).toBe(401);
  });

  it('협의 중으로 시작하고 번호는 프로젝트마다 1부터 이어진다', async () => {
    const { client, project, projectBody } = await setup();
    const first = await client.create(project, body);

    expect(first.status).toBe(201);
    expect(changeWorkDetailSchema.parse(first.body)).toMatchObject({
      seq: 1,
      status: 'NEGOTIATING',
      requestedOn: '2026-10-05',
      statusChangedOn: '2026-10-05',
      requester: '현장소장 박OO',
      documentCount: 0,
      history: [],
      documents: [],
    });

    const second = await client.create(project, { ...body, content: '두 번째' });

    expect(second.body.seq).toBe(2);

    // 다른 프로젝트는 다시 1부터
    const other = await client.id('/projects', { ...projectBody, name: 'B동' });

    expect((await client.create(other, body)).body.seq).toBe(1);

    const items = changeWorksResponseSchema.parse((await client.list(project)).body).items;

    expect(items.map((item) => item.seq)).toEqual([2, 1]);
  });

  it('요청일을 비우면 서울 기준 오늘이고 미래 요청일은 거부한다', async () => {
    const { client, project } = await setup();

    expect(
      (await client.create(project, { requester: '고객', content: '내용' })).body.requestedOn,
    ).toBe('2026-10-11');

    const future = await client.create(project, { ...body, requestedOn: '2026-10-12' });

    expect(future.status).toBe(400);
    expect(future.body.error.details).toEqual([
      expect.objectContaining({ path: 'body.requestedOn' }),
    ]);
  });

  it('요청자·내용을 검사하고 앞뒤 공백은 지운다', async () => {
    const { client, project } = await setup();

    for (const bad of [
      { ...body, requester: ' ' },
      { ...body, content: '' },
      { ...body, content: 'x'.repeat(2001) },
      { ...body, requester: 'x'.repeat(101) },
      { requestedOn: '2026-10-05' },
    ]) {
      expect({ bad, status: (await client.create(project, bad)).status }).toEqual({
        bad,
        status: 400,
      });
    }

    const ok = await client.create(project, { ...body, requester: '  고객 ', content: ' 내용 ' });

    expect(ok.body).toMatchObject({ requester: '고객', content: '내용' });
  });

  it('동시에 여러 건을 등록해도 번호가 겹치지 않는다', async () => {
    const { client, project } = await setup();
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        client.create(project, { ...body, content: `동시 ${index}` }),
      ),
    );

    expect(results.every((res) => res.status === 201)).toBe(true);
    expect(results.map((res) => res.body.seq as number).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('없는 프로젝트·변경 작업은 404다', async () => {
    const { client } = await setup();
    const missing = '0198d000-0000-7000-8000-00000000dead';

    expect((await client.create(missing, body)).status).toBe(404);
    expect((await client.list(missing)).status).toBe(404);
    expect((await client.usage(missing)).status).toBe(404);
    expect((await client.detail(missing)).status).toBe(404);
    expect((await client.update(missing, { content: 'x' })).status).toBe(404);
    expect((await client.transition(missing, { toStatus: 'AGREED' })).status).toBe(404);
  });
});

describe('프로젝트 상태별 기록 (§10.3)', () => {
  it('예정·진행·중단에서는 기록하고 완료는 관리자 확인이 있을 때만, 취소는 불가', async () => {
    const planned = await setup();
    const plannedProject = await planned.client.id('/projects', {
      ...planned.projectBody,
      name: '예정',
    });

    expect((await planned.client.create(plannedProject, body)).status).toBe(201);

    const { client, project } = await setup();

    await client.projectStatus(project, { toStatus: 'SUSPENDED', reason: '자재 지연' });
    expect((await client.create(project, body)).status).toBe(201);
    await client.projectStatus(project, { toStatus: 'IN_PROGRESS' });
    await client.projectStatus(project, { toStatus: 'COMPLETED' });

    const blocked = await client.create(project, body);

    expect(blocked.status).toBe(400);
    expect(blocked.body.error.details).toEqual([
      expect.objectContaining({ path: 'body.confirmCompleted' }),
    ]);
    expect((await client.create(project, { ...body, confirmCompleted: true })).status).toBe(201);
    // 조회는 계속 가능
    expect((await client.list(project)).status).toBe(200);

    const cancelled = await setup();

    await cancelled.client.projectStatus(cancelled.project, {
      toStatus: 'CANCELLED',
      reason: '해지',
    });
    expect(
      (await cancelled.client.create(cancelled.project, { ...body, confirmCompleted: true }))
        .status,
    ).toBe(400);
  });
});

describe('수정', () => {
  it('협의 중일 때만 요청일·요청자·내용을 고치고 상태가 한 번도 바뀌지 않았으면 상태 변경일도 따라간다', async () => {
    const { client, project } = await setup();
    const id = (await client.create(project, body)).body.id as string;
    const updated = await client.update(id, {
      requester: '  고객 담당 ',
      requestedOn: '2026-10-03',
    });

    expect(updated.status).toBe(200);
    expect(changeWorkDetailSchema.parse(updated.body)).toMatchObject({
      requester: '고객 담당',
      requestedOn: '2026-10-03',
      statusChangedOn: '2026-10-03',
      content: '지하 2층 덕트 추가 설치',
    });

    expect((await client.update(id, {})).status).toBe(400);
    expect((await client.update(id, { requestedOn: '2026-10-12' })).status).toBe(400);
    expect((await client.update(id, { content: ' ' })).status).toBe(400);
  });

  it('합의·철회된 기록은 고칠 수 없다', async () => {
    const { client, project } = await setup();
    const id = (await client.create(project, body)).body.id as string;

    await client.transition(id, { toStatus: 'AGREED', effectiveOn: '2026-10-06' });

    const res = await client.update(id, { content: '몰래 수정' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([expect.objectContaining({ path: 'status' })]);
    expect((await client.detail(id)).body.content).toBe('지하 2층 덕트 추가 설치');
  });

  it('상태 변경 뒤에는 요청일을 첫 상태 변경일보다 늦출 수 없다', async () => {
    const { client, project } = await setup();
    const id = (await client.create(project, body)).body.id as string;

    await client.transition(id, { toStatus: 'AGREED', effectiveOn: '2026-10-06' });
    await client.transition(id, { toStatus: 'NEGOTIATING', effectiveOn: '2026-10-08' });

    expect((await client.update(id, { requestedOn: '2026-10-07' })).status).toBe(400);
    expect((await client.update(id, { requestedOn: '2026-10-04' })).status).toBe(200);
  });
});

describe('상태 변경과 이력', () => {
  it('협의 중에서 합의됨·철회로 바꾸고 이력은 최근 변경이 맨 앞이다', async () => {
    const { client, project } = await setup();
    const id = (await client.create(project, body)).body.id as string;

    expect(
      (
        await client.transition(id, {
          toStatus: 'AGREED',
          effectiveOn: '2026-10-07',
          note: '구두 합의',
        })
      ).body,
    ).toMatchObject({ status: 'AGREED', statusChangedOn: '2026-10-07' });

    const withdrawn = await client.transition(id, { toStatus: 'WITHDRAWN', note: '고객이 취소' });

    expect(changeWorkDetailSchema.parse(withdrawn.body)).toMatchObject({
      status: 'WITHDRAWN',
      statusChangedOn: '2026-10-11',
    });
    expect(
      changeWorkDetailSchema
        .parse(withdrawn.body)
        .history.map((item) => [item.fromStatus, item.toStatus, item.effectiveOn, item.note]),
    ).toEqual([
      ['AGREED', 'WITHDRAWN', '2026-10-11', '고객이 취소'],
      ['NEGOTIATING', 'AGREED', '2026-10-07', '구두 합의'],
    ]);

    // 필터
    expect(
      changeWorksResponseSchema.parse((await client.list(project, '?status=WITHDRAWN')).body).items,
    ).toHaveLength(1);
    expect(
      changeWorksResponseSchema.parse((await client.list(project, '?status=AGREED')).body).items,
    ).toHaveLength(0);
  });

  it('철회는 사유가 필수이고 같은 상태·미래·요청일 이전 날짜는 거부한다', async () => {
    const { client, project } = await setup();
    const id = (await client.create(project, body)).body.id as string;
    const paths = async (input: object) =>
      ((await client.transition(id, input)).body.error?.details ?? []).map(
        (item: { path: string }) => item.path,
      );

    expect(await paths({ toStatus: 'WITHDRAWN' })).toEqual(['body.note']);
    expect(await paths({ toStatus: 'NEGOTIATING' })).toEqual(['body.toStatus']);
    expect(await paths({ toStatus: 'AGREED', effectiveOn: '2026-10-12' })).toEqual([
      'body.effectiveOn',
    ]);
    expect(await paths({ toStatus: 'AGREED', effectiveOn: '2026-10-04' })).toEqual([
      'body.effectiveOn',
    ]);
    expect((await client.detail(id)).body.history).toEqual([]);
  });

  it('같은 변경 요청을 동시에 두 번 보내도 이력은 한 번만 생긴다', async () => {
    const { client, project } = await setup();
    const id = (await client.create(project, body)).body.id as string;
    const results = await Promise.all([
      client.transition(id, { toStatus: 'AGREED' }),
      client.transition(id, { toStatus: 'AGREED' }),
    ]);

    expect(results.map((res) => res.status).sort()).toEqual([200, 400]);
    expect((await client.detail(id)).body.history).toHaveLength(1);
  });

  it('이력은 DB에서도 수정·삭제할 수 없고 변경 작업도 지울 수 없다', async () => {
    const { client, project } = await setup();
    const id = (await client.create(project, body)).body.id as string;

    await client.transition(id, { toStatus: 'AGREED' });

    await expect(
      db.app.$executeRawUnsafe('DELETE FROM change_work_status_changes'),
    ).rejects.toThrow();
    await expect(
      db.app.$executeRawUnsafe(`UPDATE change_work_status_changes SET note = 'x'`),
    ).rejects.toThrow();
    await expect(db.app.$executeRawUnsafe('DELETE FROM change_works')).rejects.toThrow();
    // 앱 계정은 번호·작성자 같은 고정 열 수정 불가
    await expect(db.app.$executeRawUnsafe(`UPDATE change_works SET seq = 99`)).rejects.toThrow();
    await expect(
      db.ownerPool.query(`UPDATE change_works SET content = '' WHERE id = $1`, [id]),
    ).rejects.toThrow(/change_works_content_length/);
    await expect(
      db.ownerPool.query(
        `UPDATE change_work_status_changes SET to_status = 'WITHDRAWN', note = NULL WHERE change_work_id = $1`,
        [id],
      ),
    ).rejects.toThrow(/change_work_status_changes_withdraw_note/);
  });
});

describe('증빙 문서', () => {
  it('같은 프로젝트의 문서를 연결·해제하고 해제한 연결 기록은 남는다', async () => {
    const { client, project } = await setup();
    const id = (await client.create(project, body)).body.id as string;
    const doc = await client.makeDocument(project, '카톡 캡처');

    const linked = await client.link(id, { documentId: doc });

    expect(linked.status).toBe(201);
    expect(changeWorkDetailSchema.parse(linked.body)).toMatchObject({
      documentCount: 1,
      documents: [
        { documentId: doc, title: '카톡 캡처', categoryName: '기타', isSensitive: false },
      ],
    });
    // 목록에도 문서 수 표시
    expect(
      changeWorksResponseSchema.parse((await client.list(project)).body).items[0]!.documentCount,
    ).toBe(1);

    // 같은 문서 중복 연결은 거부
    expect((await client.link(id, { documentId: doc })).status).toBe(400);

    const unlinked = await client.unlink(id, doc);

    expect(unlinked.status).toBe(200);
    expect(unlinked.body.documents).toEqual([]);
    expect((await client.unlink(id, doc)).status).toBe(404);

    // 해제 후 다시 연결 가능, 이전 연결 행은 해제 시각과 함께 보존
    expect((await client.link(id, { documentId: doc })).status).toBe(201);

    const { rows } = await db.ownerPool.query<{ unlinked_at: Date | null }>(
      `SELECT unlinked_at FROM change_work_documents WHERE change_work_id = $1 ORDER BY linked_at`,
      [id],
    );

    expect(rows.map((row) => row.unlinked_at !== null)).toEqual([true, false]);
  });

  it('다른 프로젝트·없는 문서는 연결할 수 없다', async () => {
    const { client, project, projectBody } = await setup();
    const id = (await client.create(project, body)).body.id as string;
    const other = await client.id('/projects', { ...projectBody, name: 'B동' });
    const foreignDoc = await client.makeDocument(other, '다른 프로젝트 문서');
    const res = await client.link(id, { documentId: foreignDoc });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([expect.objectContaining({ path: 'body.documentId' })]);
    expect(
      (await client.link(id, { documentId: '0198d000-0000-7000-8000-00000000dead' })).status,
    ).toBe(400);
    expect((await client.link(id, { documentId: 'not-a-uuid' })).status).toBe(400);
  });

  it('삭제한 문서는 증빙 목록에서 빠진다', async () => {
    const { client, project } = await setup();
    const id = (await client.create(project, body)).body.id as string;
    const doc = await client.makeDocument(project, '삭제될 문서');

    await client.link(id, { documentId: doc });
    await db.ownerPool.query(`UPDATE documents SET deleted_at = now() WHERE id = $1`, [doc]);

    expect((await client.detail(id)).body).toMatchObject({ documentCount: 0, documents: [] });
  });
});

describe('증빙 올리기', () => {
  it('올린 파일로 계약·공문 문서를 만들고 한 번에 연결한다. 같은 파일로 다시 불러도 하나만 남는다', async () => {
    const { client, project } = await setup();
    const id = (await client.create(project, body)).body.id as string;
    const fileId = await client.uploadFile(project, '카톡 캡처');
    const res = await client.evidence(id, { fileId, title: '카톡 캡처' });

    expect(res.status).toBe(201);
    expect(changeWorkDetailSchema.parse(res.body)).toMatchObject({
      documentCount: 1,
      documents: [{ title: '카톡 캡처', categoryName: '계약·공문', isSensitive: true }],
    });

    // 재시도: 새 문서도 중복 연결도 만들지 않고 같은 결과 반환
    const again = await client.evidence(id, { fileId, title: '카톡 캡처' });

    expect(again.status).toBe(201);
    expect(changeWorkDetailSchema.parse(again.body).documentCount).toBe(1);
    expect((await client.documents(project)).body.items).toHaveLength(1);
  });

  it('기록할 수 없는 프로젝트 상태면 문서를 만들지 않고 막는다', async () => {
    const { client, project } = await setup();
    const id = (await client.create(project, body)).body.id as string;

    await client.projectStatus(project, { toStatus: 'CANCELLED', reason: '해지' });

    const fileId = await client.uploadFile(project, '취소 뒤 증빙');
    const res = await client.evidence(id, { fileId, title: '취소 뒤 증빙' });

    expect(res.status).toBe(400);
    expect((await client.documents(project)).body.items).toHaveLength(0);
  });

  it('입력이 틀리거나 없는 변경 작업이면 거부한다', async () => {
    const { client, project, projectBody } = await setup();
    const id = (await client.create(project, body)).body.id as string;
    const fileId = await client.uploadFile(project, '증빙');

    expect((await client.evidence(id, { fileId, title: '  ' })).status).toBe(400);
    expect((await client.evidence(id, { fileId: 'not-a-uuid', title: '증빙' })).status).toBe(400);
    expect(
      (await client.evidence('0198d000-0000-7000-8000-00000000dead', { fileId, title: '증빙' }))
        .status,
    ).toBe(404);
    // 다른 프로젝트에 올린 파일은 증빙으로 사용 불가
    const other = await client.id('/projects', { ...projectBody, name: 'B동' });
    const foreign = await client.uploadFile(other, '다른 프로젝트 파일');

    expect((await client.evidence(id, { fileId: foreign, title: '증빙' })).status).toBe(400);
  });
});

describe('변경·추가 작업으로 쓴 공수·자재', () => {
  it('변경 표시가 된 저장 작업 내역의 공수와 자재 사용량만 합산한다', async () => {
    const { client, project, worker, category } = await setup();
    const entries = [{ employeeId: worker, categoryId: category, minutes: 480 }];

    await client.saveLog(project, '2026-10-05', { status: 'SAVED', content: '일반', entries });
    await client.saveLog(project, '2026-10-06', {
      status: 'SAVED',
      content: '변경',
      entries,
      isChange: true,
    });
    await client.saveLog(project, '2026-10-07', {
      status: 'SAVED',
      content: '변경2',
      entries: [{ employeeId: worker, categoryId: category, minutes: 240 }],
      isChange: true,
    });
    // 임시 저장은 합산 제외
    await client.saveLog(project, '2026-10-08', {
      status: 'DRAFT',
      content: '임시 변경',
      entries,
      isChange: true,
    });

    const duct = await client.id('/materials', { name: '덕트 자재', unit: '장' });
    const bolt = await client.id('/materials', { name: '볼트', unit: '개' });
    const record = (materialId: string, kind: string, quantity: number, isChange: boolean) =>
      client.materialRecord(project, {
        materialId,
        recordDate: '2026-10-06',
        kind,
        quantity,
        isChange,
      });

    // 변경 표시된 사용만 합산: 반입·일반 사용은 제외, 같은 자재는 합치고 이름 가나다순
    await record(duct, 'USED', 10, true);
    await record(duct, 'USED', 2.5, true);
    await record(duct, 'USED', 7, false);
    await record(duct, 'RECEIVED', 100, true);
    await record(bolt, 'USED', 40, true);

    expect(changeUsageSchema.parse((await client.usage(project)).body)).toEqual({
      workLogCount: 2,
      minutes: 720,
      materials: [
        { materialId: duct, name: '덕트 자재', spec: null, unit: '장', quantity: 12.5 },
        { materialId: bolt, name: '볼트', spec: null, unit: '개', quantity: 40 },
      ],
    });
  });

  it('변경 표시가 없으면 모두 0이다', async () => {
    const { client, project } = await setup();

    expect(changeUsageSchema.parse((await client.usage(project)).body)).toEqual({
      workLogCount: 0,
      minutes: 0,
      materials: [],
    });
  });
});
