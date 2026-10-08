import {
  fileUploadTicketSchema,
  fileUrlResponseSchema,
  storedFileSchema,
} from '@field-note/shared';
import request from 'supertest';
import sharp from 'sharp';

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
    appOrigin: 'http://localhost:5173',
  });

  return { memory, queue, files, instance };
};

let sequence = 0;

const signedUp = async (instance: Awaited<ReturnType<typeof harness>>['instance']) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `파일회사${sequence}`,
    adminName: '파일관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `file-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `file${sequence}@example.com`,
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

  return { ...h, cookie, post, get, projectId, upload };
};

const jpeg = (width = 1200, height = 800) =>
  sharp({ create: { width, height, channels: 3, background: '#cc6633' } })
    .jpeg()
    .toBuffer();

describe('파일 업로드 신청', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const s = await setup();

    expect(
      (
        await request(s.instance)
          .post(`/api/v1/projects/${s.projectId}/files`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ name: '현장.jpg', contentType: 'image/jpeg', purpose: 'PHOTO', size: 10 })
      ).status,
    ).toBe(401);
    expect((await request(s.instance).get(`/api/v1/files/${s.projectId}`)).status).toBe(401);
  });

  it('형식·크기를 서명한 업로드 주소와 회사·프로젝트가 든 저장 경로를 발급한다', async () => {
    const s = await setup();
    const res = await s.post(`/projects/${s.projectId}/files`, {
      name: '현장.jpg',
      contentType: 'image/jpeg',
      purpose: 'PHOTO',
      size: 1234,
    });
    const ticket = fileUploadTicketSchema.parse(res.body);
    const row = await db.owner.storedFile.findFirstOrThrow({ where: { id: ticket.file.id } });

    expect(res.status).toBe(201);
    expect(ticket.file.status).toBe('PENDING');
    expect(ticket.upload.method).toBe('PUT');
    expect(ticket.upload.expiresAt).toBe('2026-10-08T03:15:00.000Z');
    expect(row.objectKey).toBe(
      `company/${row.companyId}/project/${s.projectId}/${row.id}/original`,
    );
    expect(s.memory.presigned.get(row.objectKey)).toEqual({
      contentType: 'image/jpeg',
      size: 1234,
    });
  });

  it('허용되지 않은 형식·확장자 불일치·큰 파일·빈 파일은 신청 단계에서 거부한다', async () => {
    const s = await setup();

    for (const body of [
      { name: '악성.exe', contentType: 'application/x-msdownload', purpose: 'DOCUMENT', size: 10 },
      { name: '현장.png', contentType: 'image/jpeg', purpose: 'PHOTO', size: 10 },
      { name: '도면.pdf', contentType: 'application/pdf', purpose: 'PHOTO', size: 10 },
      { name: '현장.jpg', contentType: 'image/jpeg', purpose: 'PHOTO', size: 21 * 1024 * 1024 },
      { name: '현장.jpg', contentType: 'image/jpeg', purpose: 'PHOTO', size: 0 },
    ]) {
      const res = await s.post(`/projects/${s.projectId}/files`, body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }

    expect(await db.owner.storedFile.count({ where: { projectId: s.projectId } })).toBe(0);
  });

  it('없는 프로젝트나 다른 회사의 프로젝트에는 신청할 수 없다', async () => {
    const a = await setup();
    const b = await setup();
    const body = { name: '현장.jpg', contentType: 'image/jpeg', purpose: 'PHOTO', size: 10 };

    expect((await a.post(`/projects/${b.projectId}/files`, body)).status).toBe(404);
    expect(
      (await a.post('/projects/018f3b1e-0000-7000-8000-000000000000/files', body)).status,
    ).toBe(404);
  });

  it('회사 저장 용량 한도를 넘는 신청은 거부하고 거부·만료된 파일은 용량에 넣지 않는다', async () => {
    const s = await setup();
    const company = await db.owner.company.findFirstOrThrow({
      where: { users: { some: { sessions: { some: {} } } }, name: { startsWith: '파일회사' } },
      orderBy: { createdAt: 'desc' },
    });

    await db.owner.company.update({
      where: { id: company.id },
      data: { storageQuotaBytes: 3000n },
    });

    const body = (size: number) => ({
      name: '현장.jpg',
      contentType: 'image/jpeg',
      purpose: 'PHOTO',
      size,
    });
    const first = await s.post(`/projects/${s.projectId}/files`, body(2000));
    const over = await s.post(`/projects/${s.projectId}/files`, body(1500));

    expect(first.status).toBe(201);
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe('STORAGE_QUOTA_EXCEEDED');

    // 업로드 주소가 만료된 신청(15분 경과)은 용량에서 빠짐
    await db.owner.storedFile.update({
      where: { companyId_id: { companyId: company.id, id: first.body.file.id } },
      data: { createdAt: new Date('2026-10-08T02:00:00Z') },
    });

    expect((await s.post(`/projects/${s.projectId}/files`, body(1500))).status).toBe(201);
  });
});

describe('업로드 후 검사', () => {
  it('정상 사진은 내용 검사를 통과해 썸네일·SHA-256과 함께 사용 가능해진다', async () => {
    const s = await setup();
    const body = await jpeg();
    const { ticket, key, done } = await s.upload(body, {
      name: '현장.jpg',
      contentType: 'image/jpeg',
    });
    const file = storedFileSchema.parse(done.body);
    const { createHash } = await import('node:crypto');

    expect(done.status).toBe(200);
    expect(file).toMatchObject({
      id: ticket.file.id,
      status: 'READY',
      contentType: 'image/jpeg',
      hasThumbnail: true,
      rejectReason: null,
      size: body.length,
      sha256: createHash('sha256').update(body).digest('hex'),
    });
    expect(file.readyAt).toBe(NOW.toISOString());

    const row = await db.owner.storedFile.findFirstOrThrow({ where: { id: file.id } });
    const thumbnail = s.memory.objects.get(row.thumbnailKey!)!;
    const meta = await sharp(thumbnail.body).metadata();

    expect(s.memory.objects.has(key)).toBe(true);
    expect(meta).toMatchObject({ format: 'webp', width: 480, height: 320 });
  });

  it('PDF 문서는 썸네일 없이 사용 가능해진다', async () => {
    const s = await setup();
    const { done } = await s.upload(Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'), {
      name: '시공도.pdf',
      contentType: 'application/pdf',
      purpose: 'DOCUMENT',
    });

    expect(done.body).toMatchObject({ status: 'READY', hasThumbnail: false });
  });

  it('확장자·형식을 속인 실행 파일은 거부하고 저장소에서 지운다', async () => {
    const s = await setup();
    const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(300, 1)]);
    const { key, done } = await s.upload(exe, { name: '현장.jpg', contentType: 'image/jpeg' });

    expect(done.body).toMatchObject({ status: 'REJECTED', rejectReason: 'CONTENT_MISMATCH' });
    expect(s.memory.objects.has(key)).toBe(false);
  });

  it('내용은 PNG인데 JPG로 신청한 파일과 알 수 없는 내용도 거부한다', async () => {
    const s = await setup();
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    const forged = await s.upload(png, { name: '현장.jpg', contentType: 'image/jpeg' });
    const text = await s.upload(Buffer.from('그냥 글자'), {
      name: '현장.png',
      contentType: 'image/png',
    });

    expect(forged.done.body).toMatchObject({
      status: 'REJECTED',
      rejectReason: 'CONTENT_MISMATCH',
    });
    expect(text.done.body).toMatchObject({ status: 'REJECTED', rejectReason: 'CONTENT_MISMATCH' });
  });

  it('JPEG 표식만 있고 이미지로 열 수 없는 파일은 거부한다', async () => {
    const s = await setup();
    const broken = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.from('JFIF').subarray(0, 4),
      Buffer.alloc(100, 7),
    ]);
    const { done } = await s.upload(broken, { name: '현장.jpg', contentType: 'image/jpeg' });

    expect(done.body).toMatchObject({ status: 'REJECTED', rejectReason: 'UNREADABLE_IMAGE' });
  });

  it('신청한 크기와 다르게 올라온 파일은 거부한다', async () => {
    const s = await setup();
    const body = await jpeg();
    const { done } = await s.upload(body, {
      name: '현장.jpg',
      contentType: 'image/jpeg',
      size: body.length + 5,
    });

    expect(done.body).toMatchObject({ status: 'REJECTED', rejectReason: 'SIZE_MISMATCH' });
  });

  it('저장소에 올라오기 전에 완료를 알리면 거부하고 올린 뒤 다시 알릴 수 있다', async () => {
    const s = await setup();
    const body = await jpeg(100, 100);
    const ticket = fileUploadTicketSchema.parse(
      (
        await s.post(`/projects/${s.projectId}/files`, {
          name: '현장.jpg',
          contentType: 'image/jpeg',
          purpose: 'PHOTO',
          size: body.length,
        })
      ).body,
    );
    const early = await s.post(`/files/${ticket.file.id}/complete`);
    const row = await db.owner.storedFile.findFirstOrThrow({ where: { id: ticket.file.id } });

    expect(early.status).toBe(400);
    expect((await s.get(`/files/${ticket.file.id}`)).body.status).toBe('PENDING');

    s.memory.upload(row.objectKey, body, 'image/jpeg');

    expect((await s.post(`/files/${ticket.file.id}/complete`)).body.status).toBe('READY');
  });

  it('완료 알림을 여러 번 보내도 결과는 같다', async () => {
    const s = await setup();
    const { ticket, done } = await s.upload(await jpeg(200, 200), {
      name: '현장.jpg',
      contentType: 'image/jpeg',
    });
    const again = await s.post(`/files/${ticket.file.id}/complete`);

    expect(again.status).toBe(200);
    expect(again.body).toEqual(done.body);
  });
});

describe('내려받기 주소', () => {
  it('사용 가능한 파일에만 짧은 만료의 원본·썸네일 주소를 발급한다', async () => {
    const s = await setup();
    const { ticket } = await s.upload(await jpeg(300, 300), {
      name: '현장.jpg',
      contentType: 'image/jpeg',
    });
    const original = fileUrlResponseSchema.parse(
      (await s.get(`/files/${ticket.file.id}/url`)).body,
    );
    const thumbnail = fileUrlResponseSchema.parse(
      (await s.get(`/files/${ticket.file.id}/url?variant=thumbnail`)).body,
    );

    expect(original.url).toContain('/original?download&expires=300');
    expect(thumbnail.url).toContain('/thumbnail?download');
    expect(original.expiresAt).toBe('2026-10-08T03:05:00.000Z');
  });

  it('검사 중이거나 거부된 파일, 썸네일 없는 문서의 썸네일은 발급하지 않는다', async () => {
    const s = await setup();
    const rejected = await s.upload(Buffer.alloc(100, 1), {
      name: '현장.jpg',
      contentType: 'image/jpeg',
    });
    const pdf = await s.upload(Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'), {
      name: '시공도.pdf',
      contentType: 'application/pdf',
      purpose: 'DOCUMENT',
    });

    expect((await s.get(`/files/${rejected.ticket.file.id}/url`)).status).toBe(400);
    expect((await s.get(`/files/${pdf.ticket.file.id}/url?variant=thumbnail`)).status).toBe(404);
    expect((await s.get(`/files/${pdf.ticket.file.id}/url`)).status).toBe(200);
  });

  it('다른 회사의 파일은 정보·주소·완료 알림 모두 존재하지 않는 것처럼 보인다', async () => {
    const a = await setup();
    const b = await setup();
    const { ticket } = await b.upload(await jpeg(100, 100), {
      name: '현장.jpg',
      contentType: 'image/jpeg',
    });

    expect((await a.get(`/files/${ticket.file.id}`)).status).toBe(404);
    expect((await a.get(`/files/${ticket.file.id}/url`)).status).toBe(404);
    expect((await a.post(`/files/${ticket.file.id}/complete`)).status).toBe(404);
  });
});
