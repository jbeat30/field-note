import { fileUploadTicketSchema, photoSchema, photosResponseSchema } from '@field-note/shared';
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
import { createPhotoService } from '../photo/photoService';
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
    photos: createPhotoService(db.app, memory.storage, () => NOW),
    appOrigin: 'http://localhost:5173',
  });

  return { memory, queue, files, instance };
};

let sequence = 0;

const signedUp = async (instance: Awaited<ReturnType<typeof harness>>['instance']) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `사진회사${sequence}`,
    adminName: '사진관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `photo-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `photo${sequence}@example.com`,
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

    h.memory.upload(row.objectKey, bodies.get(fileId)!, 'image/jpeg');
    await post(`/files/${fileId}/complete`);
  };
  const photoFile = async (pid = projectId, uploaded = true) => {
    const body = await sharp({
      create: { width: 640, height: 480, channels: 3, background: '#396' },
    })
      .jpeg()
      .toBuffer();
    const ticket = fileUploadTicketSchema.parse(
      (
        await post(`/projects/${pid}/files`, {
          name: '현장.jpg',
          contentType: 'image/jpeg',
          purpose: 'PHOTO',
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
    photoFile,
    finish,
    otherProject,
  };
};

describe('사진 등록', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const s = await setup();
    const fileId = await s.photoFile();

    expect(
      (
        await request(s.instance)
          .post(`/api/v1/projects/${s.projectId}/photos`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ fileId })
      ).status,
    ).toBe(401);
    expect((await request(s.instance).get(`/api/v1/projects/${s.projectId}/photos`)).status).toBe(
      401,
    );
  });

  it('검사를 통과한 파일을 사진으로 등록하면 기본값과 썸네일 주소가 붙는다', async () => {
    const s = await setup();
    const fileId = await s.photoFile();
    const res = await s.post(`/projects/${s.projectId}/photos`, { fileId });
    const photo = photoSchema.parse(res.body);

    expect(res.status).toBe(201);
    expect(photo).toMatchObject({
      fileId,
      projectId: s.projectId,
      category: 'OTHER',
      area: null,
      description: null,
      isCover: false,
      takenAt: NOW.toISOString(),
      // 서울 기준 날짜
      workDate: '2026-10-08',
      file: { status: 'READY', rejectReason: null },
    });
    expect(photo.thumbnailUrl).toContain('/thumbnail?download');
  });

  it('촬영일시와 작업일을 따로 지정할 수 있고 작업일 기본값은 서울 기준 촬영일이다', async () => {
    const s = await setup();
    const late = await s.post(`/projects/${s.projectId}/photos`, {
      fileId: await s.photoFile(),
      category: 'BEFORE',
      area: '3층 301호',
      description: '철거 전',
      // UTC로는 10-07이지만 서울은 10-08 01:30
      takenAt: '2026-10-07T16:30:00Z',
    });
    const set = await s.post(`/projects/${s.projectId}/photos`, {
      fileId: await s.photoFile(),
      takenAt: '2026-10-07T16:30:00Z',
      workDate: '2026-10-07',
    });

    expect(late.body).toMatchObject({
      category: 'BEFORE',
      area: '3층 301호',
      description: '철거 전',
      workDate: '2026-10-08',
    });
    expect(set.body.workDate).toBe('2026-10-07');
  });

  it('아직 검사 전인 파일도 등록할 수 있고 썸네일 주소는 검사가 끝나면 생긴다', async () => {
    const s = await setup();
    const fileId = await s.photoFile(s.projectId, false);
    const created = photoSchema.parse(
      (await s.post(`/projects/${s.projectId}/photos`, { fileId })).body,
    );

    expect(created.file.status).toBe('PENDING');
    expect(created.thumbnailUrl).toBeNull();

    await s.finish(fileId);

    expect(
      photoSchema.parse((await s.get(`/photos/${created.id}`)).body).thumbnailUrl,
    ).not.toBeNull();
  });

  it('같은 파일을 다시 등록하면 같은 사진을 돌려주고 새로 만들지 않는다', async () => {
    const s = await setup();
    const fileId = await s.photoFile();
    const first = await s.post(`/projects/${s.projectId}/photos`, { fileId, category: 'AFTER' });
    const again = await s.post(`/projects/${s.projectId}/photos`, { fileId, category: 'DURING' });

    expect(again.body.id).toBe(first.body.id);
    expect(again.body.category).toBe('AFTER');
    expect(await db.owner.photo.count({ where: { fileId } })).toBe(1);
  });

  it('다른 프로젝트·문서·거부된 파일·없는 파일·다른 회사의 파일은 등록할 수 없다', async () => {
    const s = await setup();
    const other = await setup();
    const second = await s.otherProject();
    const elsewhere = await s.photoFile(second);
    const pdf = fileUploadTicketSchema.parse(
      (
        await s.post(`/projects/${s.projectId}/files`, {
          name: '도면.pdf',
          contentType: 'application/pdf',
          purpose: 'DOCUMENT',
          size: 10,
        })
      ).body,
    ).file.id;
    const rejected = await s.upload(Buffer.alloc(50, 1), {
      name: '가짜.jpg',
      contentType: 'image/jpeg',
    });
    const foreign = await other.photoFile();

    for (const fileId of [
      elsewhere,
      pdf,
      rejected.ticket.file.id,
      '018f3b1e-0000-7000-8000-000000000000',
      foreign,
    ]) {
      const res = await s.post(`/projects/${s.projectId}/photos`, { fileId });

      expect({ fileId, status: res.status }).toEqual({ fileId, status: 400 });
    }

    expect(
      (await s.post(`/projects/${other.projectId}/photos`, { fileId: await s.photoFile() })).status,
    ).toBe(404);
  });

  it('구분·구역·설명이 형식에 맞지 않으면 거부한다', async () => {
    const s = await setup();
    const fileId = await s.photoFile();

    for (const extra of [
      { category: 'VIDEO' },
      { area: 'ㄱ'.repeat(101) },
      { description: '가'.repeat(501) },
      { workDate: '10월 8일' },
      { takenAt: '어제' },
    ]) {
      expect((await s.post(`/projects/${s.projectId}/photos`, { fileId, ...extra })).status).toBe(
        400,
      );
    }
  });
});

describe('사진첩 조회', () => {
  it('촬영일시 최근순이고 구분·구역·작업일로 거를 수 있다', async () => {
    const s = await setup();
    const make = async (body: object) =>
      (await s.post(`/projects/${s.projectId}/photos`, { fileId: await s.photoFile(), ...body }))
        .body.id as string;
    const a = await make({
      category: 'BEFORE',
      area: '301호',
      takenAt: '2026-10-05T01:00:00Z',
      workDate: '2026-10-05',
    });
    const b = await make({ category: 'AFTER', area: '301호', takenAt: '2026-10-06T01:00:00Z' });
    const c = await make({ category: 'AFTER', area: '302호', takenAt: '2026-10-07T01:00:00Z' });
    const ids = async (query = '') =>
      photosResponseSchema
        .parse((await s.get(`/projects/${s.projectId}/photos${query}`)).body)
        .items.map((item) => item.id);

    expect(await ids()).toEqual([c, b, a]);
    expect(await ids('?category=AFTER')).toEqual([c, b]);
    expect(await ids('?area=301호')).toEqual([b, a]);
    expect(await ids('?workDate=2026-10-05')).toEqual([a]);
    expect(await ids('?category=SAFETY')).toEqual([]);
  });

  it('커서로 이어서 읽으면 빠지거나 겹치는 사진이 없다', async () => {
    const s = await setup();
    const made: string[] = [];

    // 촬영일시가 같은 사진도 id 순서로 안정적으로 나뉘어야 함
    for (let i = 0; i < 5; i += 1) {
      made.push(
        (
          await s.post(`/projects/${s.projectId}/photos`, {
            fileId: await s.photoFile(),
            takenAt: i < 3 ? '2026-10-05T01:00:00Z' : `2026-10-0${i + 3}T01:00:00Z`,
          })
        ).body.id,
      );
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;

    do {
      const res: request.Response = await s.get(
        `/projects/${s.projectId}/photos?limit=2${cursor ? `&cursor=${cursor}` : ''}`,
      );
      const page = photosResponseSchema.parse(res.body);

      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor);

    expect(pages).toBe(3);
    expect(new Set(seen).size).toBe(5);
    expect([...seen].sort()).toEqual([...made].sort());
    expect((await s.get(`/projects/${s.projectId}/photos?cursor=망가진값`)).status).toBe(400);
  });

  it('다른 회사의 프로젝트나 사진은 존재하지 않는 것처럼 보인다', async () => {
    const a = await setup();
    const b = await setup();
    const photo = (await b.post(`/projects/${b.projectId}/photos`, { fileId: await b.photoFile() }))
      .body.id;

    expect((await a.get(`/projects/${b.projectId}/photos`)).status).toBe(404);
    expect((await a.get(`/photos/${photo}`)).status).toBe(404);
    expect((await a.patch(`/photos/${photo}`, { category: 'AFTER' })).status).toBe(404);
    expect((await a.del(`/photos/${photo}`)).status).toBe(404);
  });
});

describe('사진 수정·대표 사진·삭제', () => {
  it('구분·구역·설명·시각을 고치고 비울 수 있다', async () => {
    const s = await setup();
    const id = (
      await s.post(`/projects/${s.projectId}/photos`, {
        fileId: await s.photoFile(),
        area: '301호',
        description: '처음',
      })
    ).body.id;
    const res = await s.patch(`/photos/${id}`, {
      category: 'DEFECT',
      area: null,
      description: null,
      takenAt: '2026-10-06T00:00:00Z',
      workDate: '2026-10-06',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      category: 'DEFECT',
      area: null,
      description: null,
      takenAt: '2026-10-06T00:00:00.000Z',
      workDate: '2026-10-06',
    });
    expect((await s.patch(`/photos/${id}`, {})).status).toBe(400);
  });

  it('대표 사진은 프로젝트마다 한 장이고 다른 프로젝트에는 영향이 없다', async () => {
    const s = await setup();
    const second = await s.otherProject();
    const make = async (pid: string) =>
      (await s.post(`/projects/${pid}/photos`, { fileId: await s.photoFile(pid) })).body
        .id as string;
    const [a, b, other] = [await make(s.projectId), await make(s.projectId), await make(second)];

    await s.patch(`/photos/${a}`, { isCover: true });
    await s.patch(`/photos/${other}`, { isCover: true });
    await s.patch(`/photos/${b}`, { isCover: true });

    const covers = async (pid: string) =>
      photosResponseSchema
        .parse((await s.get(`/projects/${pid}/photos`)).body)
        .items.filter((item) => item.isCover)
        .map((item) => item.id);

    expect(await covers(s.projectId)).toEqual([b]);
    expect(await covers(second)).toEqual([other]);
  });

  it('삭제하면 목록과 조회에서 사라지지만 파일과 기록은 남는다', async () => {
    const s = await setup();
    const fileId = await s.photoFile();
    const id = (await s.post(`/projects/${s.projectId}/photos`, { fileId })).body.id;

    await s.patch(`/photos/${id}`, { isCover: true });

    const res = await s.del(`/photos/${id}`);

    expect(res.body).toEqual({ success: true });
    expect((await s.get(`/photos/${id}`)).status).toBe(404);
    expect((await s.del(`/photos/${id}`)).status).toBe(404);
    expect((await s.patch(`/photos/${id}`, { category: 'AFTER' })).status).toBe(404);
    expect(
      photosResponseSchema.parse((await s.get(`/projects/${s.projectId}/photos`)).body).items,
    ).toEqual([]);

    const row = await db.owner.photo.findFirstOrThrow({ where: { id } });

    expect(row.deletedAt).not.toBeNull();
    expect(row.isCover).toBe(false);
    expect((await s.get(`/files/${fileId}`)).status).toBe(200);
    // 지운 사진의 파일은 다시 사진으로 등록할 수 없다
    expect((await s.post(`/projects/${s.projectId}/photos`, { fileId })).status).toBe(400);
  });
});
