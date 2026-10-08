import ExcelJS from 'exceljs';
import {
  dailyReportSchema,
  fileUploadTicketSchema,
  optionsResponseSchema,
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
import { createOptionService } from '../company/optionService';
import { createMaterialService } from '../material/materialService';
import { createPhotoService } from '../photo/photoService';
import { createReportService } from '../report/reportService';
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
    options: createOptionService(db.app),
    photos: createPhotoService(db.app, memory.storage, () => NOW),
    materials: createMaterialService(db.app, () => NOW),
    reports: createReportService(db.app, memory.storage, () => NOW),
    appOrigin: 'http://localhost:5173',
  });

  return { memory, queue, files, instance };
};

let sequence = 0;

const signedUp = async (instance: Awaited<ReturnType<typeof harness>>['instance']) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `보고서회사${sequence}`,
    adminName: '보고서관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `report-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `report${sequence}@example.com`,
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

const DAY = '2026-10-06';

// 한 프로젝트에 하루치 일지(직원 2명·작업 구분)와 자재 기록, 사진 한 장을 만들어 둠
const populate = async (s: Awaited<ReturnType<typeof setup>>) => {
  const project = await db.owner.project.findFirstOrThrow({ where: { id: s.projectId } });
  const kim = (await s.post('/employees', { name: '김설치' })).body.id as string;
  const lee = (await s.post('/employees', { name: '이가공' })).body.id as string;
  const categories = optionsResponseSchema
    .parse((await s.get('/company/options')).body)
    .items.filter((item) => item.kind === 'WORK_CATEGORY');
  const log = await db.owner.workLog.create({
    data: {
      companyId: project.companyId,
      projectId: s.projectId,
      workDate: new Date(`${DAY}T00:00:00Z`),
      status: 'SAVED',
      content: '3층 외장 패널 설치\n배관 간섭 구간 조정',
      area: '3층',
      notes: '오후 우천 중단',
      isChange: true,
      savedAt: new Date(),
    },
  });

  for (const [employeeId, categoryId, minutes] of [
    [kim, categories[0]!.id, 480],
    [kim, categories[1]!.id, 120],
    [lee, categories[0]!.id, 240],
  ] as const) {
    await db.owner.workLogEntry.create({
      data: { companyId: project.companyId, workLogId: log.id, employeeId, categoryId, minutes },
    });
  }

  const material = (await s.post('/materials', { name: '아연도강판', spec: '1.0T', unit: '장' }))
    .body.id as string;

  await s.post(`/projects/${s.projectId}/material-records`, {
    materialId: material,
    recordDate: DAY,
    kind: 'USED',
    quantity: 12.5,
    area: '3층',
    isChange: true,
  });
  await s.post(`/projects/${s.projectId}/material-records`, {
    materialId: material,
    recordDate: DAY,
    kind: 'RECEIVED',
    quantity: 100,
  });
  // 다른 날 기록 (그날 보고서에는 나오면 안 됨)
  await s.post(`/projects/${s.projectId}/material-records`, {
    materialId: material,
    recordDate: '2026-10-07',
    kind: 'USED',
    quantity: 3,
  });

  const fileId = await s.photoFile();
  const photo = (
    await s.post(`/projects/${s.projectId}/photos`, {
      fileId,
      category: 'AFTER',
      area: '3층',
      description: '설치 완료',
      takenAt: `${DAY}T05:00:00Z`,
      workDate: DAY,
    })
  ).body;

  return { log, kim, lee, material, photo, categories, project };
};

const report = async (
  s: Awaited<ReturnType<typeof setup>>,
  date = DAY,
  projectId = s.projectId,
) => {
  const res = await s.get(`/projects/${projectId}/daily-reports/${date}`);

  return { res, data: res.status === 200 ? dailyReportSchema.parse(res.body) : null };
};

describe('작업일보', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const s = await setup();

    expect(
      (await request(s.instance).get(`/api/v1/projects/${s.projectId}/daily-reports/${DAY}`))
        .status,
    ).toBe(401);
    expect(
      (
        await request(s.instance).get(
          `/api/v1/projects/${s.projectId}/daily-reports.xlsx?from=${DAY}&to=${DAY}`,
        )
      ).status,
    ).toBe(401);
  });

  it('그날의 일지·인원·공수·자재·사진을 한 장에 모은다', async () => {
    const s = await setup();
    const found = await populate(s);
    const { data } = await report(s);

    expect(data).toMatchObject({
      companyName: expect.stringContaining('보고서회사'),
      project: {
        id: s.projectId,
        name: 'A동 판금 공사',
        siteName: 'A동 현장',
        clientName: '가나다건설',
      },
      date: DAY,
      workLog: {
        status: 'SAVED',
        content: '3층 외장 패널 설치\n배관 간섭 구간 조정',
        area: '3층',
        notes: '오후 우천 중단',
        isChange: true,
        isAfterService: false,
      },
      // 같은 직원이 두 줄이어도 인원은 두 명, 공수는 분 합계 840
      totals: { headcount: 2, minutes: 840 },
      settings: { workUnitMode: 'RATIO', standardWorkMinutes: 480 },
      hasMorePhotos: false,
    });
    // 직원 이름순(김설치 두 줄 → 이가공), 줄마다 작업 구분 이름이 붙음
    expect(data!.entries.map((entry) => entry.employeeName)).toEqual([
      '김설치',
      '김설치',
      '이가공',
    ]);
    expect(data!.entries.map((entry) => entry.minutes).sort((a, b) => a - b)).toEqual([
      120, 240, 480,
    ]);
    expect(data!.entries.every((entry) => entry.categoryName.length > 0)).toBe(true);
    // 그날 자재만 (다음 날 기록은 제외)
    expect(data!.materials.map((item) => [item.kind, item.quantity])).toEqual([
      ['USED', 12.5],
      ['RECEIVED', 100],
    ]);
    expect(data!.materials[0]).toMatchObject({
      materialName: '아연도강판',
      spec: '1.0T',
      unit: '장',
      area: '3층',
      isChange: true,
    });
    expect(data!.photos).toHaveLength(1);
    expect(data!.photos[0]).toMatchObject({
      id: found.photo.id,
      category: 'AFTER',
      area: '3층',
      description: '설치 완료',
    });
    expect(data!.photos[0]!.thumbnailUrl).toContain('/thumbnail?download');
  });

  it('그날 일지가 없어도 자재·사진이 있으면 보고서가 만들어지고, 아무것도 없으면 빈 보고서다', async () => {
    const s = await setup();

    await populate(s);

    const materialOnly = (await report(s, '2026-10-07')).data!;
    const empty = (await report(s, '2026-10-01')).data!;

    expect(materialOnly.workLog).toBeNull();
    expect(materialOnly.entries).toEqual([]);
    expect(materialOnly.totals).toEqual({ headcount: 0, minutes: 0 });
    expect(materialOnly.materials).toHaveLength(1);
    expect(empty).toMatchObject({ workLog: null, entries: [], materials: [], photos: [] });
  });

  it('지운 자재 기록·지운 사진은 빼고 검사 전 사진은 주소 없이 나온다', async () => {
    const s = await setup();
    const found = await populate(s);
    const records = (await s.get(`/projects/${s.projectId}/material-records?date=${DAY}`)).body
      .items;

    await s.del(`/material-records/${records[0].id}`);
    await s.del(`/photos/${found.photo.id}`);

    const pending = await s.photoFile(s.projectId, false);

    await s.post(`/projects/${s.projectId}/photos`, { fileId: pending, workDate: DAY });

    const { data } = await report(s);

    expect(data!.materials).toHaveLength(1);
    expect(data!.photos).toHaveLength(1);
    expect(data!.photos[0]!.thumbnailUrl).toBeNull();
    // 검사가 끝나지 않았다고 알려 화면이 잠시 뒤 다시 읽게 함
    expect(data!.photos[0]!.isProcessing).toBe(true);
  });

  it('검사에서 거부된 사진은 보고서에 싣지 않는다', async () => {
    const s = await setup();
    const fileId = await s.photoFile(s.projectId, false);

    // 검사 중에 사진으로 등록된 뒤 내용이 맞지 않아 거부되는 경우
    expect(
      (await s.post(`/projects/${s.projectId}/photos`, { fileId, workDate: DAY })).status,
    ).toBe(201);
    expect((await report(s)).data!.photos).toHaveLength(1);

    const row = await db.owner.storedFile.findFirstOrThrow({ where: { id: fileId } });

    s.memory.upload(row.objectKey, Buffer.from('신청한 크기와 다른 내용'), 'image/jpeg');
    await s.post(`/files/${fileId}/complete`);

    expect((await s.get(`/files/${fileId}`)).body.status).toBe('REJECTED');
    expect((await report(s)).data!.photos).toEqual([]);
  });

  it('사진은 24장까지만 싣고 더 있으면 알려 준다', async () => {
    const s = await setup();
    const project = await db.owner.project.findFirstOrThrow({ where: { id: s.projectId } });
    const user = await db.owner.user.findFirstOrThrow({ where: { companyId: project.companyId } });
    const file = await s.photoFile();
    const base = await db.owner.storedFile.findFirstOrThrow({ where: { id: file } });

    for (let i = 0; i < 25; i += 1) {
      const row = await db.owner.storedFile.create({
        data: {
          companyId: project.companyId,
          projectId: s.projectId,
          purpose: 'PHOTO',
          status: 'READY',
          originalName: `p${i}.jpg`,
          contentType: 'image/jpeg',
          sizeBytes: 10n,
          objectKey: `${base.objectKey}-${i}`,
          thumbnailKey: `${base.objectKey}-${i}-t`,
          sha256: 'a'.repeat(64),
          uploadedBy: user.id,
          readyAt: new Date(),
        },
      });

      await db.owner.photo.create({
        data: {
          companyId: project.companyId,
          projectId: s.projectId,
          fileId: row.id,
          takenAt: new Date(`${DAY}T0${i % 9}:00:00Z`),
          workDate: new Date(`${DAY}T00:00:00Z`),
          uploadedBy: user.id,
        },
      });
    }

    const { data } = await report(s);

    expect(data!.photos).toHaveLength(24);
    expect(data!.hasMorePhotos).toBe(true);
  });

  it('공수 표시 방식과 하루 기준시간은 회사 설정을 따른다', async () => {
    const s = await setup();
    const project = await db.owner.project.findFirstOrThrow({ where: { id: s.projectId } });

    await db.owner.companySettings.create({
      data: {
        companyId: project.companyId,
        standardWorkMinutes: 420,
        monthlyWorkDays: 22,
        workUnitMode: 'HOURS',
      },
    });

    expect((await report(s)).data!.settings).toEqual({
      workUnitMode: 'HOURS',
      standardWorkMinutes: 420,
    });
  });

  it('날짜 형식이 틀리면 거부하고 없거나 다른 회사의 프로젝트는 없는 것처럼 보인다', async () => {
    const a = await setup();
    const b = await setup();

    expect((await a.get(`/projects/${a.projectId}/daily-reports/10월8일`)).status).toBe(400);
    expect((await a.get(`/projects/${b.projectId}/daily-reports/${DAY}`)).status).toBe(404);
    expect(
      (await a.get(`/projects/018f3b1e-0000-7000-8000-000000000000/daily-reports/${DAY}`)).status,
    ).toBe(404);
  });

  it('다른 회사의 일지·자재·사진은 보고서에 나오지 않는다', async () => {
    const a = await setup();
    const b = await setup();

    await populate(b);

    const { data } = await report(a);

    expect(data).toMatchObject({ workLog: null, entries: [], materials: [], photos: [] });
  });
});

const workbookOf = async (buffer: Buffer) => {
  const book = new ExcelJS.Workbook();

  await book.xlsx.load(buffer as never);

  return book;
};

const rowsOf = (sheet: ExcelJS.Worksheet) =>
  sheet
    .getSheetValues()
    .slice(1)
    .map((row) => (row as unknown[]).slice(1));

describe('엑셀 내보내기', () => {
  const download = (s: Awaited<ReturnType<typeof setup>>, query: string, projectId = s.projectId) =>
    s
      .get(`/projects/${projectId}/daily-reports.xlsx?${query}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

  it('엑셀 파일을 내려주고 한글 파일 이름이 헤더에 담긴다', async () => {
    const s = await setup();

    await populate(s);

    const res = await download(s, `from=${DAY}&to=2026-10-07`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(
      decodeURIComponent(String(res.headers['content-disposition']).split("UTF-8''")[1]!),
    ).toMatch(/^작업일보_\d{4}-\d{3}_2026-10-06_2026-10-07\.xlsx$/);
  });

  it('요약·작업일보·공수·자재 시트에 한글 내용과 숫자가 그대로 담긴다', async () => {
    const s = await setup();

    await populate(s);

    const book = await workbookOf((await download(s, `from=2026-10-01&to=2026-10-31`)).body);

    expect(book.worksheets.map((sheet) => sheet.name)).toEqual([
      '요약',
      '작업일보',
      '공수',
      '자재',
    ]);

    const summary = rowsOf(book.getWorksheet('요약')!);

    expect(summary).toContainEqual(['프로젝트', expect.stringContaining('A동 판금 공사')]);
    expect(summary).toContainEqual(['기간', '2026-10-01 ~ 2026-10-31']);
    expect(summary).toContainEqual(['공수 단위', 'MD']);

    const logs = rowsOf(book.getWorksheet('작업일보')!);

    expect(logs).toHaveLength(2);
    expect(logs[1]).toEqual([
      DAY,
      '저장됨',
      '3층 외장 패널 설치\n배관 간섭 구간 조정',
      '3층',
      '오후 우천 중단',
      'O',
      '',
      2,
      1.75,
    ]);

    const work = rowsOf(book.getWorksheet('공수')!);

    expect(work.slice(1).map((row) => [row[1], row[4]])).toEqual([
      ['김설치', 1],
      ['김설치', 0.25],
      ['이가공', 0.5],
    ]);

    const materials = rowsOf(book.getWorksheet('자재')!);

    expect(
      materials.slice(1).map((row) => [row[0], row[1], row[2], row[3], row[4], row[5]]),
    ).toEqual([
      [DAY, '아연도강판', '1.0T', '사용', 12.5, '장'],
      [DAY, '아연도강판', '1.0T', '반입', 100, '장'],
      ['2026-10-07', '아연도강판', '1.0T', '사용', 3, '장'],
    ]);
  });

  it('기간 밖의 기록은 담지 않는다', async () => {
    const s = await setup();

    await populate(s);

    const book = await workbookOf((await download(s, `from=2026-10-07&to=2026-10-07`)).body);

    expect(rowsOf(book.getWorksheet('작업일보')!)).toHaveLength(1);
    expect(rowsOf(book.getWorksheet('자재')!)).toHaveLength(2);
  });

  it('내보낼 때마다 감사 기록이 남고 문서 열람 기록에는 섞이지 않는다', async () => {
    const s = await setup();

    await populate(s);
    await download(s, `from=${DAY}&to=${DAY}`);
    await download(s, `from=2026-10-01&to=2026-10-31`);

    const logs = await db.owner.auditLog.findMany({
      where: { targetId: s.projectId },
      orderBy: { createdAt: 'asc' },
    });

    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({
      action: 'REPORT_EXPORTED',
      detail: { kind: 'DAILY_REPORT_XLSX', from: DAY, to: DAY, workLogs: 1, materialRecords: 2 },
    });
    expect(logs[1]!.createdAt.toISOString()).toBe(NOW.toISOString());
  });

  it('기간이 잘못됐으면 거부하고 기록을 남기지 않으며 다른 회사 프로젝트는 404다', async () => {
    const a = await setup();
    const b = await setup();

    for (const query of [
      'from=2026-10-05&to=2026-10-01',
      'from=2026-01-01&to=2026-12-31',
      'from=오늘&to=2026-10-01',
      'from=2026-10-01',
    ]) {
      expect({ query, status: (await download(a, query)).status }).toEqual({ query, status: 400 });
    }

    expect((await download(a, `from=${DAY}&to=${DAY}`, b.projectId)).status).toBe(404);
    expect(
      await db.owner.auditLog.count({
        where: { action: 'REPORT_EXPORTED', targetId: { in: [a.projectId, b.projectId] } },
      }),
    ).toBe(0);
  });
});
