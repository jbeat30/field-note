import {
  DEFAULT_WARRANTY_MONTHS,
  computeWarrantyEnd,
  projectParamsSchema,
  resolveWarrantyUpdate,
  todayInSeoul,
  warrantyCertificateCreateSchema,
  warrantyCertificateParamsSchema,
  warrantyCertificateUpdateSchema,
  warrantyDaysLeft,
  warrantyProjectCheck,
  warrantyUpdateSchema,
  type ErrorCode,
  type ProjectDetail,
  type ProjectWarranty,
  type WarrantyChange,
  type WarrantyStartBasis,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import type { MockAccount } from './data';
import { DEMO_WARRANTIES } from './demoSource';
import { listMockDocuments } from './documentHandlers';
import { getCurrentAccount, getProjects } from './state';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

type MockRecord = {
  months: number;
  startBasis: WarrantyStartBasis;
  startOn: string;
  endOn: string;
};

type MockCertificate = {
  id: string;
  projectId: string;
  documentId: string;
  issuer: string | null;
  expiresOn: string;
  createdAt: string;
  removedAt: string | null;
};

type Store = {
  records: Map<string, MockRecord>;
  changes: Map<string, WarrantyChange[]>;
  certificates: MockCertificate[];
};

// 목업 저장소: 회사별 보증 설정·이력·보증서 (새로고침하면 초기화). 실제 서버가 하는 일을 흉내 낸다
const stores = new Map<string, Store>();

export const resetMockWarranties = () => stores.clear();

// 회사 구분 값 (회사가 없는 가입 직후 계정은 계정 단위로 나눔)
const scopeOf = (account: MockAccount) => account.companyId ?? account.loginId;

// 더미 보증 설정은 DB 시드와 같은 원본을 쓴다 (프로젝트 코드로 연결)
const storeOf = (account: MockAccount): Store => {
  const existing = stores.get(scopeOf(account));

  if (existing) return existing;

  const store: Store = { records: new Map(), changes: new Map(), certificates: [] };
  const projects = getProjects(account);

  for (const item of DEMO_WARRANTIES.filter((demo) => demo.companyId === account.companyId)) {
    const project = projects.find((candidate) => candidate.code === item.projectCode);

    if (!project) continue;

    store.records.set(project.id, {
      months: item.months,
      startBasis: item.startBasis,
      startOn: item.startOn,
      endOn: item.endOn,
    });
    store.changes.set(project.id, [
      {
        id: crypto.randomUUID(),
        fromMonths: null,
        toMonths: item.months,
        fromEndOn: null,
        toEndOn: item.endOn,
        startBasis: item.startBasis,
        startOn: item.startOn,
        reason: null,
        changedAt: `${item.startOn}T09:00:00.000Z`,
      },
    ]);
  }

  stores.set(scopeOf(account), store);

  return store;
};

/**
 * @description 상태 전환 검사가 읽는 보증 정보 (설정이 없으면 기본 기간과 null)
 * @param account 현재 계정
 * @param projectId 프로젝트
 * @returns 보증 기간과 종료 예정일
 */
export const getMockWarrantyForTransition = (account: MockAccount, projectId: string) => {
  const record = storeOf(account).records.get(projectId);

  return {
    exists: record !== undefined,
    months: record?.months ?? DEFAULT_WARRANTY_MONTHS,
    endOn: record?.endOn ?? null,
  };
};

/**
 * @description 보증 중이 될 때 설정이 없으면 기본값(실제 완료일 기준)으로 만든다
 * @param account 현재 계정
 * @param project 프로젝트
 */
export const ensureMockDefaultWarranty = (account: MockAccount, project: ProjectDetail) => {
  const store = storeOf(account);

  if (store.records.has(project.id) || !project.actualEnd) return;

  const endOn = computeWarrantyEnd(project.actualEnd, DEFAULT_WARRANTY_MONTHS);

  store.records.set(project.id, {
    months: DEFAULT_WARRANTY_MONTHS,
    startBasis: 'ACTUAL_END',
    startOn: project.actualEnd,
    endOn,
  });
  store.changes.set(project.id, [
    {
      id: crypto.randomUUID(),
      fromMonths: null,
      toMonths: DEFAULT_WARRANTY_MONTHS,
      fromEndOn: null,
      toEndOn: endOn,
      startBasis: 'ACTUAL_END',
      startOn: project.actualEnd,
      reason: null,
      changedAt: new Date().toISOString(),
    },
  ]);
};

const toWarranty = (account: MockAccount, project: ProjectDetail): ProjectWarranty => {
  const store = storeOf(account);
  const record = store.records.get(project.id);
  const today = todayInSeoul(new Date());
  const documents = new Map(listMockDocuments(account).map((document) => [document.id, document]));
  const startOn = record?.startOn ?? project.actualEnd;
  const months = record?.months ?? DEFAULT_WARRANTY_MONTHS;
  const endOn =
    record?.endOn ?? (project.actualEnd ? computeWarrantyEnd(project.actualEnd, months) : null);

  return {
    configured: record !== undefined,
    months,
    startBasis: record?.startBasis ?? 'ACTUAL_END',
    startOn,
    endOn,
    defaultMonths: DEFAULT_WARRANTY_MONTHS,
    daysLeft: endOn ? warrantyDaysLeft(endOn, today) : null,
    certificates: store.certificates
      .filter((item) => item.projectId === project.id && !item.removedAt)
      .flatMap((item) => {
        const document = documents.get(item.documentId);

        return document
          ? [
              {
                id: item.id,
                documentId: item.documentId,
                title: document.title,
                isSensitive: document.isSensitive,
                issuer: item.issuer,
                expiresOn: item.expiresOn,
                daysLeft: warrantyDaysLeft(item.expiresOn, today),
                createdAt: item.createdAt,
              },
            ]
          : [];
      })
      .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.id.localeCompare(b.id)),
    changes: [...(store.changes.get(project.id) ?? [])].sort((a, b) =>
      b.changedAt.localeCompare(a.changedAt),
    ),
  };
};

/**
 * @description 보증 목업 핸들러 (실제 서버와 같은 규칙: 완료·보증 중에서만 설정, 바꿀 때 사유 필수, 이력, 보증서는 같은 프로젝트의 문서)
 * @param helpers 목업 공통 응답·본문 검사
 */
export const createWarrantyHandlers = ({ apiError, parseBody }: Helpers) => {
  const latency = () => delay(300);
  const invalid = (path: string, message: string) =>
    apiError('VALIDATION_ERROR', [{ path, message }]);

  // 로그인과 프로젝트를 확인한다. 실패하면 응답, 성공하면 계정과 프로젝트
  const context = (params: unknown) => {
    const account = getCurrentAccount();

    if (!account) return { response: apiError('UNAUTHORIZED') };

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) return { response: invalid('params.id', 'Invalid UUID') };

    const project = getProjects(account).find((item) => item.id === parsed.data.id);

    return project ? { account, project } : { response: apiError('NOT_FOUND') };
  };

  const allows = (project: ProjectDetail) => {
    const checked = warrantyProjectCheck(project.status);

    return checked.ok ? null : invalid(`body.${checked.path}`, checked.message);
  };

  return [
    http.get('/api/v1/projects/:id/warranty', async ({ params }) => {
      await latency();

      const found = context(params);

      if ('response' in found) return found.response;

      return HttpResponse.json(toWarranty(found.account, found.project));
    }),

    http.put('/api/v1/projects/:id/warranty', async ({ request, params }) => {
      await latency();

      const found = context(params);

      if ('response' in found) return found.response;

      const body = await parseBody(request, warrantyUpdateSchema);

      if ('response' in body) return body.response;

      const { account, project } = found;
      const blocked = allows(project);

      if (blocked) return blocked;

      if (project.status === 'WARRANTY' && body.data.months === 0) {
        return invalid(
          'body.months',
          '보증 중인 프로젝트는 보증 기간을 0개월로 바꿀 수 없습니다. 종료 처리로 조기 종료해 주세요',
        );
      }

      const store = storeOf(account);
      const current = store.records.get(project.id);
      const resolved = resolveWarrantyUpdate({
        input: body.data,
        actualEnd: project.actualEnd,
        hasRecord: current !== undefined,
      });

      if (!resolved.ok) return invalid(`body.${resolved.path}`, resolved.message);

      if (
        current &&
        current.months === body.data.months &&
        current.startBasis === body.data.startBasis &&
        current.startOn === resolved.startOn &&
        current.endOn === resolved.endOn
      ) {
        return invalid('body.months', '바뀐 내용이 없습니다');
      }

      store.records.set(project.id, {
        months: body.data.months,
        startBasis: body.data.startBasis,
        startOn: resolved.startOn,
        endOn: resolved.endOn,
      });
      store.changes.set(project.id, [
        ...(store.changes.get(project.id) ?? []),
        {
          id: crypto.randomUUID(),
          fromMonths: current?.months ?? null,
          toMonths: body.data.months,
          fromEndOn: current?.endOn ?? null,
          toEndOn: resolved.endOn,
          startBasis: body.data.startBasis,
          startOn: resolved.startOn,
          reason: resolved.reason,
          changedAt: new Date().toISOString(),
        },
      ]);

      return HttpResponse.json(toWarranty(account, project));
    }),

    http.post('/api/v1/projects/:id/warranty/certificates', async ({ request, params }) => {
      await latency();

      const found = context(params);

      if ('response' in found) return found.response;

      const body = await parseBody(request, warrantyCertificateCreateSchema);

      if ('response' in body) return body.response;

      const { account, project } = found;
      const blocked = allows(project);

      if (blocked) return blocked;

      // 같은 프로젝트의 문서만 보증서로 등록할 수 있다
      const document = listMockDocuments(account).find(
        (item) => item.id === body.data.documentId && item.projectId === project.id,
      );

      if (!document) return invalid('body.documentId', '선택할 수 없는 문서입니다');

      const store = storeOf(account);

      if (
        store.certificates.some(
          (item) =>
            item.projectId === project.id &&
            item.documentId === body.data.documentId &&
            !item.removedAt,
        )
      ) {
        return invalid('body.documentId', '이미 등록된 보증서입니다');
      }

      store.certificates.push({
        id: crypto.randomUUID(),
        projectId: project.id,
        documentId: body.data.documentId,
        issuer: body.data.issuer?.trim() || null,
        expiresOn: body.data.expiresOn,
        createdAt: new Date().toISOString(),
        removedAt: null,
      });

      return HttpResponse.json(toWarranty(account, project), { status: 201 });
    }),

    http.patch(
      '/api/v1/projects/:id/warranty/certificates/:certificateId',
      async ({ request, params }) => {
        await latency();

        const found = context(params);

        if ('response' in found) return found.response;

        const ids = warrantyCertificateParamsSchema.safeParse(params);

        if (!ids.success) return invalid('params.certificateId', 'Invalid UUID');

        const body = await parseBody(request, warrantyCertificateUpdateSchema);

        if ('response' in body) return body.response;

        const { account, project } = found;
        const blocked = allows(project);

        if (blocked) return blocked;

        const target = storeOf(account).certificates.find(
          (item) =>
            item.id === ids.data.certificateId && item.projectId === project.id && !item.removedAt,
        );

        if (!target) return apiError('NOT_FOUND');

        if (body.data.expiresOn) target.expiresOn = body.data.expiresOn;

        if (body.data.issuer !== undefined) target.issuer = body.data.issuer?.trim() || null;

        return HttpResponse.json(toWarranty(account, project));
      },
    ),

    http.delete('/api/v1/projects/:id/warranty/certificates/:certificateId', async ({ params }) => {
      await latency();

      const found = context(params);

      if ('response' in found) return found.response;

      const ids = warrantyCertificateParamsSchema.safeParse(params);

      if (!ids.success) return invalid('params.certificateId', 'Invalid UUID');

      const { account, project } = found;
      const blocked = allows(project);

      if (blocked) return blocked;

      const target = storeOf(account).certificates.find(
        (item) =>
          item.id === ids.data.certificateId && item.projectId === project.id && !item.removedAt,
      );

      if (!target) return apiError('NOT_FOUND');

      target.removedAt = new Date().toISOString();

      return HttpResponse.json(toWarranty(account, project));
    }),
  ];
};
