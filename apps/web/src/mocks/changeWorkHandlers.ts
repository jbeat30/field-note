import {
  changeWorkCreateSchema,
  changeWorkDocumentParamsSchema,
  changeWorkLinkSchema,
  changeWorkListQuerySchema,
  changeWorkParamsSchema,
  changeWorkProjectCheck,
  changeWorkTransitionSchema,
  changeWorkUnlinkQuerySchema,
  changeWorkUpdateSchema,
  projectParamsSchema,
  todayInSeoul,
  validateChangeWorkTransition,
  type ChangeUsage,
  type ChangeWork,
  type ChangeWorkDetail,
  type ChangeWorkStatus,
  type ChangeWorkStatusChange,
  type ErrorCode,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import type { MockAccount } from './data';
import { DEMO_CHANGE_WORKS } from './demoSource';
import { listMockDocuments } from './documentHandlers';
import { listMockMaterialRecords } from './materialHandlers';
import { getCurrentAccount, getProjects, getWorkLogs } from './state';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

type MockLink = { documentId: string; linkedAt: string; unlinkedAt: string | null };

type MockChangeWork = Omit<ChangeWork, 'documentCount'> & {
  scope: string;
  history: ChangeWorkStatusChange[];
  links: MockLink[];
};

// 목업 저장소: 회사별 변경·추가 작업 (새로고침하면 초기화). 실제 서버가 하는 일을 흉내 낸다
const works = new Map<string, MockChangeWork>();
const seeded = new Set<string>();

export const resetMockChangeWorks = () => {
  works.clear();
  seeded.clear();
};

// 회사 구분 값 (회사가 없는 가입 직후 계정은 계정 단위로 나눔)
const scopeOf = (account: MockAccount) => account.companyId ?? account.loginId;

// 더미 변경·추가 작업은 DB 시드와 같은 원본을 쓴다 (프로젝트 코드로 연결)
const seed = (account: MockAccount) => {
  if (seeded.has(scopeOf(account))) return;

  seeded.add(scopeOf(account));

  const projects = getProjects(account);

  for (const item of DEMO_CHANGE_WORKS.filter((demo) => demo.companyId === account.companyId)) {
    const project = projects.find((candidate) => candidate.code === item.projectCode);

    if (!project) continue;

    works.set(item.id, {
      id: item.id,
      scope: scopeOf(account),
      projectId: project.id,
      seq: item.seq,
      requestedOn: item.requestedOn,
      requester: item.requester,
      content: item.content,
      status: item.status,
      statusChangedOn: item.statusChangedOn,
      createdAt: `${item.requestedOn}T09:00:00.000Z`,
      updatedAt: `${item.statusChangedOn}T09:00:00.000Z`,
      history: (item.history ?? []).map((change, index) => ({
        id: `${item.id.slice(0, -2)}${String(index + 10).padStart(2, '0')}`,
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

  return [...works.values()].filter((work) => work.scope === scopeOf(account));
};

// 프로젝트 요약·전환 안내 목업이 쓰는 변경·추가 작업 조회 (번호 오름차순)
export const listMockChangeWorks = (account: MockAccount, projectId: string) =>
  mine(account)
    .filter((work) => work.projectId === projectId)
    .sort((a, b) => a.seq - b.seq)
    .map((work) => toSummary(account, work));

const liveLinks = (account: MockAccount, work: MockChangeWork) => {
  const documents = new Map(listMockDocuments(account).map((document) => [document.id, document]));

  return work.links.flatMap((link) => {
    const document = documents.get(link.documentId);

    return !link.unlinkedAt && document ? [{ link, document }] : [];
  });
};

const toSummary = (account: MockAccount, work: MockChangeWork): ChangeWork => ({
  id: work.id,
  projectId: work.projectId,
  seq: work.seq,
  requestedOn: work.requestedOn,
  requester: work.requester,
  content: work.content,
  status: work.status,
  statusChangedOn: work.statusChangedOn,
  documentCount: liveLinks(account, work).length,
  createdAt: work.createdAt,
  updatedAt: work.updatedAt,
});

const toDetail = (account: MockAccount, work: MockChangeWork): ChangeWorkDetail => ({
  ...toSummary(account, work),
  history: [...work.history].sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
  documents: liveLinks(account, work)
    .sort((a, b) => b.link.linkedAt.localeCompare(a.link.linkedAt))
    .map(({ link, document }) => ({
      documentId: document.id,
      title: document.title,
      category: document.category,
      isSensitive: document.isSensitive,
      linkedAt: link.linkedAt,
    })),
});

/**
 * @description 변경·추가 작업 목업 핸들러 (실제 서버와 같은 규칙: 상태별 기록 제한, 협의 중일 때만 수정, 철회 사유 필수, 이력·증빙 연결)
 * @param helpers 목업 공통 응답·본문 검사
 */
export const createChangeWorkHandlers = ({ apiError, parseBody }: Helpers) => {
  const latency = () => delay(300);
  const invalid = (path: string, message: string) =>
    apiError('VALIDATION_ERROR', [{ path, message }]);
  const queryError = (issues: { path: PropertyKey[]; message: string }[]) =>
    apiError(
      'VALIDATION_ERROR',
      issues.map((issue) => ({ path: ['query', ...issue.path].join('.'), message: issue.message })),
    );

  // 프로젝트 상태에 따라 막히는지 (§10.3)
  const projectCheck = (
    account: MockAccount,
    projectId: string,
    confirmed: boolean | undefined,
    confirmPath: string,
  ) => {
    const project = getProjects(account).find((item) => item.id === projectId);

    if (!project) return apiError('NOT_FOUND');

    const checked = changeWorkProjectCheck(project.status, confirmed === true);

    return checked.ok
      ? null
      : invalid(checked.path === 'confirmCompleted' ? confirmPath : checked.path, checked.message);
  };

  return [
    http.get('/api/v1/projects/:id/change-works', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = projectParamsSchema.safeParse(params);

      if (!parsed.success) return invalid('params.id', 'Invalid UUID');

      if (!getProjects(account).some((item) => item.id === parsed.data.id))
        return apiError('NOT_FOUND');

      const query = changeWorkListQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      if (!query.success) return queryError(query.error.issues);

      return HttpResponse.json({
        items: mine(account)
          .filter(
            (work) =>
              work.projectId === parsed.data.id &&
              (!query.data.status || work.status === query.data.status),
          )
          .sort((a, b) => b.seq - a.seq)
          .map((work) => toSummary(account, work)),
      });
    }),

    http.post('/api/v1/projects/:id/change-works', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = projectParamsSchema.safeParse(params);

      if (!parsed.success) return invalid('params.id', 'Invalid UUID');

      const body = await parseBody(request, changeWorkCreateSchema);

      if ('response' in body) return body.response;

      const blocked = projectCheck(
        account,
        parsed.data.id,
        body.data.confirmCompleted,
        'body.confirmCompleted',
      );

      if (blocked) return blocked;

      const today = todayInSeoul(new Date());
      const requestedOn = body.data.requestedOn ?? today;

      if (requestedOn > today)
        return invalid('body.requestedOn', '요청일은 오늘 이후로 정할 수 없습니다');

      const now = new Date().toISOString();
      const seq =
        Math.max(
          0,
          ...mine(account)
            .filter((w) => w.projectId === parsed.data.id)
            .map((w) => w.seq),
        ) + 1;
      const work: MockChangeWork = {
        id: crypto.randomUUID(),
        scope: scopeOf(account),
        projectId: parsed.data.id,
        seq,
        requestedOn,
        requester: body.data.requester,
        content: body.data.content,
        status: 'NEGOTIATING',
        statusChangedOn: requestedOn,
        createdAt: now,
        updatedAt: now,
        history: [],
        links: [],
      };

      works.set(work.id, work);

      return HttpResponse.json(toDetail(account, work), { status: 201 });
    }),

    http.get('/api/v1/projects/:id/change-usage', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = projectParamsSchema.safeParse(params);

      if (!parsed.success) return invalid('params.id', 'Invalid UUID');

      if (!getProjects(account).some((item) => item.id === parsed.data.id))
        return apiError('NOT_FOUND');

      const logs = getWorkLogs(account).filter(
        (log) => log.projectId === parsed.data.id && log.status === 'SAVED' && log.isChange,
      );
      const used = new Map<string, ChangeUsage['materials'][number]>();

      for (const record of listMockMaterialRecords(account, parsed.data.id)) {
        if (record.isChange && record.kind === 'USED') {
          const row = used.get(record.materialId);

          used.set(record.materialId, {
            materialId: record.materialId,
            name: record.materialName,
            spec: record.spec,
            unit: record.unit,
            quantity: (row?.quantity ?? 0) + record.quantity,
          });
        }
      }

      const usage: ChangeUsage = {
        workLogCount: logs.length,
        minutes: logs.flatMap((log) => log.entries).reduce((sum, entry) => sum + entry.minutes, 0),
        materials: [...used.values()].sort(
          (a, b) => a.name.localeCompare(b.name, 'ko') || a.materialId.localeCompare(b.materialId),
        ),
      };

      return HttpResponse.json(usage);
    }),

    http.get('/api/v1/change-works/:id', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = changeWorkParamsSchema.safeParse(params);

      if (!parsed.success) return invalid('params.id', 'Invalid UUID');

      const work = mine(account).find((item) => item.id === parsed.data.id);

      return work ? HttpResponse.json(toDetail(account, work)) : apiError('NOT_FOUND');
    }),

    http.patch('/api/v1/change-works/:id', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = changeWorkParamsSchema.safeParse(params);

      if (!parsed.success) return invalid('params.id', 'Invalid UUID');

      const body = await parseBody(request, changeWorkUpdateSchema);

      if ('response' in body) return body.response;

      const work = mine(account).find((item) => item.id === parsed.data.id);

      if (!work) return apiError('NOT_FOUND');

      const blocked = projectCheck(
        account,
        work.projectId,
        body.data.confirmCompleted,
        'body.confirmCompleted',
      );

      if (blocked) return blocked;

      if (work.status !== 'NEGOTIATING') {
        return invalid(
          'status',
          '협의 중인 기록만 고칠 수 있습니다. 합의·철회된 기록은 그대로 보존됩니다',
        );
      }

      if (body.data.requestedOn !== undefined) {
        const first = [...work.history].sort((a, b) =>
          a.effectiveOn.localeCompare(b.effectiveOn),
        )[0];

        if (body.data.requestedOn > todayInSeoul(new Date()))
          return invalid('body.requestedOn', '요청일은 오늘 이후로 정할 수 없습니다');

        if (first && body.data.requestedOn > first.effectiveOn) {
          return invalid(
            'body.requestedOn',
            `요청일은 첫 상태 변경일(${first.effectiveOn})보다 늦을 수 없습니다`,
          );
        }

        work.requestedOn = body.data.requestedOn;

        if (!first) work.statusChangedOn = body.data.requestedOn;
      }

      if (body.data.requester !== undefined) work.requester = body.data.requester;
      if (body.data.content !== undefined) work.content = body.data.content;

      work.updatedAt = new Date().toISOString();

      return HttpResponse.json(toDetail(account, work));
    }),

    http.post('/api/v1/change-works/:id/status', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = changeWorkParamsSchema.safeParse(params);

      if (!parsed.success) return invalid('params.id', 'Invalid UUID');

      const body = await parseBody(request, changeWorkTransitionSchema);

      if ('response' in body) return body.response;

      const work = mine(account).find((item) => item.id === parsed.data.id);

      if (!work) return apiError('NOT_FOUND');

      const blocked = projectCheck(
        account,
        work.projectId,
        body.data.confirmCompleted,
        'body.confirmCompleted',
      );

      if (blocked) return blocked;

      const today = todayInSeoul(new Date());
      const effectiveOn = body.data.effectiveOn ?? today;
      const note = body.data.note ?? null;
      const checked = validateChangeWorkTransition({
        from: work.status,
        to: body.data.toStatus,
        effectiveOn,
        note,
        requestedOn: work.requestedOn,
        today,
      });

      if (!checked.ok) return invalid(`body.${checked.path}`, checked.message);

      const now = new Date().toISOString();

      work.history.push({
        id: crypto.randomUUID(),
        fromStatus: work.status,
        toStatus: body.data.toStatus as ChangeWorkStatus,
        effectiveOn,
        note,
        changedAt: now,
      });
      work.status = body.data.toStatus;
      work.statusChangedOn = effectiveOn;
      work.updatedAt = now;

      return HttpResponse.json(toDetail(account, work));
    }),

    http.post('/api/v1/change-works/:id/documents', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = changeWorkParamsSchema.safeParse(params);

      if (!parsed.success) return invalid('params.id', 'Invalid UUID');

      const body = await parseBody(request, changeWorkLinkSchema);

      if ('response' in body) return body.response;

      const work = mine(account).find((item) => item.id === parsed.data.id);

      if (!work) return apiError('NOT_FOUND');

      const blocked = projectCheck(
        account,
        work.projectId,
        body.data.confirmCompleted,
        'body.confirmCompleted',
      );

      if (blocked) return blocked;

      // 같은 프로젝트의 삭제되지 않은 문서만 연결할 수 있다
      if (
        !listMockDocuments(account).some(
          (document) =>
            document.id === body.data.documentId && document.projectId === work.projectId,
        )
      ) {
        return invalid('body.documentId', '선택할 수 없는 문서입니다');
      }

      if (work.links.some((link) => link.documentId === body.data.documentId && !link.unlinkedAt)) {
        return invalid('body.documentId', '이미 연결된 문서입니다');
      }

      work.links.push({
        documentId: body.data.documentId,
        linkedAt: new Date().toISOString(),
        unlinkedAt: null,
      });

      return HttpResponse.json(toDetail(account, work), { status: 201 });
    }),

    http.delete('/api/v1/change-works/:id/documents/:documentId', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = changeWorkDocumentParamsSchema.safeParse(params);

      if (!parsed.success) return invalid('params', 'Invalid UUID');

      const query = changeWorkUnlinkQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      if (!query.success) return queryError(query.error.issues);

      const work = mine(account).find((item) => item.id === parsed.data.id);

      if (!work) return apiError('NOT_FOUND');

      const blocked = projectCheck(
        account,
        work.projectId,
        query.data.confirmCompleted === 'true',
        'query.confirmCompleted',
      );

      if (blocked) return blocked;

      const link = work.links.find(
        (item) => item.documentId === parsed.data.documentId && !item.unlinkedAt,
      );

      if (!link) return apiError('NOT_FOUND');

      link.unlinkedAt = new Date().toISOString();

      return HttpResponse.json(toDetail(account, work));
    }),
  ];
};
