import { memoSchema, memoSummarySchema, memosResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createEmployeeService } from '../employee/employeeService';
import { createMemoService } from '../memo/memoService';
import { createProjectService } from '../project/projectService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

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

const NOW_DATE = '2026-10-08';

const harness = () =>
  createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    employees: createEmployeeService(db.app, () => NOW),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => NOW),
    memos: createMemoService(db.app, () => NOW),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof harness>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `메모회사${sequence}`,
    adminName: '메모관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `memo-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `memo${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const setup = async () => {
  const instance = harness();
  const cookie = await signedUp(instance);
  const send = (method: 'post' | 'patch' | 'delete', path: string, body: object = {}) => {
    const req = request(instance);
    const target = `/api/v1${path}`;
    const call =
      method === 'post'
        ? req.post(target)
        : method === 'patch'
          ? req.patch(target)
          : req.delete(target);

    return call.set(CSRF_HEADER, CSRF_HEADER_VALUE).set('Cookie', cookie).send(body);
  };
  const post = (path: string, body: object = {}) => send('post', path, body);
  const patch = (path: string, body: object) => send('patch', path, body);
  const del = (path: string) => send('delete', path);
  const get = (path: string) => request(instance).get(`/api/v1${path}`).set('Cookie', cookie);
  const clientId = (await post('/partners', { kind: 'CLIENT', name: '가나다건설' })).body.id;
  const managerId = (await post('/employees', { name: '박소장' })).body.id;
  const project = async (name = 'A동 판금 공사') =>
    (
      await post('/projects', {
        name,
        siteName: `${name} 현장`,
        clientId,
        managerId,
        contractDate: '2026-09-01',
        plannedStart: '2026-10-01',
        plannedEnd: '2026-12-31',
      })
    ).body.id as string;
  const memo = async (body: object) => memoSchema.parse((await post('/memos', body)).body);
  const list = async (query: string) =>
    memosResponseSchema.parse((await get(`/memos?${query}`)).body);
  const summary = async () => memoSummarySchema.parse((await get('/memos/summary')).body);

  return { instance, cookie, post, patch, del, get, project, memo, list, summary };
};

describe('메모 저장', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const s = await setup();

    expect(
      (
        await request(s.instance)
          .post('/api/v1/memos')
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ content: '메모' })
      ).status,
    ).toBe(401);
    expect((await request(s.instance).get('/api/v1/memos/summary')).status).toBe(401);
  });

  it('한 줄만 적어도 저장되고 프로젝트가 없으면 메모함에 들어간다', async () => {
    const s = await setup();
    const memo = await s.memo({ content: '  철거 일정 전화해야 함 ' });

    expect(memo).toMatchObject({
      projectId: null,
      content: '철거 일정 전화해야 함',
      tag: 'OTHER',
      // 서울 기준 오늘
      memoDate: NOW_DATE,
      isDone: false,
      doneAt: null,
    });
  });

  it('프로젝트·태그·날짜를 정해 저장할 수 있다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const memo = await s.memo({
      content: '고객이 외장 색상을 변경하자고 함',
      tag: 'NEGOTIATION',
      memoDate: '2026-10-05',
      projectId,
    });

    expect(memo).toMatchObject({ projectId, tag: 'NEGOTIATION', memoDate: '2026-10-05' });
  });

  it('빈 내용·잘못된 태그·다른 회사의 프로젝트는 거부한다', async () => {
    const a = await setup();
    const b = await setup();
    const foreign = await b.project();

    for (const body of [
      { content: '   ' },
      { content: '가', tag: 'IDEA' },
      { content: '가', memoDate: '내일' },
      { content: '가', projectId: foreign },
      { content: '가', projectId: '018f3b1e-0000-7000-8000-000000000000' },
    ]) {
      expect((await a.post('/memos', body)).status).toBe(400);
    }

    expect((await a.summary()).inboxCount).toBe(0);
  });
});

describe('메모함과 메모 노트 조회', () => {
  it('메모함에는 프로젝트가 없는 메모만, 메모 노트에는 그 프로젝트 메모만 날짜 최근순으로 나온다', async () => {
    const s = await setup();
    const p1 = await s.project('A동');
    const p2 = await s.project('B동');
    const inbox = await s.memo({ content: '메모함', memoDate: '2026-10-07' });
    const a1 = await s.memo({ content: 'A 오래된', projectId: p1, memoDate: '2026-10-01' });
    const a2 = await s.memo({ content: 'A 최근', projectId: p1, memoDate: '2026-10-06' });

    await s.memo({ content: 'B', projectId: p2 });

    expect((await s.list('scope=INBOX')).items.map((item) => item.id)).toEqual([inbox.id]);
    expect((await s.list(`scope=PROJECT&projectId=${p1}`)).items.map((item) => item.id)).toEqual([
      a2.id,
      a1.id,
    ]);
  });

  it('태그와 완료 여부로 거르고 커서로 이어 읽으면 빠지거나 겹치지 않는다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const made: string[] = [];

    for (let i = 0; i < 5; i += 1) {
      made.push(
        (
          await s.memo({
            content: `메모 ${i}`,
            projectId,
            tag: i % 2 === 0 ? 'TODO' : 'ISSUE',
            // 같은 날짜가 섞여도 id 순서로 안정적으로 나뉘어야 함
            memoDate: i < 3 ? '2026-10-05' : '2026-10-06',
          })
        ).id,
      );
    }

    await s.patch(`/memos/${made[0]}`, { isDone: true });

    const todos = await s.list(`scope=PROJECT&projectId=${projectId}&tag=TODO&isDone=false`);

    expect(todos.items.map((item) => item.id).sort()).toEqual([made[2], made[4]].sort());

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;

    do {
      const page = await s.list(
        `scope=PROJECT&projectId=${projectId}&limit=2${cursor ? `&cursor=${cursor}` : ''}`,
      );

      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor);

    expect(pages).toBe(3);
    expect([...seen].sort()).toEqual([...made].sort());
    expect((await s.get('/memos?scope=INBOX&cursor=망가진값')).status).toBe(400);
  });

  it('범위와 프로젝트 지정이 맞지 않으면 거부하고 다른 회사의 프로젝트는 없는 것처럼 보인다', async () => {
    const a = await setup();
    const b = await setup();
    const foreign = await b.project();

    expect((await a.get('/memos?scope=PROJECT')).status).toBe(400);
    expect((await a.get(`/memos?scope=INBOX&projectId=${foreign}`)).status).toBe(400);
    expect((await a.get(`/memos?scope=PROJECT&projectId=${foreign}`)).status).toBe(404);
  });

  it('정리 안 된 메모함 건수와 끝내지 않은 할 일 건수를 알려 준다', async () => {
    const s = await setup();
    const projectId = await s.project();

    await s.memo({ content: '메모함 1' });
    const todo = await s.memo({ content: '메모함 할 일', tag: 'TODO' });
    await s.memo({ content: '프로젝트 할 일', tag: 'TODO', projectId });
    await s.memo({ content: '프로젝트 메모', projectId });

    expect(await s.summary()).toEqual({ inboxCount: 2, openTodoCount: 2 });

    await s.patch(`/memos/${todo.id}`, { isDone: true });

    expect(await s.summary()).toEqual({ inboxCount: 2, openTodoCount: 1 });
  });
});

describe('메모 정리·수정·삭제', () => {
  it('메모함의 메모를 프로젝트에 연결하면 메모함에서 빠지고, null로 되돌리면 다시 메모함에 온다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const memo = await s.memo({ content: '나중에 정리' });

    expect((await s.patch(`/memos/${memo.id}`, { projectId })).body.projectId).toBe(projectId);
    expect((await s.summary()).inboxCount).toBe(0);
    expect((await s.patch(`/memos/${memo.id}`, { projectId: null })).body.projectId).toBeNull();
    expect((await s.summary()).inboxCount).toBe(1);
  });

  it('다른 회사의 프로젝트에는 연결할 수 없다', async () => {
    const a = await setup();
    const b = await setup();
    const memo = await a.memo({ content: '메모' });

    expect((await a.patch(`/memos/${memo.id}`, { projectId: await b.project() })).status).toBe(400);
  });

  it('내용·태그·날짜를 고칠 수 있고 바꿀 값이 없으면 거부한다', async () => {
    const s = await setup();
    const memo = await s.memo({ content: '처음' });
    const res = await s.patch(`/memos/${memo.id}`, {
      content: '고친 내용',
      tag: 'INSTRUCTION',
      memoDate: '2026-10-03',
    });

    expect(res.body).toMatchObject({
      content: '고친 내용',
      tag: 'INSTRUCTION',
      memoDate: '2026-10-03',
    });
    expect((await s.patch(`/memos/${memo.id}`, {})).status).toBe(400);
    expect((await s.patch(`/memos/${memo.id}`, { content: '  ' })).status).toBe(400);
  });

  it('완료 표시는 할 일 메모에만 되고 완료 시각이 남으며 되돌릴 수 있다', async () => {
    const s = await setup();
    const todo = await s.memo({ content: '자재 주문', tag: 'TODO' });
    const note = await s.memo({ content: '일반 메모' });
    const done = await s.patch(`/memos/${todo.id}`, { isDone: true });

    expect(done.body).toMatchObject({ isDone: true, doneAt: NOW.toISOString() });
    // 다시 완료로 보내도 완료 시각은 그대로
    expect((await s.patch(`/memos/${todo.id}`, { isDone: true })).body.doneAt).toBe(
      NOW.toISOString(),
    );
    expect((await s.patch(`/memos/${todo.id}`, { isDone: false })).body).toMatchObject({
      isDone: false,
      doneAt: null,
    });
    expect((await s.patch(`/memos/${note.id}`, { isDone: true })).status).toBe(400);
  });

  it('할 일이 아닌 태그로 바꾸면 완료 표시가 사라진다', async () => {
    const s = await setup();
    const todo = await s.memo({ content: '전화', tag: 'TODO' });

    await s.patch(`/memos/${todo.id}`, { isDone: true });

    const changed = await s.patch(`/memos/${todo.id}`, { tag: 'ISSUE' });

    expect(changed.body).toMatchObject({ tag: 'ISSUE', isDone: false, doneAt: null });
  });

  it('삭제하면 목록·조회·건수에서 빠지지만 기록은 남는다', async () => {
    const s = await setup();
    const memo = await s.memo({ content: '지울 메모', tag: 'TODO' });

    expect((await s.del(`/memos/${memo.id}`)).body).toEqual({ success: true });
    expect((await s.get(`/memos/${memo.id}`)).status).toBe(404);
    expect((await s.del(`/memos/${memo.id}`)).status).toBe(404);
    expect((await s.patch(`/memos/${memo.id}`, { content: '수정' })).status).toBe(404);
    expect((await s.list('scope=INBOX')).items).toEqual([]);
    expect(await s.summary()).toEqual({ inboxCount: 0, openTodoCount: 0 });

    const row = await db.owner.memo.findFirstOrThrow({ where: { id: memo.id } });

    expect(row.deletedAt).not.toBeNull();
    expect(row.content).toBe('지울 메모');
  });

  it('다른 회사의 메모는 조회·수정·삭제 모두 존재하지 않는 것처럼 보이고 건수에도 섞이지 않는다', async () => {
    const a = await setup();
    const b = await setup();
    const memo = await b.memo({ content: 'B회사 메모' });

    expect((await a.get(`/memos/${memo.id}`)).status).toBe(404);
    expect((await a.patch(`/memos/${memo.id}`, { content: '침투' })).status).toBe(404);
    expect((await a.del(`/memos/${memo.id}`)).status).toBe(404);
    expect(await a.summary()).toEqual({ inboxCount: 0, openTodoCount: 0 });
    expect((await a.list('scope=INBOX')).items).toEqual([]);
  });
});
