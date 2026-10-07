import {
  assignmentSchema,
  assignmentsResponseSchema,
  errorResponseSchema,
  projectPeriodHistorySchema,
} from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createAssignmentService } from '../assignment/assignmentService';
import { createAccountService } from '../auth/accountService';
import { createOptionService } from '../company/optionService';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createEmployeeService } from '../employee/employeeService';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../http/csrf';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createPartnerService } from '../partner/partnerService';
import { createProjectService } from '../project/projectService';
import { SESSION_COOKIE } from '../session/cookie';
import { createPrismaSessionStore } from '../session/sessionStore';

let db: TestDatabase;
let documentIds: string[];

jest.setTimeout(240_000);

// 코드의 연도를 고정 (서울 기준 2026-10-07)
const NOW = new Date('2026-10-07T03:00:00Z');

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

const app = (now: Date = NOW) =>
  createApp({
    sessionStore: createPrismaSessionStore(db.auth),
    accountService: createAccountService({ auth: db.auth, app: db.app }),
    options: createOptionService(db.app),
    employees: createEmployeeService(db.app, () => now),
    partners: createPartnerService(db.app),
    projects: createProjectService(db.app, () => now),
    assignments: createAssignmentService(db.app),
    appOrigin: 'http://localhost:5173',
  });

let sequence = 0;

const signedUp = async (instance: ReturnType<typeof app>) => {
  sequence += 1;

  const invitation = await createCompanyWithInvitation(db.operator, {
    companyName: `투입회사${sequence}`,
    adminName: '투입관리자',
    operator: 'test',
  });
  const res = await request(instance)
    .post('/api/v1/auth/signup')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      inviteToken: invitation.token,
      loginId: `assign-user-${sequence}`,
      password: 'Correct-horse-2026!',
      email: `assign${sequence}@example.com`,
      isAgeConfirmed: true,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

  return (res.headers['set-cookie'] as unknown as string[]).find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )!;
};

const api = (instance: ReturnType<typeof app>, cookie: string) => {
  const send = (method: 'post' | 'patch', path: string, body: object) =>
    (method === 'post'
      ? request(instance).post(`/api/v1${path}`)
      : request(instance).patch(`/api/v1${path}`)
    )
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .set('Cookie', cookie)
      .send(body);
  const get = (path: string) => request(instance).get(`/api/v1${path}`).set('Cookie', cookie);

  return {
    createProject: (body: object) => send('post', '/projects', body),
    getProject: (id: string) => get(`/projects/${id}`),
    updateProject: (id: string, body: object) => send('patch', `/projects/${id}`, body),
    transition: (id: string, body: object) => send('post', `/projects/${id}/status`, body),
    periodHistory: (id: string) => get(`/projects/${id}/period-history`),
    createEmployee: async (name: string) =>
      (await send('post', '/employees', { name })).body.id as string,
    updateEmployee: (id: string, body: object) => send('patch', `/employees/${id}`, body),
    createPartner: async (kind: string, name: string) =>
      (await send('post', '/partners', { kind, name })).body.id as string,
    list: (projectId: string, query = '') => get(`/projects/${projectId}/assignments${query}`),
    assign: (projectId: string, body: object) =>
      send('post', `/projects/${projectId}/assignments`, body),
    updateAssignment: (projectId: string, id: string, body: object) =>
      send('patch', `/projects/${projectId}/assignments/${id}`, body),
    cancel: (projectId: string, id: string, body: object = {}) =>
      send('post', `/projects/${projectId}/assignments/${id}/cancel`, body),
  };
};

// 한 회사의 프로젝트(2026-10-01 ~ 2026-12-31)와 직원 두 명을 만들어 돌려줌
const setup = async (instance: ReturnType<typeof app>) => {
  const cookie = await signedUp(instance);
  const client = api(instance, cookie);
  const clientId = await client.createPartner('CLIENT', '가나다건설');
  const managerId = await client.createEmployee('박소장');
  const worker = await client.createEmployee('김작업');
  const worker2 = await client.createEmployee('이작업');
  const projectBody = {
    name: 'A동 판금 공사',
    siteName: 'A동 현장',
    clientId,
    managerId,
    contractDate: '2026-09-01',
    plannedStart: '2026-10-01',
    plannedEnd: '2026-12-31',
  };
  const project = (await client.createProject(projectBody)).body.id as string;

  return { client, clientId, managerId, worker, worker2, project, projectBody };
};

const assignmentsOf = (res: request.Response) => assignmentsResponseSchema.parse(res.body).items;
const FULL = { startDate: '2026-10-01', endDate: '2026-12-31' };

describe('투입 등록', () => {
  it('로그인하지 않으면 접근할 수 없다', async () => {
    const instance = app();
    const { project, worker } = await setup(instance);

    expect((await request(instance).get(`/api/v1/projects/${project}/assignments`)).status).toBe(
      401,
    );
    expect(
      (
        await request(instance)
          .post(`/api/v1/projects/${project}/assignments`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE)
          .send({ employeeId: worker, ...FULL })
      ).status,
    ).toBe(401);
  });

  it('프로젝트 기간 안에서 직원을 투입하고 계획 공수(분)를 저장한다', async () => {
    const instance = app();
    const { client, project, worker } = await setup(instance);
    const res = await client.assign(project, {
      employeeId: worker,
      startDate: '2026-10-05',
      endDate: '2026-11-30',
      plannedMinutes: 9600,
    });

    expect(res.status).toBe(201);
    expect(assignmentSchema.parse(res.body)).toMatchObject({
      projectId: project,
      employeeId: worker,
      startDate: '2026-10-05',
      endDate: '2026-11-30',
      plannedMinutes: 9600,
      cancelledAt: null,
      warnings: [],
    });
    expect(assignmentsOf(await client.list(project))).toHaveLength(1);
  });

  it('계획 공수 없이도 투입할 수 있고 경계일(프로젝트 시작·종료일)도 허용한다', async () => {
    const instance = app();
    const { client, project, worker } = await setup(instance);
    const res = await client.assign(project, { employeeId: worker, ...FULL });

    expect(res.status).toBe(201);
    expect(res.body.plannedMinutes).toBeNull();
  });

  it('프로젝트 기간 밖이거나 시작이 종료보다 늦으면 거부한다', async () => {
    const instance = app();
    const { client, project, worker } = await setup(instance);

    for (const [body, path] of [
      [{ startDate: '2026-09-30', endDate: '2026-11-01' }, 'body.startDate'],
      [{ startDate: '2026-11-01', endDate: '2027-01-01' }, 'body.endDate'],
      [{ startDate: '2026-11-10', endDate: '2026-11-01' }, 'body.endDate'],
    ] as const) {
      const res = await client.assign(project, { employeeId: worker, ...body });

      expect(res.status).toBe(400);
      expect(errorResponseSchema.parse(res.body).error.details?.[0]?.path).toBe(path);
    }

    expect(assignmentsOf(await client.list(project))).toHaveLength(0);
  });

  it('입력 형식을 검사한다 (직원 없음·날짜 형식·계획 공수 범위)', async () => {
    const instance = app();
    const { client, project, worker } = await setup(instance);

    for (const body of [
      { startDate: '2026-10-01', endDate: '2026-10-02' },
      { employeeId: 'abc', ...FULL },
      { employeeId: worker, startDate: '2026-13-01', endDate: '2026-12-01' },
      { employeeId: worker, ...FULL, plannedMinutes: 0 },
      { employeeId: worker, ...FULL, plannedMinutes: -5 },
      { employeeId: worker, ...FULL, plannedMinutes: 1.5 },
      { employeeId: worker, ...FULL, plannedMinutes: 6_000_001 },
    ]) {
      expect((await client.assign(project, body)).status).toBe(400);
    }
  });

  it('퇴사한 직원과 없는 직원은 투입할 수 없고 휴직 직원은 경고와 함께 투입된다', async () => {
    const instance = app();
    const { client, project, worker, worker2 } = await setup(instance);

    await client.updateEmployee(worker, { status: 'LEFT' });
    await client.updateEmployee(worker2, { status: 'ON_LEAVE' });

    const left = await client.assign(project, { employeeId: worker, ...FULL });

    expect(left.status).toBe(400);
    expect(errorResponseSchema.parse(left.body).error.details?.[0]?.path).toBe('body.employeeId');
    expect(
      (
        await client.assign(project, {
          employeeId: '0198d000-0000-7000-8000-000000000999',
          ...FULL,
        })
      ).status,
    ).toBe(400);

    const onLeave = await client.assign(project, { employeeId: worker2, ...FULL });

    expect(onLeave.status).toBe(201);
    expect(onLeave.body.warnings).toEqual([{ type: 'ON_LEAVE' }]);
  });

  it('투입 뒤에 직원이 퇴사하면 목록에 퇴사 경고가 붙는다', async () => {
    const instance = app();
    const { client, project, worker } = await setup(instance);

    await client.assign(project, { employeeId: worker, ...FULL });
    await client.updateEmployee(worker, { status: 'LEFT' });

    expect(assignmentsOf(await client.list(project))[0]!.warnings).toEqual([{ type: 'LEFT' }]);
  });
});

describe('상태별 투입 허용', () => {
  it('예정·진행에서는 투입할 수 있다', async () => {
    const instance = app();
    const { client, project, worker, worker2 } = await setup(instance);

    expect((await client.assign(project, { employeeId: worker, ...FULL })).status).toBe(201);
    await client.transition(project, { toStatus: 'IN_PROGRESS' });
    expect((await client.assign(project, { employeeId: worker2, ...FULL })).status).toBe(201);
  });

  it('중단 중에는 관리자 확인이 있어야 투입·수정·취소할 수 있다', async () => {
    const instance = app();
    const { client, project, worker, worker2 } = await setup(instance);
    const first = await client.assign(project, { employeeId: worker, ...FULL });

    await client.transition(project, { toStatus: 'IN_PROGRESS', effectiveOn: '2026-10-01' });
    await client.transition(project, {
      toStatus: 'SUSPENDED',
      effectiveOn: '2026-10-02',
      reason: '우천',
    });

    const blocked = await client.assign(project, { employeeId: worker2, ...FULL });

    expect(blocked.status).toBe(400);
    expect(errorResponseSchema.parse(blocked.body).error.details?.[0]?.path).toBe(
      'body.confirmSuspended',
    );
    expect(
      (await client.updateAssignment(project, first.body.id, { plannedMinutes: 100 })).status,
    ).toBe(400);
    expect((await client.cancel(project, first.body.id)).status).toBe(400);
    expect(
      (await client.assign(project, { employeeId: worker2, ...FULL, confirmSuspended: true }))
        .status,
    ).toBe(201);
    expect(
      (
        await client.updateAssignment(project, first.body.id, {
          plannedMinutes: 100,
          confirmSuspended: true,
        })
      ).status,
    ).toBe(200);
    expect((await client.cancel(project, first.body.id, { confirmSuspended: true })).status).toBe(
      200,
    );
  });

  it('완료·취소된 프로젝트에는 투입을 바꿀 수 없다', async () => {
    const instance = app();
    const { client, project, worker, worker2, projectBody } = await setup(instance);
    const existing = await client.assign(project, { employeeId: worker, ...FULL });
    const cancelledProject = (await client.createProject({ ...projectBody, name: '취소될 공사' }))
      .body.id as string;

    await client.transition(project, { toStatus: 'IN_PROGRESS' });
    await client.transition(project, { toStatus: 'COMPLETED' });
    await client.transition(cancelledProject, { toStatus: 'CANCELLED', reason: '해지' });

    for (const target of [project, cancelledProject]) {
      const res = await client.assign(target, { employeeId: worker2, ...FULL });

      expect(res.status).toBe(400);
      expect(errorResponseSchema.parse(res.body).error.details?.[0]?.message).toContain(
        '투입을 바꿀 수 없습니다',
      );
    }

    expect(
      (await client.updateAssignment(project, existing.body.id, { plannedMinutes: 10 })).status,
    ).toBe(400);
    expect((await client.cancel(project, existing.body.id)).status).toBe(400);
    // 조회는 계속 가능
    expect(assignmentsOf(await client.list(project))).toHaveLength(1);
  });
});

describe('겹침', () => {
  it('같은 프로젝트에 같은 직원이 겹치는 기간으로 두 번 투입될 수 없지만 맞닿거나 떨어진 기간은 가능하다', async () => {
    const instance = app();
    const { client, project, worker } = await setup(instance);

    await client.assign(project, {
      employeeId: worker,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });

    const overlap = await client.assign(project, {
      employeeId: worker,
      startDate: '2026-10-31',
      endDate: '2026-11-30',
    });

    expect(overlap.status).toBe(400);
    expect(errorResponseSchema.parse(overlap.body).error.details?.[0]?.message).toContain(
      '이미 투입',
    );
    // 하루 뒤부터는 가능하고, 떨어진 두 번째 투입도 가능
    expect(
      (
        await client.assign(project, {
          employeeId: worker,
          startDate: '2026-11-01',
          endDate: '2026-11-15',
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await client.assign(project, {
          employeeId: worker,
          startDate: '2026-12-01',
          endDate: '2026-12-31',
        })
      ).status,
    ).toBe(201);
  });

  it('같은 요청이 동시에 들어와도 겹치는 투입은 한 건만 생긴다', async () => {
    const instance = app();
    const { client, project, worker } = await setup(instance);
    const results = await Promise.all(
      Array.from({ length: 4 }, () => client.assign(project, { employeeId: worker, ...FULL })),
    );

    expect(results.map((res) => res.status).sort()).toEqual([201, 400, 400, 400]);
    expect(assignmentsOf(await client.list(project))).toHaveLength(1);
  });

  it('다른 프로젝트와 기간이 겹치면 막지 않고 겹치는 구간과 프로젝트를 경고로 알린다', async () => {
    const instance = app();
    const { client, project, worker, projectBody } = await setup(instance);
    const other = (
      await client.createProject({
        ...projectBody,
        name: 'B동 덕트',
        plannedStart: '2026-11-15',
        plannedEnd: '2027-01-31',
      })
    ).body;

    await client.assign(project, {
      employeeId: worker,
      startDate: '2026-10-01',
      endDate: '2026-11-20',
    });

    const second = await client.assign(other.id, {
      employeeId: worker,
      startDate: '2026-11-15',
      endDate: '2027-01-31',
    });

    expect(second.status).toBe(201);
    expect(second.body.warnings).toEqual([
      expect.objectContaining({
        type: 'OVERLAP',
        projectName: 'A동 판금 공사',
        projectCode: expect.stringMatching(/^2026-\d{3}$/),
        from: '2026-11-15',
        to: '2026-11-20',
      }),
    ]);
    // 먼저 투입한 쪽 목록에도 같은 경고가 붙는다
    expect(assignmentsOf(await client.list(project))[0]!.warnings).toEqual([
      expect.objectContaining({
        type: 'OVERLAP',
        projectName: 'B동 덕트',
        from: '2026-11-15',
        to: '2026-11-20',
      }),
    ]);
  });

  it('겹치지 않거나 취소한 투입·취소된 프로젝트는 경고하지 않는다', async () => {
    const instance = app();
    const { client, project, worker, worker2, projectBody } = await setup(instance);
    const other = (await client.createProject({ ...projectBody, name: 'B동 덕트' })).body
      .id as string;
    const third = (await client.createProject({ ...projectBody, name: '취소될 공사' })).body
      .id as string;

    await client.assign(project, {
      employeeId: worker,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
    expect(
      (
        await client.assign(other, {
          employeeId: worker,
          startDate: '2026-11-01',
          endDate: '2026-11-30',
        })
      ).body.warnings,
    ).toEqual([]);

    // 취소한 투입과는 겹침으로 보지 않음
    const cancelled = await client.assign(other, {
      employeeId: worker2,
      startDate: '2026-10-01',
      endDate: '2026-12-31',
    });

    await client.cancel(other, cancelled.body.id);
    expect((await client.assign(project, { employeeId: worker2, ...FULL })).body.warnings).toEqual(
      [],
    );
    // 취소된 프로젝트의 투입과도 겹침으로 보지 않음
    await client.assign(third, { employeeId: worker, ...FULL });
    await client.transition(third, { toStatus: 'CANCELLED', reason: '해지' });
    expect(
      assignmentsOf(await client.list(project)).find((item) => item.employeeId === worker)!
        .warnings,
    ).toEqual([]);
  });
});

describe('투입 수정·취소', () => {
  it('기간과 계획 공수를 수정하고 계획 공수를 null로 비운다', async () => {
    const instance = app();
    const { client, project, worker } = await setup(instance);
    const created = await client.assign(project, {
      employeeId: worker,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      plannedMinutes: 4800,
    });
    const id = created.body.id;

    expect(
      (await client.updateAssignment(project, id, { endDate: '2026-11-30' })).body,
    ).toMatchObject({
      startDate: '2026-10-01',
      endDate: '2026-11-30',
      plannedMinutes: 4800,
    });
    expect(
      (await client.updateAssignment(project, id, { plannedMinutes: null })).body.plannedMinutes,
    ).toBeNull();
    expect(
      (await client.updateAssignment(project, id, { plannedMinutes: 480 })).body.plannedMinutes,
    ).toBe(480);
    // 직원은 바꿀 수 없고 바꿀 값이 없으면 거부
    expect((await client.updateAssignment(project, id, { employeeId: worker })).status).toBe(400);
    expect((await client.updateAssignment(project, id, {})).status).toBe(400);
  });

  it('수정한 기간도 프로젝트 기간 안이어야 하고 같은 직원의 다른 투입과 겹칠 수 없다', async () => {
    const instance = app();
    const { client, project, worker } = await setup(instance);
    const first = await client.assign(project, {
      employeeId: worker,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });

    await client.assign(project, {
      employeeId: worker,
      startDate: '2026-11-10',
      endDate: '2026-11-30',
    });

    expect(
      (await client.updateAssignment(project, first.body.id, { startDate: '2026-09-01' })).status,
    ).toBe(400);
    expect(
      (await client.updateAssignment(project, first.body.id, { endDate: '2027-02-01' })).status,
    ).toBe(400);
    expect(
      (await client.updateAssignment(project, first.body.id, { endDate: '2026-11-10' })).status,
    ).toBe(400);
    // 자기 자신과는 겹쳐도 됨 (기간 확장)
    expect(
      (await client.updateAssignment(project, first.body.id, { endDate: '2026-11-09' })).status,
    ).toBe(200);
  });

  it('취소하면 기본 목록에서 빠지고 취소 시각이 남으며 같은 기간에 다시 투입할 수 있다', async () => {
    const instance = app();
    const { client, project, worker } = await setup(instance);
    const created = await client.assign(project, { employeeId: worker, ...FULL });
    const cancelled = await client.cancel(project, created.body.id);

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.cancelledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(assignmentsOf(await client.list(project))).toHaveLength(0);

    const all = assignmentsOf(await client.list(project, '?includeCancelled=true'));

    expect(all).toHaveLength(1);
    expect(all[0]!.cancelledAt).not.toBeNull();
    expect((await client.assign(project, { employeeId: worker, ...FULL })).status).toBe(201);
    // 이미 취소한 투입을 다시 취소하거나 수정할 수는 없음
    expect((await client.cancel(project, created.body.id)).status).toBe(400);
    expect(
      (await client.updateAssignment(project, created.body.id, { plannedMinutes: 10 })).status,
    ).toBe(400);
  });

  it('다른 프로젝트의 투입 ID나 없는 ID는 404다', async () => {
    const instance = app();
    const { client, project, worker, projectBody } = await setup(instance);
    const other = (await client.createProject({ ...projectBody, name: '다른 공사' })).body
      .id as string;
    const created = await client.assign(project, { employeeId: worker, ...FULL });

    expect(
      (await client.updateAssignment(other, created.body.id, { plannedMinutes: 10 })).status,
    ).toBe(404);
    expect((await client.cancel(other, created.body.id)).status).toBe(404);
    expect(
      (
        await client.updateAssignment(project, '0198d000-0000-7000-8000-000000000999', {
          plannedMinutes: 10,
        })
      ).status,
    ).toBe(404);
    expect((await client.list('0198d000-0000-7000-8000-000000000999')).status).toBe(404);
    expect((await client.list('not-a-uuid')).status).toBe(400);
  });
});

describe('프로젝트 기간 변경 이력', () => {
  it('예정 상태에서는 사유 없이 바꿀 수 있고 이력이 남는다', async () => {
    const instance = app();
    const { client, project } = await setup(instance);
    const res = await client.updateProject(project, { plannedEnd: '2027-01-31' });

    expect(res.status).toBe(200);

    const history = projectPeriodHistorySchema.parse(
      (await client.periodHistory(project)).body,
    ).items;

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      fromStart: '2026-10-01',
      fromEnd: '2026-12-31',
      toStart: '2026-10-01',
      toEnd: '2027-01-31',
      reason: null,
    });
  });

  it('시작한 뒤에는 사유가 필수이고 사유는 앞뒤 공백을 지운 값으로 남는다', async () => {
    const instance = app();
    const { client, project } = await setup(instance);

    await client.transition(project, { toStatus: 'IN_PROGRESS' });

    const blocked = await client.updateProject(project, { plannedEnd: '2027-01-31' });

    expect(blocked.status).toBe(400);
    expect(errorResponseSchema.parse(blocked.body).error.details?.[0]?.path).toBe(
      'body.periodChangeReason',
    );
    expect(
      (await client.updateProject(project, { plannedEnd: '2027-01-31', periodChangeReason: '   ' }))
        .status,
    ).toBe(400);
    expect((await client.getProject(project)).body.plannedEnd).toBe('2026-12-31');
    expect(
      (
        await client.updateProject(project, {
          plannedEnd: '2027-01-31',
          periodChangeReason: ' 자재 지연으로 연장 ',
        })
      ).status,
    ).toBe(200);
    expect(
      projectPeriodHistorySchema.parse((await client.periodHistory(project)).body).items[0],
    ).toMatchObject({
      toEnd: '2027-01-31',
      reason: '자재 지연으로 연장',
    });
  });

  it('기간을 바꾸지 않은 수정은 이력을 남기지 않고 사유는 무시한다', async () => {
    const instance = app();
    const { client, project } = await setup(instance);

    await client.transition(project, { toStatus: 'IN_PROGRESS' });
    await client.updateProject(project, { name: '이름만 변경', periodChangeReason: '쓰이지 않음' });
    // 같은 기간을 그대로 보내도 변경이 아님
    await client.updateProject(project, { plannedStart: '2026-10-01', plannedEnd: '2026-12-31' });

    expect(
      projectPeriodHistorySchema.parse((await client.periodHistory(project)).body).items,
    ).toHaveLength(0);
  });

  it('여러 번 바꾸면 최근 변경이 맨 앞에 온다', async () => {
    const instance = app();
    const { client, project } = await setup(instance);

    await client.updateProject(project, { plannedEnd: '2027-01-31' });
    await client.updateProject(project, { plannedStart: '2026-09-15' });

    const items = projectPeriodHistorySchema.parse(
      (await client.periodHistory(project)).body,
    ).items;

    expect(items.map((item) => `${item.toStart}~${item.toEnd}`)).toEqual([
      '2026-09-15~2027-01-31',
      '2026-10-01~2027-01-31',
    ]);
  });

  it('투입이 새 기간 밖으로 나가면 거부하고, 조정하거나 취소하면 줄일 수 있다', async () => {
    const instance = app();
    const { client, project, worker, worker2 } = await setup(instance);
    const a = await client.assign(project, { employeeId: worker, ...FULL });
    const b = await client.assign(project, {
      employeeId: worker2,
      startDate: '2026-12-01',
      endDate: '2026-12-31',
    });

    const blocked = await client.updateProject(project, { plannedEnd: '2026-11-30' });

    expect(blocked.status).toBe(400);
    expect(errorResponseSchema.parse(blocked.body).error.details?.[0]?.message).toContain(
      '투입 2건',
    );
    expect((await client.updateProject(project, { plannedStart: '2026-10-10' })).status).toBe(400);
    expect(
      projectPeriodHistorySchema.parse((await client.periodHistory(project)).body).items,
    ).toHaveLength(0);

    // 투입 하나는 줄이고 하나는 취소한 뒤에는 줄일 수 있음
    await client.updateAssignment(project, a.body.id, { endDate: '2026-11-30' });
    await client.cancel(project, b.body.id);

    expect((await client.updateProject(project, { plannedEnd: '2026-11-30' })).status).toBe(200);
    // 기간을 늘리는 것은 언제나 가능
    expect((await client.updateProject(project, { plannedEnd: '2027-03-31' })).status).toBe(200);
  });

  it('기간 변경과 투입 등록이 동시에 들어와도 투입이 새 기간 밖으로 남지 않는다', async () => {
    const instance = app();
    const { client, project, worker } = await setup(instance);
    const results = await Promise.all([
      client.assign(project, {
        employeeId: worker,
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      }),
      client.updateProject(project, { plannedEnd: '2026-11-30' }),
    ]);
    const assigned = results[0].status === 201;
    const shrunk = results[1].status === 200;

    // 둘 중 하나만 성공해야 함 (둘 다 성공하면 투입이 프로젝트 기간 밖에 생김)
    expect(assigned !== shrunk).toBe(true);

    const project2 = (await client.getProject(project)).body;
    const items = assignmentsOf(await client.list(project));

    for (const item of items) {
      expect(item.endDate <= project2.plannedEnd).toBe(true);
    }
  });

  it('없는 프로젝트·다른 회사 프로젝트의 이력은 404, 로그인 없이는 401이다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);

    expect((await b.client.periodHistory(a.project)).status).toBe(404);
    expect((await b.client.periodHistory('0198d000-0000-7000-8000-000000000999')).status).toBe(404);
    expect(
      (await request(instance).get(`/api/v1/projects/${a.project}/period-history`)).status,
    ).toBe(401);
  });
});

describe('회사 격리·DB 제약', () => {
  it('다른 회사의 프로젝트에는 투입을 조회·등록·수정·취소할 수 없다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);
    const created = await a.client.assign(a.project, { employeeId: a.worker, ...FULL });

    expect((await b.client.list(a.project)).status).toBe(404);
    expect((await b.client.assign(a.project, { employeeId: b.worker, ...FULL })).status).toBe(404);
    expect(
      (await b.client.updateAssignment(a.project, created.body.id, { plannedMinutes: 10 })).status,
    ).toBe(404);
    expect((await b.client.cancel(a.project, created.body.id)).status).toBe(404);
  });

  it('다른 회사 직원은 투입할 수 없다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);
    const res = await b.client.assign(b.project, { employeeId: a.worker, ...FULL });

    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).error.details?.[0]?.path).toBe('body.employeeId');
  });

  it('요청에 회사 ID를 실어 보내도 무시된다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);
    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      'SELECT company_id FROM projects WHERE id = $1',
      [a.project],
    );

    expect(
      (
        await b.client.assign(b.project, {
          employeeId: b.worker,
          ...FULL,
          companyId: rows[0]!.company_id,
        })
      ).status,
    ).toBe(201);
    expect(assignmentsOf(await a.client.list(a.project))).toHaveLength(0);
  });

  it('다른 회사의 투입을 DB가 거부하고 앱 계정은 투입·기간 이력을 지우거나 이력을 고칠 수 없다', async () => {
    const instance = app();
    const a = await setup(instance);
    const b = await setup(instance);
    const { rows } = await db.ownerPool.query<{ company_id: string }>(
      'SELECT company_id FROM projects WHERE id = $1',
      [a.project],
    );
    const company = rows[0]!.company_id;

    await a.client.updateProject(a.project, { plannedEnd: '2027-01-31' });
    await a.client.assign(a.project, { employeeId: a.worker, ...FULL });

    await expect(
      db.ownerPool.query(
        `INSERT INTO project_assignments (company_id, project_id, employee_id, start_date, end_date) VALUES ($1, $2, $3, '2026-10-01', '2026-10-02')`,
        [company, a.project, b.worker],
      ),
    ).rejects.toThrow(/project_assignments_company_id_employee_id_fkey/);
    await expect(
      db.ownerPool.query(
        `INSERT INTO project_assignments (company_id, project_id, employee_id, start_date, end_date) VALUES ($1, $2, $3, '2026-10-05', '2026-10-02')`,
        [company, a.project, a.worker],
      ),
    ).rejects.toThrow(/project_assignments_period_order/);
    await expect(
      db.ownerPool.query(
        `INSERT INTO project_assignments (company_id, project_id, employee_id, start_date, end_date, planned_minutes) VALUES ($1, $2, $3, '2026-10-01', '2026-10-02', 0)`,
        [company, a.project, a.worker],
      ),
    ).rejects.toThrow(/project_assignments_planned_range/);
    await expect(db.app.$executeRawUnsafe('DELETE FROM project_assignments')).rejects.toThrow();
    await expect(db.app.$executeRawUnsafe('DELETE FROM project_period_changes')).rejects.toThrow();
    await expect(
      db.app.$executeRawUnsafe(`UPDATE project_period_changes SET reason = 'x'`),
    ).rejects.toThrow();
  });
});
