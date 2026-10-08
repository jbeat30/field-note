import { fileUploadTicketSchema, searchResponseSchema } from '@field-note/shared';
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
    memos: createMemoService(db.app, () => NOW),
    search: createSearchService(db.app),
    appOrigin: 'http://localhost:5173',
  });

  return { memory, queue, files, instance };
};

let sequence = 0;

const signedUp = async (instance: Awaited<ReturnType<typeof harness>>['instance']) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `검색회사${sequence}`,
    adminName: '검색관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `search-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `search${sequence}@example.com`,
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

const searchFor = async (s: Awaited<ReturnType<typeof setup>>, query: string) => {
  const res = await s.get(`/search?${query}`);

  return { res, data: res.status === 200 ? searchResponseSchema.parse(res.body) : null };
};

// 프로젝트·직원·메모·자료·일지가 모두 '배관'을 담은 회사 한 곳을 만든다
const populate = async (s: Awaited<ReturnType<typeof setup>>) => {
  const memo = (
    await s.post('/memos', {
      content: '3층 배관 위치 다시 확인해야 함\n내일 오전',
      projectId: s.projectId,
    })
  ).body;
  const inboxMemo = (await s.post('/memos', { content: '메모함에 적은 배관 메모' })).body;
  const fileId = await s.docFile(s.projectId, true, '배관도.pdf');
  const document = (
    await s.post(`/projects/${s.projectId}/documents`, {
      fileId,
      title: '배관 시공도',
      category: 'CONTRACT',
    })
  ).body;
  const employee = (await s.post('/employees', { name: '배관반장', title: '반장' })).body;
  const project = await db.owner.project.findFirstOrThrow({ where: { id: s.projectId } });
  const workLog = await db.owner.workLog.create({
    data: {
      companyId: project.companyId,
      projectId: s.projectId,
      workDate: new Date('2026-10-06T00:00:00Z'),
      status: 'SAVED',
      content: '외장 판넬 설치 중 배관 간섭 확인',
      savedAt: new Date(),
    },
  });

  return { memo, inboxMemo, document, employee, workLog, project };
};

describe('통합 검색', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const s = await setup();

    expect((await request(s.instance).get('/api/v1/search?q=배관')).status).toBe(401);
  });

  it('프로젝트·직원·메모·자료·일지를 한꺼번에 찾고 종류마다 나눠 보여 준다', async () => {
    const s = await setup();
    const found = await populate(s);
    const { data } = await searchFor(s, 'q=배관');

    expect(data!.q).toBe('배관');
    expect(data!.employees.items).toEqual([
      expect.objectContaining({
        type: 'EMPLOYEE',
        id: found.employee.id,
        title: '배관반장',
        snippet: '반장',
        badge: null,
      }),
    ]);
    expect(data!.memos.items.map((item) => item.id).sort()).toEqual(
      [found.memo.id, found.inboxMemo.id].sort(),
    );
    expect(data!.documents.items).toEqual([
      expect.objectContaining({
        type: 'DOCUMENT',
        id: found.document.id,
        title: '배관 시공도',
        projectName: 'A동 판금 공사',
        badge: 'SENSITIVE',
      }),
    ]);
    expect(data!.workLogs.items).toEqual([
      expect.objectContaining({
        type: 'WORK_LOG',
        id: found.workLog.id,
        date: '2026-10-06',
        projectId: s.projectId,
        snippet: expect.stringContaining('배관 간섭'),
      }),
    ]);
    // 프로젝트는 이름·코드·현장 이름·주소로 찾음 ('배관'이 들어간 프로젝트가 없음)
    expect(data!.projects.items).toEqual([]);
  });

  it('프로젝트는 이름·코드·현장 이름으로 찾고 메모는 첫 줄이 제목, 검색어 주변이 발췌로 나온다', async () => {
    const s = await setup();
    const found = await populate(s);
    const byName = await searchFor(s, 'q=판금');
    const byCode = await searchFor(s, `q=${encodeURIComponent(found.project.code)}`);
    const memo = (await searchFor(s, 'q=배관')).data!.memos.items.find(
      (item) => item.id === found.memo.id,
    )!;

    expect(byName.data!.projects.items[0]).toMatchObject({
      type: 'PROJECT',
      id: s.projectId,
      title: 'A동 판금 공사',
    });
    expect(byCode.data!.projects.items.map((item) => item.id)).toContain(s.projectId);
    expect(memo.title).toBe('3층 배관 위치 다시 확인해야 함');
    expect(memo.snippet).toBe('3층 배관 위치 다시 확인해야 함 내일 오전');
    expect(memo).toMatchObject({
      projectId: s.projectId,
      projectName: 'A동 판금 공사',
      date: '2026-10-08',
    });
  });

  it('대소문자를 가리지 않고 퍼센트·밑줄 같은 글자는 그대로 찾는다', async () => {
    const s = await setup();

    await s.post('/memos', { content: 'Zinc 강판 100% 반입_완료' });

    expect((await searchFor(s, 'q=zINC')).data!.memos.items).toHaveLength(1);
    expect((await searchFor(s, `q=${encodeURIComponent('100%')}`)).data!.memos.items).toHaveLength(
      1,
    );
    expect((await searchFor(s, 'q=_')).data!.memos.items).toHaveLength(1);
    // 모든 글자와 맞는 와일드카드로 해석되지 않음
    await s.post('/memos', { content: '전혀 다른 메모' });
    expect((await searchFor(s, `q=${encodeURIComponent('%')}`)).data!.memos.items).toHaveLength(1);
  });

  it('종류마다 개수를 제한하고 더 있으면 알려 준다', async () => {
    const s = await setup();

    for (let i = 0; i < 4; i += 1) {
      await s.post('/memos', { content: `검색 대상 메모 ${i}` });
    }

    const limited = (await searchFor(s, 'q=대상&limit=3')).data!.memos;
    const all = (await searchFor(s, 'q=대상&limit=4')).data!.memos;

    expect(limited.items).toHaveLength(3);
    expect(limited.hasMore).toBe(true);
    expect(all.items).toHaveLength(4);
    expect(all.hasMore).toBe(false);
  });

  it('지운 메모·문서는 찾지 않는다', async () => {
    const s = await setup();
    const found = await populate(s);

    await s.del(`/memos/${found.memo.id}`);
    await s.del(`/documents/${found.document.id}`);

    const { data } = await searchFor(s, 'q=배관');

    expect(data!.memos.items.map((item) => item.id)).toEqual([found.inboxMemo.id]);
    expect(data!.documents.items).toEqual([]);
  });

  it('직원은 이름·직책으로만 찾고 연락처·생년월일·메모로는 찾지 않으며 퇴사자는 표시한다', async () => {
    const s = await setup();
    const kim = (
      await s.post('/employees', { name: '김반장', phone: '010-5555-1234', memo: '비밀메모키워드' })
    ).body;

    await s.patch(`/employees/${kim.id}`, { status: 'LEFT' });

    expect((await searchFor(s, 'q=5555')).data!.employees.items).toEqual([]);
    expect(
      (await searchFor(s, `q=${encodeURIComponent('비밀메모키워드')}`)).data!.employees.items,
    ).toEqual([]);
    expect(
      (await searchFor(s, `q=${encodeURIComponent('김반장')}`)).data!.employees.items[0],
    ).toMatchObject({ id: kim.id, badge: 'LEFT' });
  });

  it('프로젝트를 지정하면 그 프로젝트의 메모·자료·일지만 찾는다', async () => {
    const s = await setup();
    const found = await populate(s);
    const other = await s.otherProject();

    await s.post('/memos', { content: '다른 프로젝트의 배관 메모', projectId: other });

    const scoped = (await searchFor(s, `q=배관&projectId=${s.projectId}`)).data!;

    expect(scoped.memos.items.map((item) => item.id)).toEqual([found.memo.id]);
    expect(scoped.documents.items).toHaveLength(1);
    expect(scoped.workLogs.items).toHaveLength(1);
    // 프로젝트 안 검색에서는 프로젝트·직원을 찾지 않음
    expect(scoped.projects.items).toEqual([]);
    expect(scoped.employees.items).toEqual([]);
  });

  it('검색어가 없거나 너무 길거나 프로젝트 형식이 틀리면 거부한다', async () => {
    const s = await setup();

    for (const query of [
      'q=',
      'q=%20%20',
      `q=${'가'.repeat(51)}`,
      'q=가&projectId=abc',
      'q=가&limit=99',
      '',
    ]) {
      expect({ query, status: (await s.get(`/search?${query}`)).status }).toEqual({
        query,
        status: 400,
      });
    }
  });

  it('아무것도 없으면 빈 결과다', async () => {
    const s = await setup();
    const { data } = await searchFor(s, `q=${encodeURIComponent('없는검색어')}`);

    expect(data).toMatchObject({
      projects: { items: [], hasMore: false },
      employees: { items: [], hasMore: false },
      memos: { items: [], hasMore: false },
      documents: { items: [], hasMore: false },
      workLogs: { items: [], hasMore: false },
    });
  });

  it('다른 회사의 데이터는 어떤 검색어로도 나오지 않고 다른 회사의 프로젝트 안 검색은 없는 것처럼 보인다', async () => {
    const a = await setup();
    const b = await setup();
    const found = await populate(b);
    const { data } = await searchFor(a, 'q=배관');

    expect(data).toMatchObject({
      employees: { items: [] },
      memos: { items: [] },
      documents: { items: [] },
      workLogs: { items: [] },
    });
    expect(
      (await searchFor(a, `q=판금`)).data!.projects.items.map((item) => item.id),
    ).not.toContain(b.projectId);
    expect((await searchFor(a, `q=배관&projectId=${found.project.id}`)).res.status).toBe(404);
  });
});
