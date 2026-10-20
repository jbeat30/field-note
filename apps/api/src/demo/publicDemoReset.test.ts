import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { seedDemoData } from '../db/seed';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';
import { createMemoryStorage } from '../storage/objectStorage';

import { PUBLIC_DEMO, PUBLIC_DEMO_MAX_SESSIONS } from './publicDemo';
import { buildPublicDemoDataset } from './publicDemoDataset';
import {
  DemoLegalMissingError,
  DemoResetBusyError,
  removePublicDemo,
  resetPublicDemo,
  withDemoResetLock,
} from './publicDemoReset';

let db: TestDatabase;

jest.setTimeout(180_000);

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await db.stop();
});

const dataset = buildPublicDemoDataset();
const count = async (table: string, companyId: string = PUBLIC_DEMO.companyId) =>
  Number(
    (
      await db.ownerPool.query<{ count: string }>(
        `SELECT count(*) FROM ${table} WHERE company_id = $1`,
        [companyId],
      )
    ).rows[0]!.count,
  );

const app = () =>
  createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    appOrigin: 'http://localhost:5173',
  });

const login = (instance: ReturnType<typeof app>, password: string = PUBLIC_DEMO.password) =>
  request(instance)
    .post('/api/v1/auth/login')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({ loginId: PUBLIC_DEMO.loginId, password });

const cookieOf = (res: request.Response) =>
  (res.headers['set-cookie'] as unknown as string[])
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`))!
    .split(';')[0]!;

describe('시연 회사 초기화', () => {
  it('등록된 약관이 없으면 아무것도 만들지 않고 실패한다', async () => {
    await expect(resetPublicDemo(db.owner)).rejects.toBeInstanceOf(DemoLegalMissingError);
    expect(await db.owner.company.count({ where: { id: PUBLIC_DEMO.companyId } })).toBe(0);
  });

  it('처음 실행하면 시연 회사와 가상 샘플을 만들고 바로 로그인할 수 있다', async () => {
    // 다른 회사도 함께 있는 상태에서 시작 (개발용 샘플 회사, 약관 포함)
    await seedDemoData(db.owner);

    const result = await resetPublicDemo(db.owner, createMemoryStorage().storage);
    const user = await db.owner.user.findFirstOrThrow({ where: { id: PUBLIC_DEMO.userId } });
    const consents = await count('consents');

    expect(result.seeded.projects).toBe(dataset.projects.length);
    expect(await count('projects')).toBe(dataset.projects.length);
    expect(await count('employees')).toBe(dataset.employees.length);
    expect(await count('work_logs')).toBe(dataset.workLogs.length);
    expect(user).toMatchObject({
      displayName: 'Tester',
      email: PUBLIC_DEMO.email,
      status: 'ACTIVE',
    });
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(consents).toBeGreaterThanOrEqual(2);

    const res = await login(app());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ displayName: 'Tester', companyName: 'Test Company' });
  });

  it('방문자가 바꾼 데이터와 올린 파일을 처음 상태로 되돌리고 다른 회사는 건드리지 않는다', async () => {
    const memory = createMemoryStorage();
    const hanbitId = (await db.owner.company.findFirstOrThrow({ where: { name: '한빛판금' } })).id;
    const hanbitProjects = await count('projects', hanbitId);

    await memory.storage.write(
      `company/${PUBLIC_DEMO.companyId}/files/a.png`,
      Buffer.from('a'),
      'image/png',
    );
    await memory.storage.write(`company/${hanbitId}/files/b.png`, Buffer.from('b'), 'image/png');
    await db.ownerPool.query(`UPDATE projects SET name = '오염된 이름' WHERE company_id = $1`, [
      PUBLIC_DEMO.companyId,
    ]);
    await db.ownerPool.query(`DELETE FROM project_assignments WHERE company_id = $1`, [
      PUBLIC_DEMO.companyId,
    ]);
    await db.ownerPool.query(
      `UPDATE company_settings SET standard_work_minutes = 600 WHERE company_id = $1`,
      [PUBLIC_DEMO.companyId],
    );
    await db.ownerPool.query(`UPDATE users SET display_name = '바뀐 이름' WHERE id = $1`, [
      PUBLIC_DEMO.userId,
    ]);

    const instance = app();
    const oldCookie = cookieOf(await login(instance));

    await resetPublicDemo(db.owner, memory.storage);

    const names = await db.ownerPool.query<{ name: string }>(
      `SELECT name FROM projects WHERE company_id = $1`,
      [PUBLIC_DEMO.companyId],
    );

    expect(names.rows.map((row) => row.name).sort()).toEqual(
      dataset.projects.map((project) => project.name).sort(),
    );
    expect(await count('project_assignments')).toBe(dataset.assignments.length);
    expect(
      (
        await db.ownerPool.query<{ standard_work_minutes: number }>(
          `SELECT standard_work_minutes FROM company_settings WHERE company_id = $1`,
          [PUBLIC_DEMO.companyId],
        )
      ).rows[0]!.standard_work_minutes,
    ).toBe(dataset.accounts[0]!.settings.standardWorkMinutes);
    expect(
      (await db.owner.user.findFirstOrThrow({ where: { id: PUBLIC_DEMO.userId } })).displayName,
    ).toBe('Tester');

    // 업로드 파일은 시연 회사 것만 지워지고, 이전 로그인은 끊기며, 새로 로그인할 수 있음
    await expect(
      memory.storage.size(`company/${PUBLIC_DEMO.companyId}/files/a.png`),
    ).resolves.toBeNull();
    await expect(memory.storage.size(`company/${hanbitId}/files/b.png`)).resolves.toBe(1);
    expect((await request(instance).get('/api/v1/me').set('Cookie', oldCookie)).status).toBe(401);
    expect((await login(instance)).status).toBe(200);
    expect(await count('projects', hanbitId)).toBe(hanbitProjects);
  });

  it('여러 번 실행해도 같은 결과다', async () => {
    const first = await resetPublicDemo(db.owner);
    const second = await resetPublicDemo(db.owner);

    expect(second.seeded).toEqual(first.seeded);
    expect(await count('projects')).toBe(dataset.projects.length);
    expect(await db.owner.company.count({ where: { id: PUBLIC_DEMO.companyId } })).toBe(1);
  });

  it('해지 요청 기록이 남아 있어도 회사를 사용 가능한 상태로 복원한다', async () => {
    await db.ownerPool.query(`UPDATE companies SET status = 'CLOSING' WHERE id = $1`, [
      PUBLIC_DEMO.companyId,
    ]);
    await db.ownerPool.query(
      `INSERT INTO company_closures (company_id, requested_at, purge_after) VALUES ($1, now(), now() + interval '14 days')`,
      [PUBLIC_DEMO.companyId],
    );

    await resetPublicDemo(db.owner);

    expect(
      (await db.owner.company.findUniqueOrThrow({ where: { id: PUBLIC_DEMO.companyId } })).status,
    ).toBe('ACTIVE');
    expect(await count('company_closures')).toBe(0);
    expect((await login(app())).status).toBe(200);
  });

  it('동시에 두 번 실행할 수 없다', async () => {
    await withDemoResetLock(db.ownerUrl, async () => {
      await expect(withDemoResetLock(db.ownerUrl, async () => 'x')).rejects.toBeInstanceOf(
        DemoResetBusyError,
      );
    });

    // 끝난 뒤에는 다시 실행할 수 있음
    await expect(withDemoResetLock(db.ownerUrl, async () => 'ok')).resolves.toBe('ok');
  });
});

describe('시연 회사 제거', () => {
  it('서비스 단계에서 시연 환경을 끄면 데이터·파일·로그인이 사라지고 다시 켜면 복원된다', async () => {
    const memory = createMemoryStorage();
    const hanbitId = (await db.owner.company.findFirstOrThrow({ where: { name: '한빛판금' } })).id;
    const hanbitProjects = await count('projects', hanbitId);

    await resetPublicDemo(db.owner, memory.storage);
    await memory.storage.write(
      `company/${PUBLIC_DEMO.companyId}/x.png`,
      Buffer.from('x'),
      'image/png',
    );

    const instance = app();
    const cookie = cookieOf(await login(instance));
    const removed = await removePublicDemo(db.owner, memory.storage);

    expect(removed.removedObjects).toBe(1);
    expect(await count('projects')).toBe(0);
    expect(await count('employees')).toBe(0);
    expect(await count('user_credentials')).toBe(0);
    expect((await request(instance).get('/api/v1/me').set('Cookie', cookie)).status).toBe(401);
    expect((await login(instance)).status).toBe(401);
    expect(await count('projects', hanbitId)).toBe(hanbitProjects);

    await resetPublicDemo(db.owner, memory.storage);

    expect((await login(instance)).status).toBe(200);
    expect(await count('projects')).toBe(dataset.projects.length);
  });
});

describe('시연 계정 제한', () => {
  it('비밀번호를 여러 번 틀려도 계정이 잠기지 않아 다른 방문자가 로그인할 수 있다', async () => {
    await resetPublicDemo(db.owner);

    const instance = app();

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const wrong = await login(instance, 'Wrong-password-1!');

      expect(wrong.status).toBe(401);
      expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    expect((await login(instance)).status).toBe(200);
  });

  it('공용 계정이라 동시 로그인 세션 수 제한이 크게 늘어나 있다', async () => {
    await resetPublicDemo(db.owner);

    const store = createPrismaSessionStore(db.auth);
    const total = 25;

    for (let index = 0; index < total; index += 1) {
      await store.create({ userId: PUBLIC_DEMO.userId, companyId: PUBLIC_DEMO.companyId });
    }

    expect(total).toBeLessThan(PUBLIC_DEMO_MAX_SESSIONS);
    expect(await count('sessions')).toBe(total);
  });

  it('해지·로그인 정보 변경·2단계 인증·소셜 연동·기기 목록은 403으로 막힌다', async () => {
    await resetPublicDemo(db.owner);

    const instance = app();
    const cookie = cookieOf(await login(instance));
    const blocked: [method: 'get' | 'post' | 'delete', path: string][] = [
      ['post', '/api/v1/me/closure'],
      ['post', '/api/v1/me/password'],
      ['post', '/api/v1/me/password/set'],
      ['post', '/api/v1/me/email/change'],
      ['post', '/api/v1/me/totp/setup'],
      ['post', '/api/v1/me/totp/enable'],
      ['post', '/api/v1/me/totp/disable'],
      ['post', '/api/v1/me/totp/recovery-codes'],
      ['post', '/api/v1/me/social/google/start'],
      ['delete', '/api/v1/me/social/google'],
      ['get', '/api/v1/me/devices'],
    ];

    for (const [method, path] of blocked) {
      const agent = request(instance);
      const pending = method === 'get' ? agent.get(path) : agent[method](path);
      const res = await pending.set(CSRF_HEADER, CSRF_HEADER_VALUE).set('Cookie', cookie).send({});

      expect([method, path, res.status, res.body.error?.code]).toEqual([
        method,
        path,
        403,
        'DEMO_RESTRICTED',
      ]);
    }

    // 사용해 볼 수 있는 기능은 막히지 않음
    const me = await request(instance).get('/api/v1/me').set('Cookie', cookie);

    expect(me.status).toBe(200);
    // 화면이 시연 안내를 보이고 막힌 설정을 숨기도록 시연 계정임을 알려 줌
    expect(me.body.isDemo).toBe(true);
  });
});
