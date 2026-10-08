import {
  documentAccessLogsResponseSchema,
  documentAccessUrlSchema,
  documentDetailSchema,
  documentsResponseSchema,
  fileUploadTicketSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createFileService, registerFileWorker } from '../file/fileService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createEmployeeService } from '../employee/employeeService';
import { createProjectService } from '../project/projectService';
import { createMemoryQueue } from '../queue/jobQueue';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';
import { createDocumentService } from '../document/documentService';
import { createMemoryStorage } from '../storage/objectStorage';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

const NOW = new Date('2026-10-08T03:00:00Z');

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
    employees: createEmployeeService(db.app, () => NOW),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => NOW),
    files,
    documents: createDocumentService(db.app, memory.storage, () => NOW),
    appOrigin: 'http://localhost:5173',
  });

  return { memory, queue, files, instance };
};

let sequence = 0;

const signedUp = async (instance: Awaited<ReturnType<typeof harness>>['instance']) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `문서회사${sequence}`,
    adminName: '문서관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `doc-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `doc${sequence}@example.com`,
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
  const post = (path: string, body: object = {}) =>
    request(h.instance)
      .post(`/api/v1${path}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body);
  const patch = (path: string, body: object) =>
    request(h.instance)
      .patch(`/api/v1${path}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body);
  const del = (path: string) =>
    request(h.instance)
      .delete(`/api/v1${path}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie);
  const get = (path: string) => request(h.instance).get(`/api/v1${path}`).set('Cookie', cookie);
  const clientId = (await post('/partners', { kind: 'CLIENT', name: '가나다건설' })).body.id;
  const managerId = (await post('/employees', { name: '박소장' })).body.id;
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

  // 신청 → 저장소 업로드 → 완료 알림까지 한 번에 (작업은 메모리 큐가 바로 실행)
  const upload = async (
    body: Buffer,
    meta: { name: string; contentType: string; purpose?: string; size?: number },
  ) => {
    const ticket = fileUploadTicketSchema.parse(
      (
        await post(`/projects/${projectId}/files`, {
          name: meta.name,
          contentType: meta.contentType,
          purpose: meta.purpose ?? 'PHOTO',
          size: meta.size ?? body.length,
        })
      ).body,
    );
    const key = (await db.owner.storedFile.findFirstOrThrow({ where: { id: ticket.file.id } }))
      .objectKey;

    h.memory.upload(key, body, meta.contentType);

    const done = await post(`/files/${ticket.file.id}/complete`);

    return { ticket, key, done };
  };

  // 사진으로 쓸 파일 한 장 (검사 통과 상태). 안 올리면 신청만 한 상태
  const bodies = new Map<string, Buffer>();
  // 저장소에 올리고 완료를 알림 (신청만 해 둔 파일을 이어서 올릴 때)
  const finish = async (fileId: string) => {
    const row = await db.owner.storedFile.findFirstOrThrow({ where: { id: fileId } });

    h.memory.upload(row.objectKey, bodies.get(fileId)!, 'application/pdf');
    await post(`/files/${fileId}/complete`);
  };
  // 문서로 쓸 PDF 한 개 (검사 통과 상태). 안 올리면 신청만 한 상태
  const docFile = async (pid = projectId, uploaded = true, name = '시공도.pdf') => {
    const body = Buffer.from(`%PDF-1.7\n1 0 obj\n<<>>\nendobj\n% ${Math.random()}\n%%EOF`);
    const ticket = fileUploadTicketSchema.parse(
      (
        await post(`/projects/${pid}/files`, {
          name,
          contentType: 'application/pdf',
          purpose: 'DOCUMENT',
          size: body.length,
        })
      ).body,
    );

    bodies.set(ticket.file.id, body);

    if (uploaded) {
      await finish(ticket.file.id);
    }

    return ticket.file.id;
  };

  const otherProject = async () =>
    (
      await post('/projects', {
        name: 'B동 공사',
        siteName: 'B동 현장',
        clientId,
        managerId,
        contractDate: '2026-09-01',
        plannedStart: '2026-10-01',
        plannedEnd: '2026-12-31',
      })
    ).body.id as string;

  return {
    ...h,
    cookie,
    post,
    get,
    patch,
    del,
    projectId,
    upload,
    docFile,
    finish,
    otherProject,
  };
};

const doc = async (
  s: Awaited<ReturnType<typeof setup>>,
  body: object = {},
  projectId = s.projectId,
) => {
  const fileId = await s.docFile(projectId);
  const res = await s.post(`/projects/${projectId}/documents`, {
    fileId,
    title: '1층 시공도',
    ...body,
  });

  return { fileId, res, detail: res.status === 201 ? documentDetailSchema.parse(res.body) : null };
};

describe('문서 만들기', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const s = await setup();
    const fileId = await s.docFile();

    expect(
      (
        await request(s.instance)
          .post(`/api/v1/projects/${s.projectId}/documents`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ fileId, title: '시공도' })
      ).status,
    ).toBe(401);
    expect(
      (await request(s.instance).get(`/api/v1/projects/${s.projectId}/documents`)).status,
    ).toBe(401);
  });

  it('파일과 이름만으로 문서를 만들면 첫 버전이 되고 개정일은 서울 기준 오늘이다', async () => {
    const s = await setup();
    const { fileId, res, detail } = await doc(s);

    expect(res.status).toBe(201);
    expect(detail).toMatchObject({
      projectId: s.projectId,
      title: '1층 시공도',
      category: 'OTHER',
      isSensitive: false,
      isPinned: false,
      versionCount: 1,
      latest: {
        versionNo: 1,
        fileId,
        fileName: '시공도.pdf',
        fileStatus: 'READY',
        revisionDate: '2026-10-08',
        reason: null,
      },
    });
    expect(detail!.versions).toHaveLength(1);
  });

  it('계약·행정 분류는 기본적으로 민감 자료이고 직접 바꿀 수 있다', async () => {
    const s = await setup();

    expect((await doc(s, { category: 'CONTRACT' })).detail!.isSensitive).toBe(true);
    expect((await doc(s, { category: 'CONTRACT', isSensitive: false })).detail!.isSensitive).toBe(
      false,
    );
    expect((await doc(s, { category: 'DRAWING', isSensitive: true })).detail!.isSensitive).toBe(
      true,
    );
    expect((await doc(s, { category: 'DRAWING' })).detail!.isSensitive).toBe(false);
  });

  it('같은 파일로 다시 만들면 같은 문서를 돌려주고 새로 만들지 않는다', async () => {
    const s = await setup();
    const first = await doc(s);
    const again = await s.post(`/projects/${s.projectId}/documents`, {
      fileId: first.fileId,
      title: '다른 이름',
    });

    expect(again.body.id).toBe(first.detail!.id);
    expect(again.body.title).toBe('1층 시공도');
    expect(await db.owner.document.count({ where: { projectId: s.projectId } })).toBe(1);
  });

  it('사진용 파일·다른 프로젝트 파일·거부된 파일·없는 파일·다른 회사 파일은 문서로 만들 수 없다', async () => {
    const a = await setup();
    const b = await setup();
    const second = await a.otherProject();
    const elsewhere = await a.docFile(second);
    const photo = fileUploadTicketSchema.parse(
      (
        await a.post(`/projects/${a.projectId}/files`, {
          name: '현장.jpg',
          contentType: 'image/jpeg',
          purpose: 'PHOTO',
          size: 10,
        })
      ).body,
    ).file.id;
    const rejected = await a.upload(Buffer.alloc(40, 1), {
      name: '가짜.pdf',
      contentType: 'application/pdf',
      purpose: 'DOCUMENT',
    });
    const foreign = await b.docFile();

    for (const fileId of [
      elsewhere,
      photo,
      rejected.ticket.file.id,
      '018f3b1e-0000-7000-8000-000000000000',
      foreign,
    ]) {
      const res = await a.post(`/projects/${a.projectId}/documents`, { fileId, title: '문서' });

      expect({ fileId, status: res.status }).toEqual({ fileId, status: 400 });
    }

    expect(
      (
        await a.post(`/projects/${b.projectId}/documents`, {
          fileId: await a.docFile(),
          title: '문서',
        })
      ).status,
    ).toBe(404);
  });

  it('이름·분류·개정일 형식이 맞지 않으면 거부한다', async () => {
    const s = await setup();
    const fileId = await s.docFile();

    for (const extra of [
      { title: '   ' },
      { title: '가'.repeat(101) },
      { category: 'PHOTO' },
      { revisionDate: '어제' },
    ]) {
      expect(
        (await s.post(`/projects/${s.projectId}/documents`, { fileId, title: '문서', ...extra }))
          .status,
      ).toBe(400);
    }
  });
});

describe('버전 관리', () => {
  it('새 버전을 올리면 최신본이 기본으로 보이고 이전본은 그대로 남으며 개정일·사유가 붙는다', async () => {
    const s = await setup();
    const { detail } = await doc(s, { revisionDate: '2026-10-01', reason: '최초' });
    const second = await s.docFile();
    const res = await s.post(`/documents/${detail!.id}/versions`, {
      fileId: second,
      revisionDate: '2026-10-06',
      reason: '배관 위치 변경',
    });
    const updated = documentDetailSchema.parse(res.body);

    expect(res.status).toBe(201);
    expect(updated.versionCount).toBe(2);
    expect(updated.latest).toMatchObject({
      versionNo: 2,
      fileId: second,
      revisionDate: '2026-10-06',
      reason: '배관 위치 변경',
    });
    // 최신이 맨 앞, 이전본 보존
    expect(updated.versions.map((item) => item.versionNo)).toEqual([2, 1]);
    expect(updated.versions[1]).toMatchObject({
      fileId: detail!.latest.fileId,
      revisionDate: '2026-10-01',
      reason: '최초',
    });

    const list = documentsResponseSchema.parse(
      (await s.get(`/projects/${s.projectId}/documents`)).body,
    );

    expect(list.items[0]!.latest.versionNo).toBe(2);
  });

  it('같은 파일을 다시 올려도 버전이 늘지 않고, 다른 문서에 쓴 파일은 거부한다', async () => {
    const s = await setup();
    const a = await doc(s);
    const b = await doc(s, { title: '2층 시공도' });
    const fresh = await s.docFile();

    await s.post(`/documents/${a.detail!.id}/versions`, { fileId: fresh });

    const again = await s.post(`/documents/${a.detail!.id}/versions`, { fileId: fresh });

    expect(again.body.versionCount).toBe(2);
    expect((await s.post(`/documents/${a.detail!.id}/versions`, { fileId: b.fileId })).status).toBe(
      400,
    );
  });

  it('동시에 새 버전이 들어와도 번호가 겹치지 않는다', async () => {
    const s = await setup();
    const { detail } = await doc(s);
    const files = await Promise.all([s.docFile(), s.docFile(), s.docFile()]);

    await Promise.all(
      files.map((fileId) => s.post(`/documents/${detail!.id}/versions`, { fileId })),
    );

    const updated = documentDetailSchema.parse((await s.get(`/documents/${detail!.id}`)).body);

    expect(updated.versions.map((item) => item.versionNo)).toEqual([4, 3, 2, 1]);
  });

  it('이전 버전은 DB에서도 바꾸거나 지울 수 없다', async () => {
    const s = await setup();
    const { detail } = await doc(s);

    await expect(
      db.app.$executeRawUnsafe(
        `UPDATE document_versions SET reason = '조작' WHERE document_id = '${detail!.id}'`,
      ),
    ).rejects.toThrow();
    await expect(db.app.$executeRawUnsafe(`DELETE FROM document_versions`)).rejects.toThrow();
  });
});

describe('문서함 조회·수정', () => {
  it('고정한 문서가 먼저 나오고 분류·이름으로 거를 수 있다', async () => {
    const s = await setup();
    const a = await doc(s, { title: '시방서 A', category: 'SPEC' });
    const b = await doc(s, { title: '시공도 B', category: 'DRAWING' });
    const c = await doc(s, { title: '시공도 C', category: 'DRAWING' });
    const ids = async (query = '') =>
      documentsResponseSchema
        .parse((await s.get(`/projects/${s.projectId}/documents${query}`)).body)
        .items.map((item) => item.id);

    // 고정이 없으면 최근 수정순
    expect(await ids()).toEqual([c.detail!.id, b.detail!.id, a.detail!.id]);

    await s.patch(`/documents/${a.detail!.id}`, { isPinned: true });

    expect(await ids()).toEqual([a.detail!.id, c.detail!.id, b.detail!.id]);
    expect(await ids('?category=DRAWING')).toEqual([c.detail!.id, b.detail!.id]);
    expect(await ids('?q=시방')).toEqual([a.detail!.id]);
    expect(await ids('?pinned=true')).toEqual([a.detail!.id]);
  });

  it('고정은 프로젝트마다 10개까지다', async () => {
    const s = await setup();

    for (let i = 0; i < 10; i += 1) {
      const { detail } = await doc(s, { title: `문서 ${i}` });

      expect((await s.patch(`/documents/${detail!.id}`, { isPinned: true })).status).toBe(200);
    }

    const extra = await doc(s, { title: '열한 번째' });

    expect((await s.patch(`/documents/${extra.detail!.id}`, { isPinned: true })).status).toBe(400);
  });

  it('이름·분류·민감 표시를 고치고 바꿀 값이 없으면 거부한다', async () => {
    const s = await setup();
    const { detail } = await doc(s);
    const res = await s.patch(`/documents/${detail!.id}`, {
      title: '고친 이름',
      category: 'CONTRACT',
      isSensitive: true,
    });

    expect(res.body).toMatchObject({ title: '고친 이름', category: 'CONTRACT', isSensitive: true });
    expect((await s.patch(`/documents/${detail!.id}`, {})).status).toBe(400);
    expect((await s.patch(`/documents/${detail!.id}`, { title: '  ' })).status).toBe(400);
  });

  it('삭제하면 목록·조회에서 빠지지만 파일과 버전은 남고 같은 파일로 다시 만들 수 없다', async () => {
    const s = await setup();
    const { detail, fileId } = await doc(s);

    await s.patch(`/documents/${detail!.id}`, { isPinned: true });

    expect((await s.del(`/documents/${detail!.id}`)).body).toEqual({ success: true });
    expect((await s.get(`/documents/${detail!.id}`)).status).toBe(404);
    expect((await s.del(`/documents/${detail!.id}`)).status).toBe(404);
    expect(
      documentsResponseSchema.parse((await s.get(`/projects/${s.projectId}/documents`)).body).items,
    ).toEqual([]);

    const row = await db.owner.document.findFirstOrThrow({ where: { id: detail!.id } });

    expect(row.deletedAt).not.toBeNull();
    expect(row.isPinned).toBe(false);
    expect(await db.owner.documentVersion.count({ where: { documentId: detail!.id } })).toBe(1);
    expect(
      (await s.post(`/projects/${s.projectId}/documents`, { fileId, title: '다시' })).status,
    ).toBe(400);
  });

  it('다른 회사의 문서는 조회·수정·삭제·새 버전·열람 모두 존재하지 않는 것처럼 보인다', async () => {
    const a = await setup();
    const b = await setup();
    const { detail } = await doc(b);
    const id = detail!.id;

    expect((await a.get(`/documents/${id}`)).status).toBe(404);
    expect((await a.patch(`/documents/${id}`, { title: '침투' })).status).toBe(404);
    expect((await a.del(`/documents/${id}`)).status).toBe(404);
    expect((await a.post(`/documents/${id}/versions`, { fileId: await a.docFile() })).status).toBe(
      404,
    );
    expect((await a.get(`/documents/${id}/versions/1/url`)).status).toBe(404);
    expect((await a.get(`/documents/${id}/access-logs`)).status).toBe(404);
    expect((await a.get(`/projects/${b.projectId}/documents`)).status).toBe(404);
  });
});

describe('열람·내려받기와 열람 기록', () => {
  it('일반 자료는 짧은 만료의 주소를 주고 기록을 남기지 않는다', async () => {
    const s = await setup();
    const { detail } = await doc(s, { category: 'DRAWING' });
    const res = await s.get(`/documents/${detail!.id}/versions/1/url`);
    const access = documentAccessUrlSchema.parse(res.body);

    expect(access.isLogged).toBe(false);
    expect(access.url).toContain('?download&expires=300');
    expect(access.expiresAt).toBe('2026-10-08T03:05:00.000Z');
    expect(await db.owner.auditLog.count({ where: { targetId: detail!.id } })).toBe(0);
  });

  it('민감 자료는 열람·내려받기마다 열람 기록을 남기고 누가 몇 번째 버전을 언제 열었는지 보인다', async () => {
    const s = await setup();
    const { detail } = await doc(s, { category: 'CONTRACT' });

    await s.post(`/documents/${detail!.id}/versions`, {
      fileId: await s.docFile(),
      reason: '변경 합의',
    });

    const viewed = documentAccessUrlSchema.parse(
      (await s.get(`/documents/${detail!.id}/versions/2/url`)).body,
    );

    expect(viewed.isLogged).toBe(true);

    await s.get(`/documents/${detail!.id}/versions/1/url?mode=download`);

    const logs = documentAccessLogsResponseSchema.parse(
      (await s.get(`/documents/${detail!.id}/access-logs`)).body,
    ).items;

    expect(logs.map((log) => [log.action, log.versionNo, log.actorName])).toEqual([
      ['DOCUMENT_DOWNLOADED', 1, '문서관리자'],
      ['DOCUMENT_VIEWED', 2, '문서관리자'],
    ]);
    expect(logs[0]!.createdAt).toBe(NOW.toISOString());
  });

  it('없는 버전·검사가 끝나지 않은 파일은 열 수 없고 그런 요청은 기록을 남기지 않는다', async () => {
    const s = await setup();
    const pendingFile = await s.docFile(s.projectId, false);
    const { detail } = await doc(s, { category: 'CONTRACT' });
    const pendingDoc = (
      await s.post(`/projects/${s.projectId}/documents`, {
        fileId: pendingFile,
        title: '검사 전',
        category: 'CONTRACT',
      })
    ).body;

    expect((await s.get(`/documents/${detail!.id}/versions/9/url`)).status).toBe(404);
    expect((await s.get(`/documents/${pendingDoc.id}/versions/1/url`)).status).toBe(400);
    expect((await s.get(`/documents/${detail!.id}/versions/1/url?mode=print`)).status).toBe(400);
    expect(
      await db.owner.auditLog.count({ where: { targetId: { in: [detail!.id, pendingDoc.id] } } }),
    ).toBe(0);
  });

  it('민감 표시를 켜기 전의 열람은 기록이 없고 켠 뒤부터 기록된다', async () => {
    const s = await setup();
    const { detail } = await doc(s, { category: 'DRAWING' });

    await s.get(`/documents/${detail!.id}/versions/1/url`);
    await s.patch(`/documents/${detail!.id}`, { isSensitive: true });
    await s.get(`/documents/${detail!.id}/versions/1/url`);

    expect(await db.owner.auditLog.count({ where: { targetId: detail!.id } })).toBe(1);
  });

  it('열람 기록은 DB에서도 수정·삭제할 수 없다', async () => {
    const s = await setup();
    const { detail } = await doc(s, { category: 'CONTRACT' });

    await s.get(`/documents/${detail!.id}/versions/1/url`);

    await expect(
      db.app.$executeRawUnsafe(`UPDATE audit_logs SET action = 'DOCUMENT_DOWNLOADED'`),
    ).rejects.toThrow();
    await expect(db.app.$executeRawUnsafe(`DELETE FROM audit_logs`)).rejects.toThrow();
  });

  it('문서를 지워도 열람 기록은 남는다', async () => {
    const s = await setup();
    const { detail } = await doc(s, { category: 'CONTRACT' });

    await s.get(`/documents/${detail!.id}/versions/1/url`);
    await s.del(`/documents/${detail!.id}`);

    expect(await db.owner.auditLog.count({ where: { targetId: detail!.id } })).toBe(1);
  });

  it('다른 회사의 열람 기록은 보이지 않는다', async () => {
    const a = await setup();
    const b = await setup();
    const { detail } = await doc(b, { category: 'CONTRACT' });

    await b.get(`/documents/${detail!.id}/versions/1/url`);

    expect((await a.get(`/documents/${detail!.id}/access-logs`)).status).toBe(404);
  });
});
