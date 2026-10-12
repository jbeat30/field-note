import {
  assignmentSchema,
  employeeCredentialSchema,
  employeeCredentialsResponseSchema,
  errorResponseSchema,
  fileUploadTicketSchema,
  requiredCredentialsResponseSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { createCredentialService } from '../credential/credentialService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createEmployeeService } from '../employee/employeeService';
import { createFileService, registerFileWorker } from '../file/fileService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
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

const harness = async () => {
  const memory = createMemoryStorage();
  const { queue } = createMemoryQueue();
  const files = createFileService({ app: db.app, storage: memory.storage, queue, now: () => NOW });

  // 메모리 큐는 처리기가 등록돼 있으면 보낸 작업을 바로 실행
  await registerFileWorker(queue, files);

  const instance = createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    options: createOptionService(db.app),
    employees: createEmployeeService(db.app, () => NOW),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => NOW),
    assignments: createAssignmentService(db.app),
    files,
    credentials: createCredentialService({ app: db.app, storage: memory.storage, now: () => NOW }),
    appOrigin: 'http://localhost:5173',
  });

  return { memory, instance };
};

let sequence = 0;

const signedUp = async (instance: Awaited<ReturnType<typeof harness>>['instance']) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `서류회사${sequence}`,
    adminName: '서류관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `cr-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `cr${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const setup = async () => {
  const h = await harness();
  const cookie = await signedUp(h.instance);
  const send = (method: 'post' | 'put' | 'patch', path: string, body: object = {}) =>
    (method === 'post'
      ? request(h.instance).post(`/api/v1${path}`)
      : method === 'put'
        ? request(h.instance).put(`/api/v1${path}`)
        : request(h.instance).patch(`/api/v1${path}`)
    )
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body);
  const get = (path: string) => request(h.instance).get(`/api/v1${path}`).set('Cookie', cookie);
  const del = (path: string) =>
    request(h.instance)
      .delete(`/api/v1${path}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie);
  const id = async (path: string, body: object) =>
    (await send('post', path, body)).body.id as string;

  const options = (await get('/company/options')).body.items as {
    id: string;
    kind: string;
    name: string;
  }[];
  const type = (name: string) => options.find((item) => item.name === name)!.id;
  const clientId = await id('/partners', { kind: 'CLIENT', name: '가나다건설' });
  const managerId = await id('/employees', { name: '박소장' });
  const worker = await id('/employees', { name: '김용접' });
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

  // 직원 서류 파일 한 개 (검사 통과 상태)
  const upload = async (employeeId: string, name = '용접기능사.pdf', finish = true) => {
    const body = Buffer.from(`%PDF-1.7\n1 0 obj\n<<>>\nendobj\n% ${Math.random()}\n%%EOF`);
    const ticket = fileUploadTicketSchema.parse(
      (
        await send('post', `/employees/${employeeId}/files`, {
          name,
          contentType: 'application/pdf',
          size: body.length,
        })
      ).body,
    );

    if (finish) {
      const row = await db.owner.storedFile.findFirstOrThrow({ where: { id: ticket.file.id } });

      h.memory.upload(row.objectKey, body, 'application/pdf');
      await send('post', `/files/${ticket.file.id}/complete`);
    }

    return ticket.file.id;
  };

  return { ...h, cookie, send, get, del, id, type, clientId, managerId, worker, project, upload };
};

const errorPath = (body: unknown) => errorResponseSchema.parse(body).error.details?.[0]?.path;

describe('직원 서류·자격', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const { instance, worker, project } = await setup();

    expect((await request(instance).get(`/api/v1/employees/${worker}/credentials`)).status).toBe(
      401,
    );
    expect(
      (await request(instance).get(`/api/v1/projects/${project}/required-credentials`)).status,
    ).toBe(401);
  });

  it('자격 종류 프리셋이 채워지고 종류만으로 서류를 등록한다', async () => {
    const { send, get, type, worker } = await setup();
    const res = await send('post', `/employees/${worker}/credentials`, {
      typeId: type('용접 기능사'),
    });

    expect(res.status).toBe(201);
    expect(employeeCredentialSchema.parse(res.body)).toMatchObject({
      employeeId: worker,
      typeName: '용접 기능사',
      issuedOn: null,
      expiresOn: null,
      status: 'VALID',
      daysLeft: null,
      file: null,
    });
    expect(
      employeeCredentialsResponseSchema.parse((await get(`/employees/${worker}/credentials`)).body)
        .items,
    ).toHaveLength(1);
  });

  it('만료가 빠른 순으로 보이고 오늘 기준 상태와 남은 일수를 계산한다', async () => {
    const { send, get, type, worker } = await setup();

    await send('post', `/employees/${worker}/credentials`, { typeId: type('건강검진') });
    await send('post', `/employees/${worker}/credentials`, {
      typeId: type('안전교육 이수증'),
      expiresOn: '2027-06-30',
    });
    await send('post', `/employees/${worker}/credentials`, {
      typeId: type('용접 기능사'),
      expiresOn: '2026-10-25',
    });
    await send('post', `/employees/${worker}/credentials`, {
      typeId: type('전기기능사'),
      expiresOn: '2026-10-01',
    });

    const items = employeeCredentialsResponseSchema.parse(
      (await get(`/employees/${worker}/credentials`)).body,
    ).items;

    expect(items.map((item) => [item.typeName, item.status, item.daysLeft])).toEqual([
      ['전기기능사', 'EXPIRED', -10],
      ['용접 기능사', 'EXPIRING', 14],
      ['안전교육 이수증', 'VALID', 262],
      ['건강검진', 'VALID', null],
    ]);
  });

  it('입력 오류를 거부한다 (날짜 순서, 목록에 없는 종류, 없는 직원)', async () => {
    const { send, type, worker, project } = await setup();
    const typeId = type('용접 기능사');

    const reversed = await send('post', `/employees/${worker}/credentials`, {
      typeId,
      issuedOn: '2026-05-01',
      expiresOn: '2026-04-30',
    });

    expect(reversed.status).toBe(400);
    expect(errorPath(reversed.body)).toBe('body.expiresOn');

    // 직종 목록 항목은 자격 종류가 아니다
    const jobType = (
      await send('post', '/company/options', { kind: 'JOB_TYPE', name: '자격 아님' })
    ).body.id as string;
    const wrongKind = await send('post', `/employees/${worker}/credentials`, { typeId: jobType });

    expect(wrongKind.status).toBe(400);
    expect(errorPath(wrongKind.body)).toBe('body.typeId');

    expect((await send('post', `/employees/${project}/credentials`, { typeId })).status).toBe(404);
  });

  it('숨긴 종류로는 새 서류를 등록할 수 없다', async () => {
    const { send, type, worker } = await setup();
    const typeId = type('건강검진');

    await send('patch', `/company/options/${typeId}`, { isActive: false });

    const res = await send('post', `/employees/${worker}/credentials`, { typeId });

    expect(res.status).toBe(400);
    expect(errorPath(res.body)).toBe('body.typeId');
  });

  it('수정으로 갱신하고 날짜를 지울 수 있으며 삭제하면 목록에서 사라진다', async () => {
    const { send, get, del, type, worker } = await setup();
    const created = await send('post', `/employees/${worker}/credentials`, {
      typeId: type('용접 기능사'),
      issuedOn: '2024-10-01',
      expiresOn: '2026-10-05',
      memo: '1차',
    });
    const credentialId = created.body.id as string;

    expect(created.body.status).toBe('EXPIRED');

    const renewed = await send('patch', `/employees/${worker}/credentials/${credentialId}`, {
      issuedOn: '2026-10-01',
      expiresOn: '2029-10-01',
      memo: null,
    });

    expect(employeeCredentialSchema.parse(renewed.body)).toMatchObject({
      issuedOn: '2026-10-01',
      expiresOn: '2029-10-01',
      status: 'VALID',
      memo: null,
    });

    // 저장된 취득일 뒤로 만료일을 옮기려는 수정은 거부
    const bad = await send('patch', `/employees/${worker}/credentials/${credentialId}`, {
      expiresOn: '2026-09-30',
    });

    expect(bad.status).toBe(400);
    expect(errorPath(bad.body)).toBe('body.expiresOn');

    const cleared = await send('patch', `/employees/${worker}/credentials/${credentialId}`, {
      expiresOn: null,
    });

    expect(cleared.body.expiresOn).toBeNull();

    expect((await del(`/employees/${worker}/credentials/${credentialId}`)).status).toBe(200);
    expect(
      employeeCredentialsResponseSchema.parse((await get(`/employees/${worker}/credentials`)).body)
        .items,
    ).toEqual([]);
    expect((await del(`/employees/${worker}/credentials/${credentialId}`)).status).toBe(404);

    // 기록은 남는다 (삭제 시각만 기록)
    expect(await db.owner.employeeCredential.count({ where: { id: credentialId } })).toBe(1);
  });
});

describe('직원 서류 파일', () => {
  it('서류로 올린 파일을 연결하고 열람하면 감사 기록이 남는다', async () => {
    const { send, get, type, worker, upload } = await setup();
    const fileId = await upload(worker);
    const created = await send('post', `/employees/${worker}/credentials`, {
      typeId: type('용접 기능사'),
      fileId,
    });

    expect(employeeCredentialSchema.parse(created.body).file).toMatchObject({
      id: fileId,
      name: '용접기능사.pdf',
      status: 'READY',
    });

    const url = await get(`/employees/${worker}/credentials/${created.body.id}/file-url`);

    expect(url.status).toBe(200);
    expect(url.body.url).toContain(`/employee/${worker}/${fileId}/original`);

    const logs = await db.owner.auditLog.findMany({
      where: { action: 'EMPLOYEE_DOCUMENT_VIEWED' },
    });

    expect(logs.filter((log) => log.targetId === worker)).toHaveLength(1);
    expect(logs[0]?.detail).toMatchObject({ typeName: '용접 기능사', fileName: '용접기능사.pdf' });
  });

  it('파일 없는 서류와 검사 중인 파일은 열 수 없다', async () => {
    const { send, get, type, worker, upload } = await setup();
    const plain = await send('post', `/employees/${worker}/credentials`, {
      typeId: type('건강검진'),
    });

    expect((await get(`/employees/${worker}/credentials/${plain.body.id}/file-url`)).status).toBe(
      404,
    );

    const pending = await upload(worker, '대기.pdf', false);
    const waiting = await send('post', `/employees/${worker}/credentials`, {
      typeId: type('용접 기능사'),
      fileId: pending,
    });
    const res = await get(`/employees/${worker}/credentials/${waiting.body.id}/file-url`);

    expect(res.status).toBe(400);
    expect(errorPath(res.body)).toBe('params.credentialId');
    expect(
      await db.owner.auditLog.count({
        where: { action: 'EMPLOYEE_DOCUMENT_VIEWED', targetId: worker },
      }),
    ).toBe(0);
  });

  it('다른 직원의 서류 파일이나 프로젝트 파일은 연결할 수 없다', async () => {
    const { send, type, worker, managerId, project, upload } = await setup();
    const others = await upload(managerId);
    const mine = await upload(worker);
    const projectFile = (
      await send('post', `/projects/${project}/files`, {
        name: '도면.pdf',
        contentType: 'application/pdf',
        purpose: 'DOCUMENT',
        size: 1000,
      })
    ).body.file.id as string;

    for (const fileId of [others, projectFile]) {
      const res = await send('post', `/employees/${worker}/credentials`, {
        typeId: type('용접 기능사'),
        fileId,
      });

      expect(res.status).toBe(400);
      expect(errorPath(res.body)).toBe('body.fileId');
    }

    expect(
      (
        await send('post', `/employees/${worker}/credentials`, {
          typeId: type('용접 기능사'),
          fileId: mine,
        })
      ).status,
    ).toBe(201);
  });

  it('직원 서류 파일은 일반 파일 열람으로 열 수 없고 프로젝트 업로드로 만들 수도 없다', async () => {
    const { send, get, worker, project, upload } = await setup();
    const fileId = await upload(worker);

    expect((await get(`/files/${fileId}/url`)).status).toBe(404);

    const viaProject = await send('post', `/projects/${project}/files`, {
      name: '서류.pdf',
      contentType: 'application/pdf',
      purpose: 'EMPLOYEE_DOCUMENT',
      size: 1000,
    });

    expect(viaProject.status).toBe(400);
  });

  it('직원 서류 업로드는 이미지·PDF만 받는다', async () => {
    const { send, worker } = await setup();
    const res = await send('post', `/employees/${worker}/files`, {
      name: '서류.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 1000,
    });

    expect(res.status).toBe(400);
  });
});

describe('프로젝트 필요 자격과 투입 경고', () => {
  it('필요 자격을 저장하고 중복은 하나로 합치며 바꿀 수 있다', async () => {
    const { send, get, type, project } = await setup();
    const weld = type('용접 기능사');
    const safety = type('안전교육 이수증');

    expect(
      requiredCredentialsResponseSchema.parse(
        (await get(`/projects/${project}/required-credentials`)).body,
      ).items,
    ).toEqual([]);

    const saved = await send('put', `/projects/${project}/required-credentials`, {
      typeIds: [weld, safety, weld],
    });

    expect(
      requiredCredentialsResponseSchema.parse(saved.body).items.map((item) => item.typeName),
    ).toEqual(['용접 기능사', '안전교육 이수증']);

    const changed = await send('put', `/projects/${project}/required-credentials`, {
      typeIds: [safety],
    });

    expect(changed.body.items.map((item: { typeName: string }) => item.typeName)).toEqual([
      '안전교육 이수증',
    ]);

    const cleared = await send('put', `/projects/${project}/required-credentials`, { typeIds: [] });

    expect(cleared.body.items).toEqual([]);
  });

  it('자격 종류가 아닌 항목이나 없는 프로젝트는 거부한다', async () => {
    const { send, worker, project } = await setup();
    const jobType = (await send('post', '/company/options', { kind: 'JOB_TYPE', name: '용접반장' }))
      .body.id as string;
    const res = await send('put', `/projects/${project}/required-credentials`, {
      typeIds: [jobType],
    });

    expect(res.status).toBe(400);
    expect(errorPath(res.body)).toBe('body.typeIds');
    expect(
      (await send('put', `/projects/${worker}/required-credentials`, { typeIds: [] })).status,
    ).toBe(404);
  });

  it('필요 자격이 없는 직원을 투입하면 경고하고 서류를 갖추면 사라진다', async () => {
    const { send, get, type, worker, project } = await setup();
    const weld = type('용접 기능사');

    await send('put', `/projects/${project}/required-credentials`, { typeIds: [weld] });

    const assigned = await send('post', `/projects/${project}/assignments`, {
      employeeId: worker,
      startDate: '2026-10-20',
      endDate: '2026-10-30',
    });

    expect(assigned.status).toBe(201);
    expect(assignmentSchema.parse(assigned.body).warnings).toEqual([
      {
        type: 'CREDENTIAL',
        typeId: weld,
        typeName: '용접 기능사',
        reason: 'MISSING',
        expiresOn: null,
      },
    ]);

    await send('post', `/employees/${worker}/credentials`, {
      typeId: weld,
      expiresOn: '2027-01-31',
    });

    const list = await get(`/projects/${project}/assignments`);

    expect(list.body.items[0].warnings).toEqual([]);
  });

  it('투입 시작 전에 만료됐거나 투입 중에 만료되는 서류를 구분해 경고한다', async () => {
    const { send, get, del, type, worker, managerId, project } = await setup();
    const weld = type('용접 기능사');

    await send('put', `/projects/${project}/required-credentials`, { typeIds: [weld] });
    await send('post', `/employees/${worker}/credentials`, {
      typeId: weld,
      expiresOn: '2026-10-19',
    });
    await send('post', `/employees/${managerId}/credentials`, {
      typeId: weld,
      expiresOn: '2026-10-25',
    });

    const expired = await send('post', `/projects/${project}/assignments`, {
      employeeId: worker,
      startDate: '2026-10-20',
      endDate: '2026-10-30',
    });
    const during = await send('post', `/projects/${project}/assignments`, {
      employeeId: managerId,
      startDate: '2026-10-20',
      endDate: '2026-10-30',
    });

    expect(expired.body.warnings).toEqual([
      {
        type: 'CREDENTIAL',
        typeId: weld,
        typeName: '용접 기능사',
        reason: 'EXPIRED',
        expiresOn: '2026-10-19',
      },
    ]);
    expect(during.body.warnings).toEqual([
      {
        type: 'CREDENTIAL',
        typeId: weld,
        typeName: '용접 기능사',
        reason: 'EXPIRES_DURING',
        expiresOn: '2026-10-25',
      },
    ]);

    // 갱신한 서류를 추가하면 경고가 사라진다
    const renewed = await send('post', `/employees/${worker}/credentials`, {
      typeId: weld,
      expiresOn: '2029-10-01',
    });
    const warningCounts = async () =>
      (await get(`/projects/${project}/assignments`)).body.items.map(
        (item: { employeeId: string; warnings: unknown[] }) => [
          item.employeeId,
          item.warnings.length,
        ],
      );

    expect(await warningCounts()).toEqual([
      [worker, 0],
      [managerId, 1],
    ]);

    // 삭제한 서류는 갖춘 것으로 보지 않는다
    await del(`/employees/${worker}/credentials/${renewed.body.id}`);

    expect(await warningCounts()).toEqual([
      [worker, 1],
      [managerId, 1],
    ]);
  });
});
