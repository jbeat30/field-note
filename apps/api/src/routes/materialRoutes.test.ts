import {
  materialBalanceResponseSchema,
  materialRecordsResponseSchema,
  materialSchema,
  materialsResponseSchema,
  optionsResponseSchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAccountService } from '../auth/accountService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createEmployeeService } from '../employee/employeeService';
import { createOptionService } from '../company/optionService';
import { createMaterialService } from '../material/materialService';
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

const harness = () =>
  createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    options: createOptionService(db.app),
    employees: createEmployeeService(db.app, () => NOW),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => NOW),
    materials: createMaterialService(db.app, () => NOW),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof harness>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `자재회사${sequence}`,
    adminName: '자재관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `mat-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `mat${sequence}@example.com`,
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
  const supplierId = (await post('/partners', { kind: 'SUPPLIER', name: '대한강판' })).body
    .id as string;
  const managerId = (await post('/employees', { name: '박소장' })).body.id;
  const categoryId = optionsResponseSchema
    .parse((await get('/company/options')).body)
    .items.find((item) => item.kind === 'WORK_CATEGORY')!.id;
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
  const material = async (body: object = { name: '아연도강판', spec: '1.0T', unit: '장' }) =>
    materialSchema.parse((await post('/materials', body)).body);
  const record = (projectId: string, body: object) =>
    post(`/projects/${projectId}/material-records`, { recordDate: '2026-10-05', ...body });
  const balance = async (projectId: string) =>
    materialBalanceResponseSchema.parse((await get(`/projects/${projectId}/material-balance`)).body)
      .items;

  return {
    instance,
    post,
    patch,
    del,
    get,
    clientId,
    supplierId,
    categoryId,
    project,
    material,
    record,
    balance,
  };
};

describe('자재 목록', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const s = await setup();

    expect((await request(s.instance).get('/api/v1/materials')).status).toBe(401);
    expect(
      (
        await request(s.instance)
          .post('/api/v1/materials')
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ name: '코킹', unit: '개' })
      ).status,
    ).toBe(401);
  });

  it('이름과 단위만으로 즉석 추가하면 소모품으로 만들어진다', async () => {
    const s = await setup();
    const created = await s.material({ name: ' 코킹 ', unit: '개' });

    expect(created).toMatchObject({
      name: '코킹',
      spec: null,
      unit: '개',
      category: 'CONSUMABLE',
      isActive: true,
      lastUsedOn: null,
    });
  });

  it('같은 이름·규격은 공백·대소문자만 달라도 중복이고, 규격이 다르면 별도 자재다', async () => {
    const s = await setup();

    await s.material({ name: '아연도강판', spec: '1.0T', unit: '장' });

    expect(
      (await s.post('/materials', { name: ' 아연도 강판 ', spec: '1.0t', unit: '장' })).status,
    ).toBe(400);
    expect((await s.material({ name: '아연도강판', spec: '0.8T', unit: '장' })).spec).toBe('0.8T');
    expect((await s.material({ name: '아연도강판', unit: '장' })).spec).toBeNull();
  });

  it('빈 이름·단위 없음·모르는 분류를 거부한다', async () => {
    const s = await setup();

    for (const body of [
      { name: '  ', unit: '장' },
      { name: '코킹' },
      { name: '코킹', unit: '장', category: 'TOOL' },
      { name: '코킹', unit: '열한글자를넘기는긴단위입니다' },
    ]) {
      expect((await s.post('/materials', body)).status).toBe(400);
    }
  });

  it('최근 기록한 자재가 먼저 나오고 이름·규격으로 검색하며 숨긴 자재는 기본에서 뺀다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const a = await s.material({ name: '가 자재', unit: '개' });
    const b = await s.material({ name: '나 자재', spec: '특대', unit: '개' });
    const c = await s.material({ name: '다 자재', unit: '개' });

    await s.record(projectId, {
      materialId: c.id,
      kind: 'RECEIVED',
      quantity: 1,
      recordDate: '2026-10-01',
    });
    await s.record(projectId, {
      materialId: b.id,
      kind: 'RECEIVED',
      quantity: 1,
      recordDate: '2026-10-04',
    });

    const names = async (query = '') =>
      materialsResponseSchema
        .parse((await s.get(`/materials${query}`)).body)
        .items.map((item) => item.name);

    expect(await names()).toEqual(['나 자재', '다 자재', '가 자재']);
    expect(await names('?q=특대')).toEqual(['나 자재']);
    expect(await names('?q=자재')).toHaveLength(3);

    await s.patch(`/materials/${a.id}`, { isActive: false });

    expect(await names()).toEqual(['나 자재', '다 자재']);
    expect(await names('?includeInactive=true')).toHaveLength(3);
  });

  it('같은 날 쓴 자재는 방금 기록한 것이 먼저 나온다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const a = await s.material({ name: '가 자재', unit: '개' });
    const b = await s.material({ name: '나 자재', unit: '개' });
    const c = await s.material({ name: '다 자재', unit: '개' });

    // 이름순이면 가·나·다지만 입력한 순서(다 → 가 → 나)의 반대가 최근순
    for (const material of [c, a, b]) {
      await s.record(projectId, {
        materialId: material.id,
        kind: 'USED',
        quantity: 1,
        recordDate: '2026-10-06',
      });
    }

    const names = materialsResponseSchema
      .parse((await s.get('/materials')).body)
      .items.map((item) => item.name);

    expect(names).toEqual(['나 자재', '가 자재', '다 자재']);
  });

  it('이름·규격·분류를 고치고 다른 자재와 겹치게는 못 고친다', async () => {
    const s = await setup();
    const a = await s.material({ name: '강판', spec: '1.0T', unit: '장' });

    await s.material({ name: '강판', spec: '0.8T', unit: '장' });

    expect((await s.patch(`/materials/${a.id}`, { spec: '0.8T' })).status).toBe(400);
    expect(
      (await s.patch(`/materials/${a.id}`, { name: '아연강판', category: 'RAW' })).body,
    ).toMatchObject({
      name: '아연강판',
      category: 'RAW',
    });
    expect((await s.patch(`/materials/${a.id}`, {})).status).toBe(400);
  });

  it('기록이 있는 자재는 단위를 바꿀 수 없다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const free = await s.material({ name: '기록 없음', unit: '개' });
    const used = await s.material({ name: '기록 있음', unit: '개' });

    await s.record(projectId, { materialId: used.id, kind: 'RECEIVED', quantity: 1 });

    expect((await s.patch(`/materials/${free.id}`, { unit: '박스' })).body.unit).toBe('박스');
    expect((await s.patch(`/materials/${used.id}`, { unit: '박스' })).status).toBe(400);
    expect(
      (await s.patch(`/materials/${used.id}`, { unit: '개', name: '이름만 변경' })).status,
    ).toBe(200);
  });

  it('다른 회사의 자재는 보이지 않고 수정할 수 없다', async () => {
    const a = await setup();
    const b = await setup();
    const mine = await b.material();

    expect(materialsResponseSchema.parse((await a.get('/materials')).body).items).toEqual([]);
    expect((await a.patch(`/materials/${mine.id}`, { name: '침투' })).status).toBe(404);
    // 같은 이름도 회사마다 따로
    expect((await a.material()).name).toBe('아연도강판');
  });
});

describe('자재 기록', () => {
  it('반입·사용·반출·폐기를 기록하고 선택 항목은 비워도 된다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const material = await s.material();
    const res = await s.record(projectId, {
      materialId: material.id,
      kind: 'RECEIVED',
      quantity: 100,
      partnerId: s.supplierId,
      sourceText: '공장 직출',
      memo: '1차 반입',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      projectId,
      materialId: material.id,
      kind: 'RECEIVED',
      quantity: 100,
      partnerId: s.supplierId,
      sourceText: '공장 직출',
      categoryId: null,
      area: null,
      isChange: false,
      isAfterService: false,
    });

    const used = await s.record(projectId, {
      materialId: material.id,
      kind: 'USED',
      quantity: 12.5,
      categoryId: s.categoryId,
      area: '3층 301호',
      isChange: true,
    });

    expect(used.body).toMatchObject({
      quantity: 12.5,
      categoryId: s.categoryId,
      area: '3층 301호',
      isChange: true,
    });
  });

  it('수량·구분·날짜 형식이 맞지 않으면 거부한다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const material = await s.material();

    for (const extra of [
      { quantity: 0 },
      { quantity: -3 },
      { quantity: 1.2345 },
      { kind: 'SOLD' },
      { recordDate: '10월 5일' },
      { area: 'ㄱ'.repeat(101) },
    ]) {
      const res = await s.record(projectId, {
        materialId: material.id,
        kind: 'USED',
        quantity: 1,
        ...extra,
      });

      expect({ extra, status: res.status }).toEqual({ extra, status: 400 });
    }
  });

  it('다른 회사의 자재·작업 구분·업체와 숨긴 자재는 쓸 수 없고 없는 프로젝트는 404다', async () => {
    const a = await setup();
    const b = await setup();
    const projectId = await a.project();
    const mine = await a.material();
    const foreign = await b.material({ name: '남의 자재', unit: '개' });
    const hidden = await a.material({ name: '숨길 자재', unit: '개' });

    await a.patch(`/materials/${hidden.id}`, { isActive: false });

    const base = { materialId: mine.id, kind: 'USED', quantity: 1 };

    for (const extra of [
      { materialId: foreign.id },
      { materialId: hidden.id },
      { categoryId: b.categoryId },
      { partnerId: b.supplierId },
    ]) {
      expect((await a.record(projectId, { ...base, ...extra })).status).toBe(400);
    }

    expect((await a.record(await b.project(), base)).status).toBe(404);
    expect((await a.record('018f3b1e-0000-7000-8000-000000000000', base)).status).toBe(404);
  });

  it('여러 건을 한꺼번에 저장하고 한 건이라도 잘못되면 전부 저장하지 않는다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const a = await s.material({ name: '가', unit: '개' });
    const b = await s.material({ name: '나', unit: '개' });
    const path = `/projects/${projectId}/material-records/batch`;
    const ok = await s.post(path, {
      records: [
        { materialId: a.id, recordDate: '2026-10-05', kind: 'RECEIVED', quantity: 10 },
        { materialId: b.id, recordDate: '2026-10-05', kind: 'RECEIVED', quantity: 5 },
      ],
    });

    expect(ok.status).toBe(201);
    expect(ok.body.items).toHaveLength(2);

    const bad = await s.post(path, {
      records: [
        { materialId: a.id, recordDate: '2026-10-06', kind: 'USED', quantity: 1 },
        {
          materialId: '018f3b1e-0000-7000-8000-000000000000',
          recordDate: '2026-10-06',
          kind: 'USED',
          quantity: 1,
        },
      ],
    });

    expect(bad.status).toBe(400);
    expect(bad.body.error.details[0].path).toBe('body.records.1.materialId');
    expect(await db.owner.materialRecord.count({ where: { projectId } })).toBe(2);
  });

  it('날짜·자재·구분으로 거르고 커서로 이어 읽으면 빠지거나 겹치지 않는다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const a = await s.material({ name: '가', unit: '개' });
    const b = await s.material({ name: '나', unit: '개' });
    const made: string[] = [];

    for (let i = 0; i < 5; i += 1) {
      made.push(
        (
          await s.record(projectId, {
            materialId: i % 2 === 0 ? a.id : b.id,
            kind: i < 3 ? 'RECEIVED' : 'USED',
            quantity: i + 1,
            recordDate: i < 3 ? '2026-10-05' : '2026-10-06',
          })
        ).body.id,
      );
    }

    const ids = async (query = '') =>
      materialRecordsResponseSchema
        .parse((await s.get(`/projects/${projectId}/material-records?${query}`)).body)
        .items.map((item) => item.id);

    expect((await ids('date=2026-10-06')).sort()).toEqual([made[3], made[4]].sort());
    expect((await ids(`materialId=${b.id}`)).sort()).toEqual([made[1], made[3]].sort());
    expect((await ids('kind=USED')).sort()).toEqual([made[3], made[4]].sort());

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;

    do {
      const page = materialRecordsResponseSchema.parse(
        (
          await s.get(
            `/projects/${projectId}/material-records?limit=2${cursor ? `&cursor=${cursor}` : ''}`,
          )
        ).body,
      );

      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor);

    expect(pages).toBe(3);
    expect([...seen].sort()).toEqual([...made].sort());
    expect((await s.get(`/projects/${projectId}/material-records?cursor=망가진값`)).status).toBe(
      400,
    );
  });

  it('기록을 고치고 삭제하면 소프트 삭제로 목록에서 빠진다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const material = await s.material();
    const id = (await s.record(projectId, { materialId: material.id, kind: 'USED', quantity: 3 }))
      .body.id;
    const changed = await s.patch(`/material-records/${id}`, {
      quantity: 4,
      kind: 'DISCARDED',
      area: '옥상',
      memo: '불량',
      categoryId: s.categoryId,
    });

    expect(changed.body).toMatchObject({
      quantity: 4,
      kind: 'DISCARDED',
      area: '옥상',
      memo: '불량',
    });
    expect(
      (await s.patch(`/material-records/${id}`, { area: null, categoryId: null })).body,
    ).toMatchObject({
      area: null,
      categoryId: null,
    });
    expect((await s.patch(`/material-records/${id}`, {})).status).toBe(400);
    expect((await s.patch(`/material-records/${id}`, { quantity: 0 })).status).toBe(400);
    expect((await s.del(`/material-records/${id}`)).body).toEqual({ success: true });
    expect((await s.del(`/material-records/${id}`)).status).toBe(404);
    expect((await s.patch(`/material-records/${id}`, { quantity: 1 })).status).toBe(404);

    const row = await db.owner.materialRecord.findFirstOrThrow({ where: { id } });

    expect(row.deletedAt).not.toBeNull();
  });

  it('다른 회사의 기록은 수정·삭제할 수 없다', async () => {
    const a = await setup();
    const b = await setup();
    const projectId = await b.project();
    const id = (
      await b.record(projectId, { materialId: (await b.material()).id, kind: 'USED', quantity: 1 })
    ).body.id;

    expect((await a.patch(`/material-records/${id}`, { quantity: 9 })).status).toBe(404);
    expect((await a.del(`/material-records/${id}`)).status).toBe(404);
    expect((await a.get(`/projects/${projectId}/material-records`)).status).toBe(404);
    expect((await a.get(`/projects/${projectId}/material-balance`)).status).toBe(404);
  });
});

describe('프로젝트별 자재 현황', () => {
  it('서비스 기획서 예시: 반입 100, 사용 72, 반출 10, 폐기 3이면 잔량 15장', async () => {
    const s = await setup();
    const projectId = await s.project();
    const material = await s.material();
    const records = [
      ['RECEIVED', 60],
      ['RECEIVED', 40],
      ['USED', 40],
      ['USED', 32],
      ['RETURNED', 10],
      ['DISCARDED', 3],
    ] as const;

    for (const [kind, quantity] of records) {
      await s.record(projectId, { materialId: material.id, kind, quantity });
    }

    expect(await s.balance(projectId)).toEqual([
      {
        materialId: material.id,
        name: '아연도강판',
        spec: '1.0T',
        unit: '장',
        received: 100,
        used: 72,
        returned: 10,
        discarded: 3,
        remaining: 15,
        isNegative: false,
        usedForChange: 0,
        usedForAfterService: 0,
      },
    ]);
  });

  it('잔량이 마이너스면 경고 표시를 하고, 지운 기록과 다른 프로젝트 기록은 빼고 센다', async () => {
    const s = await setup();
    const p1 = await s.project('A동');
    const p2 = await s.project('B동');
    const material = await s.material();

    await s.record(p1, { materialId: material.id, kind: 'RECEIVED', quantity: 5 });
    await s.record(p1, { materialId: material.id, kind: 'USED', quantity: 8, isChange: true });
    await s.record(p2, { materialId: material.id, kind: 'RECEIVED', quantity: 100 });

    const removed = (await s.record(p1, { materialId: material.id, kind: 'USED', quantity: 50 }))
      .body.id;

    await s.del(`/material-records/${removed}`);

    const [item] = await s.balance(p1);

    expect(item).toMatchObject({ remaining: -3, isNegative: true, usedForChange: 8 });
    expect((await s.balance(p2))[0]).toMatchObject({ remaining: 100, isNegative: false });
  });

  it('소수 수량도 오차 없이 합친다', async () => {
    const s = await setup();
    const projectId = await s.project();
    const material = await s.material({ name: '실리콘', unit: 'kg' });

    await s.record(projectId, { materialId: material.id, kind: 'RECEIVED', quantity: 0.3 });
    await s.record(projectId, { materialId: material.id, kind: 'USED', quantity: 0.1 });
    await s.record(projectId, { materialId: material.id, kind: 'USED', quantity: 0.2 });

    expect((await s.balance(projectId))[0]).toMatchObject({ used: 0.3, remaining: 0 });
  });

  it('기록이 없는 프로젝트는 빈 목록이다', async () => {
    const s = await setup();

    expect(await s.balance(await s.project())).toEqual([]);
  });
});
