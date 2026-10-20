import { fileUploadTicketSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { markCompanyEmailsVerified } from '../db/testFixtures';
import { createEmployeeService } from '../employee/employeeService';
import { createFileService } from '../file/fileService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createPrismaIdempotencyStore } from '../http/idempotencyStore';
import { createLogger } from '../logger';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createProjectService } from '../project/projectService';
import { createMemoryQueue } from '../queue/jobQueue';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';
import { createMemoryStorage } from '../storage/objectStorage';

import { createMaintenance } from './maintenance';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

const NOW = new Date('2026-10-16T03:00:00Z');
const HOURS = 60 * 60 * 1000;

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

const setup = async () => {
  const memory = createMemoryStorage();
  const sessionStore = createPrismaSessionStore(db.auth, () => NOW);
  const instance = createApp({
    sessionStore,
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    employees: createEmployeeService(db.app, () => NOW),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => NOW),
    files: createFileService({
      app: db.app,
      storage: memory.storage,
      queue: createMemoryQueue().queue,
      now: () => NOW,
    }),
    appOrigin: 'http://localhost:5173',
  });
  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `정리회사${Date.now()}`,
    adminName: '정리관리자',
    operator: 'test',
  });
  const signup = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `maint-${Date.now()}`,
      password: 'Correct-horse-2026!',
      email: `maint${Date.now()}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });
  await markCompanyEmailsVerified(db.ownerPool, invitation.companyId);
  const cookie = (signup.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
  const post = (path: string, body: object = {}) =>
    request(instance)
      .post(`/api/v1${path}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body);
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
  const companyId = (await db.owner.project.findFirstOrThrow({ where: { id: projectId } }))
    .companyId;
  const requestUpload = async () =>
    fileUploadTicketSchema.parse(
      (
        await post(`/projects/${projectId}/files`, {
          name: '사진.jpg',
          contentType: 'image/jpeg',
          purpose: 'PHOTO',
          size: 1000,
        })
      ).body,
    ).file.id;
  const maintenanceAt = (at: Date) =>
    createMaintenance({
      auth: db.auth,
      app: db.app,
      sessionStore,
      storage: memory.storage,
      logger: createLogger('silent'),
      now: () => at,
    });

  return { companyId, requestUpload, maintenanceAt };
};

describe('정기 유지 작업', () => {
  it('올리지 않고 방치된 업로드 신청만 "올라오지 않음"으로 닫는다', async () => {
    const { requestUpload, maintenanceAt } = await setup();
    const fileId = await requestUpload();

    // 주소 유효 시간과 유예가 지나기 전에는 변경 없음
    // 신청 시각은 DB 시계(실제 시각)로 기록되므로 실제 시각 기준으로 경과 시뮬레이션
    await maintenanceAt(new Date(Date.now() + 30 * 60 * 1000)).run();
    expect((await db.owner.storedFile.findFirstOrThrow({ where: { id: fileId } })).status).toBe(
      'PENDING',
    );

    const result = await maintenanceAt(new Date(Date.now() + 2 * HOURS)).run();
    const file = await db.owner.storedFile.findFirstOrThrow({ where: { id: fileId } });

    expect(result.staleUploads).toBeGreaterThanOrEqual(1);
    expect(file).toMatchObject({ status: 'REJECTED', rejectReason: 'NOT_UPLOADED' });
  });

  it('만료된 멱등 키만 치우고 유효한 키는 남긴다', async () => {
    const { companyId, maintenanceAt } = await setup();
    const store = createPrismaIdempotencyStore(db.app, () => NOW);

    await store.claim(companyId, 'POST|/x|old-key-0001', {
      state: 'processing',
      fingerprint: 'a',
      expiresAt: NOW.getTime() + HOURS,
    });
    await store.claim(companyId, 'POST|/x|new-key-0001', {
      state: 'processing',
      fingerprint: 'b',
      expiresAt: NOW.getTime() + 48 * HOURS,
    });

    const result = await maintenanceAt(new Date(NOW.getTime() + 2 * HOURS)).run();
    const left = await db.owner.idempotencyKey.count({ where: { companyId } });

    expect(result.expiredIdempotencyKeys).toBeGreaterThanOrEqual(1);
    expect(left).toBe(1);
  });

  it('만료된 세션을 지운다', async () => {
    const { maintenanceAt } = await setup();
    const before = await db.owner.session.count();

    // 로그인 유지 기간 경과 시점으로 돌리면 방금 만든 세션도 만료로 판정
    await createPrismaSessionStore(db.auth, () => NOW).deleteExpired();
    expect(await db.owner.session.count()).toBe(before);

    const result = await maintenanceAt(new Date(NOW.getTime() + 400 * 24 * HOURS)).run();

    expect(result.expiredSessions).toBe(true);
  });
});
