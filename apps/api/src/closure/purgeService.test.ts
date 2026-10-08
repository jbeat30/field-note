import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createTestProject } from '../db/testFixtures';
import { createMemoryStorage } from '../storage/objectStorage';

import { createClosureHarness, OLD_PASSWORD } from './closureHarness';
import { CLOSURE_GRACE_MS } from './closureService';
import { ANONYMIZED_COMPANY_NAME, ANONYMIZED_USER_NAME } from './purgePolicy';
import {
  listDueClosures,
  NotDueForPurgeError,
  purgeCompany,
  purgeDueCompanies,
} from './purgeService';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

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

// 가입 후 업무 데이터를 만들고 해지를 요청 (시간 이동은 호출하는 쪽에서, 가입 초대가 만료되지 않게 모든 가입 뒤에 함)
const closeAccount = async (h: Awaited<ReturnType<typeof createClosureHarness>>) => {
  const { account, ...rest } = await h.passwordAccount();

  // 프로젝트는 고객·담당 직원을 참조하므로 삭제 순서(프로젝트 먼저)까지 함께 확인
  const { project, managerId } = await createTestProject(
    db.owner,
    account.companyId,
    '삭제될 현장',
  );
  const trade = await db.owner.optionItem.create({
    data: {
      companyId: account.companyId,
      kind: 'TRADE',
      name: '삭제될 공종',
      nameKey: '삭제될 공종',
      sortOrder: 0,
    },
  });

  await db.owner.projectTrade.create({
    data: { companyId: account.companyId, projectId: project.id, tradeId: trade.id },
  });
  await db.owner.projectAssignment.create({
    data: {
      companyId: account.companyId,
      projectId: project.id,
      employeeId: managerId,
      startDate: new Date('2026-10-01T00:00:00Z'),
      endDate: new Date('2026-10-31T00:00:00Z'),
    },
  });
  await db.owner.projectPeriodChange.create({
    data: {
      companyId: account.companyId,
      projectId: project.id,
      fromStart: new Date('2026-10-01T00:00:00Z'),
      fromEnd: new Date('2026-12-31T00:00:00Z'),
      toStart: new Date('2026-10-01T00:00:00Z'),
      toEnd: new Date('2027-01-31T00:00:00Z'),
      changedBy: account.userId,
    },
  });
  // 일지는 프로젝트·직원·작업 구분을 참조하므로 삭제 순서(이력 → 공수 항목 → 일지 → 그 밖)까지 함께 확인
  const category = await db.owner.optionItem.create({
    data: {
      companyId: account.companyId,
      kind: 'WORK_CATEGORY',
      name: '삭제될 작업',
      nameKey: '삭제될 작업',
      sortOrder: 0,
    },
  });
  const workLog = await db.owner.workLog.create({
    data: {
      companyId: account.companyId,
      projectId: project.id,
      workDate: new Date('2026-10-02T00:00:00Z'),
      status: 'SAVED',
      content: '삭제될 일지',
      savedAt: new Date(),
    },
  });

  await db.owner.workLogEntry.create({
    data: {
      companyId: account.companyId,
      workLogId: workLog.id,
      employeeId: managerId,
      categoryId: category.id,
      minutes: 480,
    },
  });
  await db.owner.workLogRevision.create({
    data: {
      companyId: account.companyId,
      workLogId: workLog.id,
      version: 1,
      snapshot: {
        status: 'SAVED',
        content: '이전',
        area: null,
        notes: null,
        isChange: false,
        isAfterService: false,
        entries: [],
      },
      changedBy: account.userId,
    },
  });
  await db.owner.projectStatusChange.create({
    data: {
      companyId: account.companyId,
      projectId: project.id,
      fromStatus: 'PLANNED',
      toStatus: 'IN_PROGRESS',
      effectiveOn: new Date('2026-10-01T00:00:00Z'),
      changedBy: account.userId,
    },
  });
  await db.owner.projectCodeSequence.create({
    data: { companyId: account.companyId, year: 2026, lastNumber: 1 },
  });
  const jobType = await db.owner.optionItem.create({
    data: {
      companyId: account.companyId,
      kind: 'JOB_TYPE',
      name: '삭제될 직종',
      nameKey: '삭제될 직종',
      sortOrder: 0,
    },
  });
  // 직원이 선택 목록 항목을 참조하므로 삭제 순서(직원 먼저)까지 함께 확인
  await db.owner.employee.create({
    data: {
      companyId: account.companyId,
      name: '삭제될 직원',
      jobTypeId: jobType.id,
      phone: '010-0000-0000',
    },
  });
  await db.owner.partner.create({
    data: {
      companyId: account.companyId,
      kind: 'CLIENT',
      name: '삭제될 고객',
      nameKey: '삭제될 고객',
    },
  });
  // 사진 → 업로드 파일 순서(사진이 파일을 참조)와, 둘 다 프로젝트·계정을 참조하므로 그보다 먼저 지우는지까지 함께 확인
  const file = await db.owner.storedFile.create({
    data: {
      companyId: account.companyId,
      projectId: project.id,
      purpose: 'PHOTO',
      originalName: '삭제될 사진.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 100n,
      objectKey: `company/${account.companyId}/project/${project.id}/file/original`,
      uploadedBy: account.userId,
    },
  });
  await db.owner.photo.create({
    data: {
      companyId: account.companyId,
      projectId: project.id,
      fileId: file.id,
      takenAt: new Date('2026-10-02T01:00:00Z'),
      workDate: new Date('2026-10-02T00:00:00Z'),
      uploadedBy: account.userId,
    },
  });
  // 문서 → 버전 → 파일, 열람 기록은 문서·계정을 참조 (프로젝트·파일보다 먼저 지워야 함)
  const docFile = await db.owner.storedFile.create({
    data: {
      companyId: account.companyId,
      projectId: project.id,
      purpose: 'DOCUMENT',
      originalName: '삭제될 계약서.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100n,
      objectKey: `company/${account.companyId}/project/${project.id}/doc/original`,
      uploadedBy: account.userId,
    },
  });
  const document = await db.owner.document.create({
    data: {
      companyId: account.companyId,
      projectId: project.id,
      title: '삭제될 문서',
      isSensitive: true,
      createdBy: account.userId,
    },
  });

  await db.owner.documentVersion.create({
    data: {
      companyId: account.companyId,
      documentId: document.id,
      versionNo: 1,
      fileId: docFile.id,
      revisionDate: new Date('2026-10-02T00:00:00Z'),
      uploadedBy: account.userId,
    },
  });
  await db.owner.auditLog.create({
    data: {
      companyId: account.companyId,
      action: 'DOCUMENT_VIEWED',
      actorId: account.userId,
      targetId: document.id,
      detail: { versionNo: 1 },
    },
  });
  // 자재 기록은 프로젝트·자재·작업 구분·업체·계정을 참조
  const material = await db.owner.material.create({
    data: { companyId: account.companyId, name: '삭제될 자재', nameKey: '삭제될자재', unit: '장' },
  });
  await db.owner.materialRecord.create({
    data: {
      companyId: account.companyId,
      projectId: project.id,
      materialId: material.id,
      recordDate: new Date('2026-10-02T00:00:00Z'),
      kind: 'RECEIVED',
      quantity: 10,
      categoryId: category.id,
      createdBy: account.userId,
    },
  });
  // 메모는 프로젝트(없을 수도 있음)·계정을 참조
  await db.owner.memo.create({
    data: {
      companyId: account.companyId,
      projectId: project.id,
      content: '삭제될 메모',
      memoDate: new Date('2026-10-02T00:00:00Z'),
      createdBy: account.userId,
    },
  });
  await db.owner.memo.create({
    data: {
      companyId: account.companyId,
      content: '삭제될 메모함 메모',
      memoDate: new Date('2026-10-02T00:00:00Z'),
      createdBy: account.userId,
    },
  });
  await h.sessionStore.create(account);
  await h.closure.request(account, OLD_PASSWORD);

  return { account, ...rest };
};

const expire = (h: { clock: { ms: number } }) => {
  h.clock.ms += CLOSURE_GRACE_MS + 1000;
};

describe('삭제·익명화', () => {
  it('유예가 끝나면 업무 데이터는 삭제하고 계정은 익명화하며 동의 이력은 남긴다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const { account, email, loginId } = await closeAccount(h);

    expire(h);
    const where = { companyId: account.companyId };
    const consentsBefore = await db.owner.consent.count({ where });

    const result = await purgeCompany(db.purge, account.companyId, h.now);

    expect(result.anonymizedUsers).toBe(1);
    expect(await db.owner.project.count({ where })).toBe(0);
    expect(await db.owner.projectTrade.count({ where })).toBe(0);
    expect(await db.owner.workLog.count({ where })).toBe(0);
    expect(await db.owner.workLogEntry.count({ where })).toBe(0);
    expect(await db.owner.workLogRevision.count({ where })).toBe(0);
    expect(await db.owner.projectStatusChange.count({ where })).toBe(0);
    expect(await db.owner.projectAssignment.count({ where })).toBe(0);
    expect(await db.owner.projectPeriodChange.count({ where })).toBe(0);
    expect(await db.owner.projectCodeSequence.count({ where })).toBe(0);
    expect(await db.owner.optionItem.count({ where })).toBe(0);
    expect(await db.owner.employee.count({ where })).toBe(0);
    expect(await db.owner.partner.count({ where })).toBe(0);
    expect(await db.owner.auditLog.count({ where })).toBe(0);
    expect(await db.owner.documentVersion.count({ where })).toBe(0);
    expect(await db.owner.document.count({ where })).toBe(0);
    expect(await db.owner.materialRecord.count({ where })).toBe(0);
    expect(await db.owner.material.count({ where })).toBe(0);
    expect(await db.owner.memo.count({ where })).toBe(0);
    expect(await db.owner.photo.count({ where })).toBe(0);
    expect(await db.owner.storedFile.count({ where })).toBe(0);
    expect(await db.owner.session.count({ where })).toBe(0);
    expect(await db.owner.userCredential.count({ where })).toBe(0);
    expect(await db.owner.invitation.count({ where })).toBe(0);
    expect(await db.owner.companySettings.count({ where })).toBe(0);
    expect(await db.owner.consent.count({ where })).toBe(consentsBefore);

    const user = await db.owner.user.findFirstOrThrow({ where });
    const company = await db.owner.company.findUniqueOrThrow({ where: { id: account.companyId } });
    const closure = await db.owner.companyClosure.findUniqueOrThrow({
      where: { companyId: account.companyId },
    });

    expect(user).toMatchObject({ displayName: ANONYMIZED_USER_NAME, email: null, phone: null });
    expect(company).toMatchObject({ name: ANONYMIZED_COMPANY_NAME, status: 'CLOSED' });
    expect(closure.purgedAt).not.toBeNull();
    // 개인 식별값(이메일·아이디)이 어떤 테이블에도 남지 않음
    expect(JSON.stringify(user)).not.toContain(email);
    expect(await db.owner.userCredential.count({ where: { loginId } })).toBe(0);
  });

  it('로그인은 삭제 뒤에도 일반 실패로만 보인다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const { account, loginId } = await closeAccount(h);

    expire(h);

    await purgeCompany(db.purge, account.companyId, h.now);

    await expect(h.accountService.login({ loginId, password: OLD_PASSWORD })).rejects.toMatchObject(
      {
        code: 'INVALID_CREDENTIALS',
      },
    );
  });

  it('유예 중·취소됨·이미 삭제된 회사는 삭제하지 않는다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const waiting = await h.passwordAccount();
    const cancelled = await h.passwordAccount();
    const active = await h.passwordAccount();

    await h.closure.request(waiting.account, OLD_PASSWORD);
    await h.closure.request(cancelled.account, OLD_PASSWORD);
    await h.closure.cancel(h.lastCancelToken());

    h.clock.ms += CLOSURE_GRACE_MS - 60_000;

    await expect(purgeCompany(db.purge, waiting.account.companyId, h.now)).rejects.toBeInstanceOf(
      NotDueForPurgeError,
    );

    h.clock.ms += 120_000;

    await expect(purgeCompany(db.purge, cancelled.account.companyId, h.now)).rejects.toBeInstanceOf(
      NotDueForPurgeError,
    );
    await expect(purgeCompany(db.purge, active.account.companyId, h.now)).rejects.toBeInstanceOf(
      NotDueForPurgeError,
    );

    await purgeCompany(db.purge, waiting.account.companyId, h.now);
    await expect(purgeCompany(db.purge, waiting.account.companyId, h.now)).rejects.toBeInstanceOf(
      NotDueForPurgeError,
    );
    expect(
      await db.owner.userCredential.count({ where: { companyId: active.account.companyId } }),
    ).toBe(1);
  });

  it('다른 회사의 데이터는 건드리지 않는다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const other = await h.passwordAccount();
    const closing = await closeAccount(h);

    expire(h);

    await createTestProject(db.owner, other.account.companyId, '남는 현장');
    await purgeCompany(db.purge, closing.account.companyId, h.now);

    expect(await db.owner.project.count({ where: { companyId: other.account.companyId } })).toBe(1);
    expect(
      (await db.owner.company.findUniqueOrThrow({ where: { id: other.account.companyId } })).status,
    ).toBe('ACTIVE');
  });

  it('삭제 전용 계정은 해지 대상이 아닌 회사의 데이터를 지울 수 없다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const active = await h.passwordAccount();

    await createTestProject(db.owner, active.account.companyId, '활성 현장');
    await expect(
      db.purge.project.deleteMany({ where: { companyId: active.account.companyId } }),
    ).resolves.toMatchObject({ count: 0 });
    expect(await db.owner.project.count({ where: { companyId: active.account.companyId } })).toBe(
      1,
    );
    await expect(
      db.purge.userCredential.deleteMany({ where: { companyId: active.account.companyId } }),
    ).resolves.toMatchObject({ count: 0 });
    expect(
      await db.owner.userCredential.count({ where: { companyId: active.account.companyId } }),
    ).toBe(1);
  });
});

describe('파일 객체 삭제', () => {
  it('회사 경로 아래 객체만 지우고 다른 회사의 객체와 유예 중인 회사의 객체는 남긴다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const { account } = await closeAccount(h);
    const other = await closeAccount(h);
    const memory = createMemoryStorage();
    const mine = `company/${account.companyId}/project/p/f/original`;
    const theirs = `company/${other.account.companyId}/project/p/f/original`;

    memory.upload(mine, Buffer.from('a'));
    memory.upload(`company/${account.companyId}/project/p/f/thumbnail`, Buffer.from('b'));
    memory.upload(theirs, Buffer.from('c'));

    // 유예 중에는 삭제하지 않음
    await expect(
      purgeCompany(db.purge, account.companyId, h.now, memory.storage),
    ).rejects.toBeInstanceOf(NotDueForPurgeError);
    expect(memory.objects.size).toBe(3);

    expire(h);

    const result = await purgeCompany(db.purge, account.companyId, h.now, memory.storage);

    expect(result.deleted.file_objects).toBe(2);
    expect([...memory.objects.keys()]).toEqual([theirs]);
  });
});

describe('일괄 삭제', () => {
  it('유예가 끝난 회사만 골라 처리하고 한 곳이 실패해도 나머지는 계속한다', async () => {
    const h = await createClosureHarness(db, documentIds);
    const notYet = await h.passwordAccount();
    const due = await closeAccount(h);
    const dueToo = await closeAccount(h);

    expire(h);
    await h.closure.request(notYet.account, OLD_PASSWORD);

    const listed = await listDueClosures(db.purge, h.now);

    expect(listed.map((item) => item.companyId)).toEqual(
      expect.arrayContaining([due.account.companyId, dueToo.account.companyId]),
    );
    expect(listed.map((item) => item.companyId)).not.toContain(notYet.account.companyId);

    const summary = await purgeDueCompanies(db.purge, h.now);

    expect(summary.failed).toEqual([]);
    expect(summary.purged.map((item) => item.companyId)).toEqual(
      expect.arrayContaining([due.account.companyId, dueToo.account.companyId]),
    );
    expect(
      (await db.owner.company.findUniqueOrThrow({ where: { id: notYet.account.companyId } }))
        .status,
    ).toBe('CLOSING');
    expect((await purgeDueCompanies(db.purge, h.now)).purged).toEqual([]);
  });
});
