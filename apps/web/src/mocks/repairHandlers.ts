import {
  canEditRepair,
  isRepairOpen,
  projectParamsSchema,
  repairCreateSchema,
  repairLinkParamsSchema,
  repairLinkSchema,
  repairListQuerySchema,
  repairParamsSchema,
  repairProjectCheck,
  repairTransitionSchema,
  repairUpdateSchema,
  todayInSeoul,
  validateRepairTransition,
  type ErrorCode,
  type RepairLinkItem,
  type RepairRequest,
  type RepairRequestDetail,
  type RepairStatusChange,
  type RepairUsage,
} from '@field-note/shared';
import { http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import type { MockAccount } from './data';
import { DEMO_REPAIRS } from './demoSource';
import { listMockMaterialRecords } from './materialHandlers';
import { getCurrentAccount, getProjects, getWorkLogs } from './state';
import { mockDelay } from './latency';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

type MockLink = {
  id: string;
  workLogId: string | null;
  materialRecordId: string | null;
  linkedAt: string;
  unlinkedAt: string | null;
};

type MockRepair = Omit<RepairRequest, 'linkCount'> & {
  scope: string;
  history: RepairStatusChange[];
  links: MockLink[];
};

// 목업 저장소: 회사별 보수 요청 (새로고침하면 초기화). 실제 서버가 하는 일을 흉내 낸다
const repairs = new Map<string, MockRepair>();
const seeded = new Set<string>();

export const resetMockRepairs = () => {
  repairs.clear();
  seeded.clear();
};

// 회사 구분 값 (회사가 없는 가입 직후 계정은 계정 단위로 나눔)
const scopeOf = (account: MockAccount) => account.companyId ?? account.loginId;

// 더미 보수 요청은 DB 시드와 같은 원본을 쓴다 (프로젝트 코드로 연결)
const seed = (account: MockAccount) => {
  if (seeded.has(scopeOf(account))) return;

  seeded.add(scopeOf(account));

  const projects = getProjects(account);

  for (const item of DEMO_REPAIRS.filter((demo) => demo.companyId === account.companyId)) {
    const project = projects.find((candidate) => candidate.code === item.projectCode);

    if (!project) continue;

    repairs.set(item.id, {
      id: item.id,
      scope: scopeOf(account),
      projectId: project.id,
      seq: item.seq,
      receivedOn: item.receivedOn,
      requester: item.requester,
      content: item.content,
      location: item.location ?? null,
      status: item.status,
      statusChangedOn: item.statusChangedOn,
      resolvedOn: item.resolvedOn ?? null,
      createdAt: `${item.receivedOn}T09:00:00.000Z`,
      updatedAt: `${item.statusChangedOn}T09:00:00.000Z`,
      history: (item.history ?? []).map((change, index) => ({
        id: `${item.id.slice(0, -2)}${String(index + 50).padStart(2, '0')}`,
        fromStatus: change.fromStatus,
        toStatus: change.toStatus,
        effectiveOn: change.effectiveOn,
        note: change.note ?? null,
        changedAt: `${change.effectiveOn}T09:00:00.000Z`,
      })),
      links: [],
    });
  }
};

const mine = (account: MockAccount) => {
  seed(account);

  return [...repairs.values()].filter((repair) => repair.scope === scopeOf(account));
};

/**
 * @description 상태 전환 검사·안내가 읽는 보수 요청 건수 (접수·처리 중은 종료를 막고, 보류는 안내만)
 * @param account 현재 계정
 * @param projectId 프로젝트
 * @returns 미처리·보류 건수
 */
export const countMockRepairs = (account: MockAccount, projectId: string) => {
  const items = mine(account).filter((repair) => repair.projectId === projectId);

  return {
    open: items.filter((repair) => isRepairOpen(repair.status)).length,
    hold: items.filter((repair) => repair.status === 'ON_HOLD').length,
  };
};

/**
 * @description 대시보드가 읽는 접수·처리 중 보수 요청 (프로젝트 이름 포함)
 * @param account 현재 계정
 * @returns 보수 요청 목록
 */
export const listMockOpenRepairs = (account: MockAccount) => {
  const projects = new Map(getProjects(account).map((project) => [project.id, project]));

  return mine(account).flatMap((repair) => {
    const project = projects.get(repair.projectId);

    return (repair.status === 'RECEIVED' || repair.status === 'IN_PROGRESS') && project
      ? [
          {
            id: repair.id,
            projectId: repair.projectId,
            projectName: project.name,
            seq: repair.seq,
            receivedOn: repair.receivedOn,
            status: repair.status,
          },
        ]
      : [];
  });
};

// 삭제된 자재 기록·임시 저장 작업 내역에 걸린 연결은 세지 않는다
const liveLinks = (account: MockAccount, repair: MockRepair): RepairLinkItem[] => {
  const logs = new Map(getWorkLogs(account).map((log) => [log.id, log]));
  const records = new Map(
    listMockMaterialRecords(account, repair.projectId).map((record) => [record.id, record]),
  );

  return repair.links
    .filter((link) => !link.unlinkedAt)
    .flatMap((link): RepairLinkItem[] => {
      const log = link.workLogId ? logs.get(link.workLogId) : undefined;
      const record = link.materialRecordId ? records.get(link.materialRecordId) : undefined;

      if (log && log.status === 'SAVED') {
        return [
          {
            kind: 'WORK_LOG',
            id: link.id,
            workLogId: log.id,
            workDate: log.workDate,
            content: log.content,
            minutes: log.entries.reduce((sum, entry) => sum + entry.minutes, 0),
            linkedAt: link.linkedAt,
          },
        ];
      }

      if (record) {
        return [
          {
            kind: 'MATERIAL',
            id: link.id,
            materialRecordId: record.id,
            recordDate: record.recordDate,
            name: record.materialName,
            spec: record.spec,
            unit: record.unit,
            recordKind: record.kind,
            quantity: record.quantity,
            linkedAt: link.linkedAt,
          },
        ];
      }

      return [];
    });
};

const toSummary = (account: MockAccount, repair: MockRepair): RepairRequest => ({
  id: repair.id,
  projectId: repair.projectId,
  seq: repair.seq,
  receivedOn: repair.receivedOn,
  requester: repair.requester,
  content: repair.content,
  location: repair.location,
  status: repair.status,
  statusChangedOn: repair.statusChangedOn,
  resolvedOn: repair.resolvedOn,
  linkCount: liveLinks(account, repair).length,
  createdAt: repair.createdAt,
  updatedAt: repair.updatedAt,
});

const usageOf = (links: RepairLinkItem[]): RepairUsage => {
  const materials = new Map<string, RepairUsage['materials'][number]>();

  for (const link of links) {
    if (link.kind === 'MATERIAL' && link.recordKind === 'USED') {
      const key = `${link.name}\u0000${link.spec ?? ''}\u0000${link.unit}`;
      const existing = materials.get(key);

      materials.set(key, {
        materialId: existing?.materialId ?? link.materialRecordId,
        name: link.name,
        spec: link.spec,
        unit: link.unit,
        quantity: (existing?.quantity ?? 0) + link.quantity,
      });
    }
  }

  const logs = links.filter((link) => link.kind === 'WORK_LOG');

  return {
    workLogCount: logs.length,
    minutes: logs.reduce((sum, link) => sum + (link.kind === 'WORK_LOG' ? link.minutes : 0), 0),
    materials: [...materials.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  };
};

const toDetail = (account: MockAccount, repair: MockRepair): RepairRequestDetail => {
  const links = liveLinks(account, repair).sort((a, b) => a.linkedAt.localeCompare(b.linkedAt));

  return {
    ...toSummary(account, repair),
    history: [...repair.history].sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
    links,
    usage: usageOf(links),
  };
};

/**
 * @description 보수 요청 목업 핸들러 (실제 서버와 같은 규칙: 보증 중에만 기록, 완료 전까지만 수정, 보류·되돌리기 사유 필수, 이력, 사후 작업 연결)
 * @param helpers 목업 공통 응답·본문 검사
 */
export const createRepairHandlers = ({ apiError, parseBody }: Helpers) => {
  const latency = () => mockDelay(300);
  const invalid = (path: string, message: string) =>
    apiError('VALIDATION_ERROR', [{ path, message }]);

  // 프로젝트 상태에 따라 막히는지 (§10.3)
  const projectCheck = (account: MockAccount, projectId: string) => {
    const project = getProjects(account).find((item) => item.id === projectId);

    if (!project) return apiError('NOT_FOUND');

    const checked = repairProjectCheck(project.status);

    return checked.ok ? null : invalid(`body.${checked.path}`, checked.message);
  };

  // 로그인과 보수 요청을 확인한다. 실패하면 응답, 성공하면 계정과 보수 요청
  const find = (params: unknown) => {
    const account = getCurrentAccount();

    if (!account) return { response: apiError('UNAUTHORIZED') };

    const parsed = repairParamsSchema.safeParse(params);

    if (!parsed.success) return { response: invalid('params.id', 'Invalid UUID') };

    const repair = mine(account).find((item) => item.id === parsed.data.id);

    return repair ? { account, repair } : { response: apiError('NOT_FOUND') };
  };

  return [
    http.get('/api/v1/projects/:id/repair-requests', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = projectParamsSchema.safeParse(params);

      if (!parsed.success) return invalid('params.id', 'Invalid UUID');

      if (!getProjects(account).some((item) => item.id === parsed.data.id))
        return apiError('NOT_FOUND');

      const query = repairListQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      if (!query.success) {
        return apiError(
          'VALIDATION_ERROR',
          query.error.issues.map((issue) => ({
            path: ['query', ...issue.path].join('.'),
            message: issue.message,
          })),
        );
      }

      return HttpResponse.json({
        items: mine(account)
          .filter(
            (repair) =>
              repair.projectId === parsed.data.id &&
              (!query.data.status || repair.status === query.data.status),
          )
          .sort((a, b) => b.seq - a.seq)
          .map((repair) => toSummary(account, repair)),
      });
    }),

    http.post('/api/v1/projects/:id/repair-requests', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = projectParamsSchema.safeParse(params);

      if (!parsed.success) return invalid('params.id', 'Invalid UUID');

      const body = await parseBody(request, repairCreateSchema);

      if ('response' in body) return body.response;

      const blocked = projectCheck(account, parsed.data.id);

      if (blocked) return blocked;

      const today = todayInSeoul(new Date());
      const receivedOn = body.data.receivedOn ?? today;

      if (receivedOn > today)
        return invalid('body.receivedOn', '접수일은 오늘 이후로 입력할 수 없습니다');

      const existing = mine(account).filter((repair) => repair.projectId === parsed.data.id);
      const now = new Date().toISOString();
      const created: MockRepair = {
        id: crypto.randomUUID(),
        scope: scopeOf(account),
        projectId: parsed.data.id,
        seq: Math.max(0, ...existing.map((repair) => repair.seq)) + 1,
        receivedOn,
        requester: body.data.requester,
        content: body.data.content,
        location: body.data.location?.trim() || null,
        status: 'RECEIVED',
        statusChangedOn: receivedOn,
        resolvedOn: null,
        createdAt: now,
        updatedAt: now,
        history: [],
        links: [],
      };

      repairs.set(created.id, created);

      return HttpResponse.json(toDetail(account, created), { status: 201 });
    }),

    http.get('/api/v1/projects/:id/after-service-usage', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = projectParamsSchema.safeParse(params);

      if (!parsed.success) return invalid('params.id', 'Invalid UUID');

      if (!getProjects(account).some((item) => item.id === parsed.data.id))
        return apiError('NOT_FOUND');

      const logs = getWorkLogs(account).filter(
        (log) => log.projectId === parsed.data.id && log.status === 'SAVED' && log.isAfterService,
      );
      const materials = listMockMaterialRecords(account, parsed.data.id).filter(
        (record) => record.isAfterService && record.kind === 'USED',
      );
      const items = materials.map((record): RepairLinkItem => ({
        kind: 'MATERIAL',
        id: record.id,
        materialRecordId: record.materialId,
        recordDate: record.recordDate,
        name: record.materialName,
        spec: record.spec,
        unit: record.unit,
        recordKind: record.kind,
        quantity: record.quantity,
        linkedAt: record.createdAt,
      }));

      return HttpResponse.json({
        ...usageOf(items),
        workLogCount: logs.length,
        minutes: logs.reduce(
          (sum, log) => sum + log.entries.reduce((inner, entry) => inner + entry.minutes, 0),
          0,
        ),
      });
    }),

    http.get('/api/v1/repair-requests/:id', async ({ params }) => {
      await latency();

      const found = find(params);

      if ('response' in found) return found.response;

      return HttpResponse.json(toDetail(found.account, found.repair));
    }),

    http.patch('/api/v1/repair-requests/:id', async ({ request, params }) => {
      await latency();

      const found = find(params);

      if ('response' in found) return found.response;

      const body = await parseBody(request, repairUpdateSchema);

      if ('response' in body) return body.response;

      const { account, repair } = found;
      const blocked = projectCheck(account, repair.projectId);

      if (blocked) return blocked;

      if (!canEditRepair(repair.status)) {
        return invalid(
          'body.content',
          '완료된 보수 요청은 고칠 수 없습니다. 처리 중으로 되돌린 뒤 수정해 주세요',
        );
      }

      if (body.data.receivedOn !== undefined) {
        if (body.data.receivedOn > todayInSeoul(new Date())) {
          return invalid('body.receivedOn', '접수일은 오늘 이후로 입력할 수 없습니다');
        }

        if (body.data.receivedOn > repair.statusChangedOn) {
          return invalid('body.receivedOn', '접수일은 현재 상태가 된 날보다 늦을 수 없습니다');
        }
      }

      if (body.data.receivedOn !== undefined) repair.receivedOn = body.data.receivedOn;

      if (body.data.requester !== undefined) repair.requester = body.data.requester;

      if (body.data.content !== undefined) repair.content = body.data.content;

      if (body.data.location !== undefined) repair.location = body.data.location?.trim() || null;

      repair.updatedAt = new Date().toISOString();

      return HttpResponse.json(toDetail(account, repair));
    }),

    http.post('/api/v1/repair-requests/:id/status', async ({ request, params }) => {
      await latency();

      const found = find(params);

      if ('response' in found) return found.response;

      const body = await parseBody(request, repairTransitionSchema);

      if ('response' in body) return body.response;

      const { account, repair } = found;
      const blocked = projectCheck(account, repair.projectId);

      if (blocked) return blocked;

      const today = todayInSeoul(new Date());
      const effectiveOn = body.data.effectiveOn ?? today;
      const note = body.data.note?.trim() || null;
      const checked = validateRepairTransition({
        from: repair.status,
        to: body.data.toStatus,
        effectiveOn,
        note,
        receivedOn: repair.receivedOn,
        today,
      });

      if (!checked.ok) return invalid(`body.${checked.path}`, checked.message);

      const changedAt = new Date().toISOString();

      repair.history.push({
        id: crypto.randomUUID(),
        fromStatus: repair.status,
        toStatus: body.data.toStatus,
        effectiveOn,
        note,
        changedAt,
      });
      repair.status = body.data.toStatus;
      repair.statusChangedOn = effectiveOn;
      repair.resolvedOn = body.data.toStatus === 'DONE' ? effectiveOn : null;
      repair.updatedAt = changedAt;

      return HttpResponse.json(toDetail(account, repair));
    }),

    http.post('/api/v1/repair-requests/:id/links', async ({ request, params }) => {
      await latency();

      const found = find(params);

      if ('response' in found) return found.response;

      const body = await parseBody(request, repairLinkSchema);

      if ('response' in body) return body.response;

      const { account, repair } = found;
      const blocked = projectCheck(account, repair.projectId);

      if (blocked) return blocked;

      const active = repair.links.filter((link) => !link.unlinkedAt);

      if (body.data.workLogId) {
        const log = getWorkLogs(account).find(
          (item) =>
            item.id === body.data.workLogId &&
            item.projectId === repair.projectId &&
            item.isAfterService &&
            item.status === 'SAVED',
        );

        if (!log) {
          return invalid(
            'body.workLogId',
            '사후 작업으로 표시한 저장된 작업 내역만 연결할 수 있습니다',
          );
        }

        if (active.some((link) => link.workLogId === log.id)) {
          return invalid('body.workLogId', '이미 연결된 작업 내역입니다');
        }
      } else {
        const record = listMockMaterialRecords(account, repair.projectId).find(
          (item) => item.id === body.data.materialRecordId && item.isAfterService,
        );

        if (!record) {
          return invalid(
            'body.materialRecordId',
            '사후 작업으로 표시한 자재 기록만 연결할 수 있습니다',
          );
        }

        if (active.some((link) => link.materialRecordId === record.id)) {
          return invalid('body.materialRecordId', '이미 연결된 자재 기록입니다');
        }
      }

      repair.links.push({
        id: crypto.randomUUID(),
        workLogId: body.data.workLogId ?? null,
        materialRecordId: body.data.materialRecordId ?? null,
        linkedAt: new Date().toISOString(),
        unlinkedAt: null,
      });

      return HttpResponse.json(toDetail(account, repair));
    }),

    http.delete('/api/v1/repair-requests/:id/links/:linkId', async ({ params }) => {
      await latency();

      const found = find(params);

      if ('response' in found) return found.response;

      const ids = repairLinkParamsSchema.safeParse(params);

      if (!ids.success) return invalid('params.linkId', 'Invalid UUID');

      const { account, repair } = found;
      const blocked = projectCheck(account, repair.projectId);

      if (blocked) return blocked;

      const target = repair.links.find((link) => link.id === ids.data.linkId && !link.unlinkedAt);

      if (!target) return apiError('NOT_FOUND');

      target.unlinkedAt = new Date().toISOString();

      return HttpResponse.json(toDetail(account, repair));
    }),
  ];
};
