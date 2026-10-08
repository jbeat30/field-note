import {
  documentDetailSchema,
  documentsResponseSchema,
  fileUploadTicketSchema,
  photosResponseSchema,
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
import { createMemoService } from '../memo/memoService';
import { createPhotoService } from '../photo/photoService';
import { createReportService } from '../report/reportService';
import { createSearchService } from '../search/searchService';
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
    photos: createPhotoService(db.app, memory.storage, () => NOW),
    memos: createMemoService(db.app, () => NOW),
    search: createSearchService(db.app),
    reports: createReportService(db.app, memory.storage, () => NOW),
    appOrigin: 'http://localhost:5173',
  });

  return { memory, queue, files, instance };
};

let sequence = 0;

const signedUp = async (instance: Awaited<ReturnType<typeof harness>>['instance']) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `파일격리회사${sequence}`,
    adminName: '파일격리관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `iso-file-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `isofile${sequence}@example.com`,
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

type Company = Awaited<ReturnType<typeof setup>>;

// 회사 한 곳에 "검사가 끝난" 사진 한 장과 민감 문서 한 건을 직접 넣어 둠 (업로드 검사 흐름을 거치지 않고 주소 발급 단계만 시험)
const seedReady = async (s: Company) => {
  const project = await db.owner.project.findFirstOrThrow({ where: { id: s.projectId } });
  const user = await db.owner.user.findFirstOrThrow({ where: { companyId: project.companyId } });
  const companyId = project.companyId;
  const key = (name: string) => `company/${companyId}/project/${s.projectId}/${name}`;
  const file = async (
    purpose: 'PHOTO' | 'DOCUMENT',
    name: string,
    contentType: string,
    thumbnail: boolean,
  ) =>
    db.owner.storedFile.create({
      data: {
        companyId,
        projectId: s.projectId,
        purpose,
        status: 'READY',
        originalName: name,
        contentType,
        sizeBytes: 1000n,
        objectKey: key(`${name}/original`),
        thumbnailKey: thumbnail ? key(`${name}/thumbnail`) : null,
        sha256: 'a'.repeat(64),
        uploadedBy: user.id,
        readyAt: new Date(),
      },
    });
  const photoFile = await file('PHOTO', `${companyId.slice(-6)}-사진.jpg`, 'image/jpeg', true);
  const docFile = await file(
    'DOCUMENT',
    `${companyId.slice(-6)}-계약서.pdf`,
    'application/pdf',
    false,
  );
  const photo = await db.owner.photo.create({
    data: {
      companyId,
      projectId: s.projectId,
      fileId: photoFile.id,
      category: 'AFTER',
      area: '3층',
      takenAt: new Date('2026-10-08T01:00:00Z'),
      workDate: new Date('2026-10-08T00:00:00Z'),
      uploadedBy: user.id,
    },
  });
  const document = await db.owner.document.create({
    data: {
      companyId,
      projectId: s.projectId,
      category: 'CONTRACT',
      title: `${companyId.slice(-6)} 도급 계약서`,
      isSensitive: true,
      createdBy: user.id,
    },
  });

  await db.owner.documentVersion.create({
    data: {
      companyId,
      documentId: document.id,
      versionNo: 1,
      fileId: docFile.id,
      revisionDate: new Date('2026-10-08T00:00:00Z'),
      uploadedBy: user.id,
    },
  });

  return { companyId, photoFile, docFile, photo, document, user };
};

describe('파일 주소 격리', () => {
  it('내 사진·문서에서 받은 모든 주소는 내 회사 경로만 가리킨다', async () => {
    const a = await setup();
    const b = await setup();
    const sa = await seedReady(a);
    const sb = await seedReady(b);
    const urls = async (c: Company, s: Awaited<ReturnType<typeof seedReady>>) => {
      const photos = photosResponseSchema.parse(
        (await c.get(`/projects/${c.projectId}/photos`)).body,
      );
      const report = (await c.get(`/projects/${c.projectId}/daily-reports/2026-10-08`)).body;

      return [
        ...photos.items.map((item) => item.thumbnailUrl),
        ...report.photos.map((item: { thumbnailUrl: string }) => item.thumbnailUrl),
        (await c.get(`/files/${s.photoFile.id}/url?variant=thumbnail`)).body.url,
        (await c.get(`/files/${s.photoFile.id}/url`)).body.url,
        (await c.get(`/documents/${s.document.id}/versions/1/url`)).body.url,
        (await c.get(`/documents/${s.document.id}/versions/1/url?mode=download`)).body.url,
      ] as string[];
    };
    const mine = await urls(a, sa);

    // 사진 목록 1 + 작업일보 1 + 파일 주소 2 + 문서 주소 2
    expect(mine).toHaveLength(6);

    for (const url of mine) {
      expect(url).toContain(`/company/${sa.companyId}/`);
      expect(url).not.toContain(sb.companyId);
    }

    for (const url of await urls(b, sb)) {
      expect(url).toContain(`/company/${sb.companyId}/`);
      expect(url).not.toContain(sa.companyId);
    }
  });

  it('다른 회사의 파일·사진·문서는 어떤 경로로도 주소를 받을 수 없다', async () => {
    const a = await setup();
    const b = await setup();
    const sa = await seedReady(a);

    await seedReady(b);

    const attempts = [
      `/files/${sa.photoFile.id}`,
      `/files/${sa.photoFile.id}/url`,
      `/files/${sa.photoFile.id}/url?variant=thumbnail`,
      `/files/${sa.docFile.id}/url`,
      `/photos/${sa.photo.id}`,
      `/documents/${sa.document.id}`,
      `/documents/${sa.document.id}/versions/1/url`,
      `/documents/${sa.document.id}/versions/1/url?mode=download`,
      `/documents/${sa.document.id}/access-logs`,
    ];

    for (const path of attempts) {
      const res = await b.get(path);

      // 없는 것과 구별되지 않아야 함: 같은 404, 어떤 주소도 응답에 없음
      expect({ path, status: res.status }).toEqual({ path, status: 404 });
      expect(JSON.stringify(res.body)).not.toContain(sa.companyId);
    }

    expect((await b.post(`/files/${sa.photoFile.id}/complete`)).status).toBe(404);
    expect((await b.patch(`/photos/${sa.photo.id}`, { isCover: true })).status).toBe(404);
    expect((await b.del(`/photos/${sa.photo.id}`)).status).toBe(404);
    expect((await b.del(`/documents/${sa.document.id}`)).status).toBe(404);
    // 열람 기록도 남지 않음 (A의 문서를 B가 열려고 한 시도는 A의 기록에 섞이지 않음)
    expect(await db.owner.auditLog.count({ where: { targetId: sa.document.id } })).toBe(0);
  });

  it('내 목록·작업일보·검색 응답에는 다른 회사의 파일 ID·경로·이름이 섞이지 않는다', async () => {
    const a = await setup();
    const b = await setup();
    const sa = await seedReady(a);
    const sb = await seedReady(b);
    const responses = [
      await b.get(`/projects/${b.projectId}/photos`),
      await b.get(`/projects/${b.projectId}/documents`),
      await b.get(`/projects/${b.projectId}/daily-reports/2026-10-08`),
      await b.get(`/search?q=${encodeURIComponent('도급 계약서')}&limit=20`),
      await b.get(`/search?q=${encodeURIComponent('3층')}&limit=20`),
    ];

    for (const res of responses) {
      expect(res.status).toBe(200);

      const text = JSON.stringify(res.body);

      for (const secret of [
        sa.companyId,
        sa.photoFile.id,
        sa.docFile.id,
        sa.photo.id,
        sa.document.id,
        sa.photoFile.objectKey,
      ]) {
        expect(text).not.toContain(secret);
      }
    }

    // 검색은 자기 문서 이름만 찾음 (두 회사의 문서 이름이 비슷해도 섞이지 않음)
    const found = (await b.get(`/search?q=${encodeURIComponent('도급 계약서')}&limit=20`)).body
      .documents.items;

    expect(found.map((item: { id: string }) => item.id)).toEqual([sb.document.id]);
  });

  it('다른 회사의 파일을 내 사진·문서·새 버전으로 등록할 수 없다', async () => {
    const a = await setup();
    const b = await setup();
    const sa = await seedReady(a);
    const sb = await seedReady(b);
    const ownFile = await b.docFile();

    expect(
      (await b.post(`/projects/${b.projectId}/photos`, { fileId: sa.photoFile.id })).status,
    ).toBe(400);
    expect(
      (await b.post(`/projects/${b.projectId}/documents`, { fileId: sa.docFile.id, title: '침투' }))
        .status,
    ).toBe(400);
    expect(
      (await b.post(`/documents/${sb.document.id}/versions`, { fileId: sa.docFile.id })).status,
    ).toBe(400);
    // 내 파일은 정상 등록 (검사가 막는 것이 아니라 소유 확인이 막는지 구분)
    expect(
      (await b.post(`/documents/${sb.document.id}/versions`, { fileId: ownFile })).status,
    ).toBe(201);
    expect(
      documentsResponseSchema.parse((await b.get(`/projects/${b.projectId}/documents`)).body).items,
    ).toHaveLength(1);
  });

  it('내 문서 열람 기록에는 내 열람만 쌓이고 다른 회사의 열람과 섞이지 않는다', async () => {
    const a = await setup();
    const b = await setup();
    const sa = await seedReady(a);
    const sb = await seedReady(b);

    await a.get(`/documents/${sa.document.id}/versions/1/url`);
    await b.get(`/documents/${sb.document.id}/versions/1/url`);
    await b.get(`/documents/${sb.document.id}/versions/1/url?mode=download`);

    const logsA = (await a.get(`/documents/${sa.document.id}/access-logs`)).body.items;
    const logsB = (await b.get(`/documents/${sb.document.id}/access-logs`)).body.items;

    expect(logsA).toHaveLength(1);
    expect(logsB).toHaveLength(2);
    // 상세 문서 응답에도 다른 회사 문서의 흔적이 없음
    expect(
      documentDetailSchema.parse((await a.get(`/documents/${sa.document.id}`)).body).projectId,
    ).toBe(a.projectId);
  });

  it('DB도 다른 회사 경로를 가리키는 파일 행을 거부한다', async () => {
    const a = await setup();
    const b = await setup();
    const sa = await seedReady(a);
    const sb = await seedReady(b);
    const base = {
      companyId: sb.companyId,
      projectId: b.projectId,
      purpose: 'PHOTO' as const,
      originalName: '침투.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 10n,
      uploadedBy: sb.user.id,
    };

    // 원본 경로가 다른 회사
    await expect(
      db.owner.storedFile.create({
        data: { ...base, objectKey: `company/${sa.companyId}/project/x/침투/original` },
      }),
    ).rejects.toThrow();
    // 썸네일 경로가 다른 회사
    await expect(
      db.owner.storedFile.create({
        data: {
          ...base,
          objectKey: `company/${sb.companyId}/project/x/침투/original`,
          thumbnailKey: `company/${sa.companyId}/project/x/침투/thumbnail`,
        },
      }),
    ).rejects.toThrow();
    // 회사 접두사만 비슷한 경로도 거부 (슬래시까지 확인)
    await expect(
      db.owner.storedFile.create({
        data: { ...base, objectKey: `company/${sb.companyId}x/original` },
      }),
    ).rejects.toThrow();
    // 자기 회사 경로는 통과
    await expect(
      db.owner.storedFile.create({
        data: { ...base, objectKey: `company/${sb.companyId}/project/x/정상/original` },
      }),
    ).resolves.toBeDefined();
  });

  it('저장된 모든 파일 행의 경로는 자기 회사 경로로 시작한다', async () => {
    const a = await setup();

    await seedReady(a);
    await a.docFile();

    const { rows } = await db.ownerPool.query<{ count: string }>(
      `SELECT count(*) FROM files
        WHERE left(object_key, length('company/' || company_id::text || '/')) <> 'company/' || company_id::text || '/'`,
    );

    expect(Number(rows[0]!.count)).toBe(0);
  });
});
