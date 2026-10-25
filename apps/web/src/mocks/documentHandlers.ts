import {
  DOCUMENT_PINNED_MAX,
  documentAccessQuerySchema,
  documentCreateSchema,
  documentListQuerySchema,
  documentParamsSchema,
  documentUpdateSchema,
  documentVersionCreateSchema,
  documentVersionParamsSchema,
  projectFileParamsSchema,
  resolveSensitive,
  todayInSeoul,
  type AuditAction,
  type Document,
  type DocumentAccessLog,
  type DocumentDetail,
  type DocumentVersion,
  type ErrorCode,
  VALIDATION_MESSAGES,
} from '@field-note/shared';
import { http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import { addMockAudit } from './auditHandlers';
import type { MockAccount } from './data';
import {
  addMockReadyFile,
  confirmMockFile,
  getMockFile,
  stagedExpiredDetail,
} from './photoHandlers';
import { getCurrentAccount, getOptions, getProjects } from './state';
import { mockDelay } from './latency';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

type MockVersion = {
  versionNo: number;
  fileId: string;
  revisionDate: string;
  reason: string | null;
  uploadedBy: string;
  createdAt: string;
};

type MockDocument = Omit<Document, 'versionCount' | 'latest' | 'categoryName'> & {
  scope: string;
  versions: MockVersion[];
  deletedAt?: string;
};

type MockLog = DocumentAccessLog & { scope: string; documentId: string };

// 목업 저장소: 회사별 문서·열람 기록 (새로고침하면 초기화), 실제 서버 동작을 모사
const documents = new Map<string, MockDocument>();
const logs: MockLog[] = [];
const seeded = new Set<string>();

export const resetMockDocuments = () => {
  documents.clear();
  logs.length = 0;
  seeded.clear();
};

// 목업의 작성자 (계약 스키마가 UUID를 요구)
const MOCK_USER_ID = '0198d000-0000-7000-8000-000000000001';

// 회사 구분 값 (회사가 없는 가입 직후 계정은 계정 단위로 나눔)
const scopeOf = (account: MockAccount) => account.companyId ?? account.loginId;

// 문서 종류는 계정의 선택 목록 항목 (프리셋 이름으로 찾음)
const categoryByName = (account: MockAccount, name: string) =>
  getOptions(account).find((item) => item.kind === 'DOCUMENT_CATEGORY' && item.name === name)!;

const addDocument = (
  account: MockAccount,
  projectId: string,
  input: {
    // 정해 두면 그 ID를 씀 (더미 문서의 고정 ID)
    id?: string;
    title: string;
    categoryId: string;
    isSensitive?: boolean;
    isPinned?: boolean;
    includeInSummary?: boolean;
    versions: { name: string; date: string; reason?: string; fileId?: string }[];
  },
) => {
  const id = input.id ?? crypto.randomUUID();
  const versions: MockVersion[] = input.versions.map((version, index) => ({
    versionNo: index + 1,
    fileId:
      version.fileId ??
      addMockReadyFile(scopeOf(account), projectId, {
        name: version.name,
        contentType: 'application/pdf',
        size: 300_000 + index * 50_000,
        createdAt: `${version.date}T03:00:00.000Z`,
      }),
    revisionDate: version.date,
    reason: version.reason ?? null,
    uploadedBy: MOCK_USER_ID,
    createdAt: `${version.date}T03:00:00.000Z`,
  }));
  const at = `${input.versions.at(-1)!.date}T03:00:00.000Z`;

  documents.set(id, {
    id,
    scope: scopeOf(account),
    projectId,
    categoryId: input.categoryId,
    title: input.title,
    isSensitive: resolveSensitive(
      getOptions(account).find((item) => item.id === input.categoryId)?.sensitiveDefault ?? false,
      input.isSensitive,
    ),
    isPinned: input.isPinned ?? false,
    includeInSummary: input.includeInSummary ?? false,
    createdBy: MOCK_USER_ID,
    createdAt: at,
    updatedAt: at,
    versions,
  });

  return id;
};

// 더미 문서는 프로젝트와 순서로 정한 고정된 ID를 써서 화면·스토리가 문서 주소를 알 수 있게 함
export const seedDocumentId = (projectId: string, index: number) =>
  `0198d0dc-0000-7000-8000-${projectId.replaceAll('-', '').slice(-10)}${String(index).padStart(2, '0')}`;

// 더미 문서: 개정이 쌓인 도면(고정), 민감 계약서, 일반 시방서 (화면 확인용)
const seed = (account: MockAccount) => {
  if (seeded.has(scopeOf(account))) return;

  seeded.add(scopeOf(account));

  for (const project of getProjects(account)) {
    addDocument(account, project.id, {
      id: seedDocumentId(project.id, 0),
      title: '1층 시공도',
      categoryId: categoryByName(account, '도면·작업지시서').id,
      isPinned: true,
      versions: [
        { name: '1층시공도_rev1.pdf', date: '2026-09-20', reason: '최초' },
        { name: '1층시공도_rev2.pdf', date: '2026-10-02', reason: '배관 위치 변경' },
      ],
    });
    addDocument(account, project.id, {
      id: seedDocumentId(project.id, 1),
      title: '도급 계약서',
      categoryId: categoryByName(account, '계약·공문').id,
      versions: [{ name: '도급계약서.pdf', date: '2026-09-01' }],
    });
    addDocument(account, project.id, {
      id: seedDocumentId(project.id, 2),
      title: '외장 판금 시방서',
      categoryId: categoryByName(account, '도면·작업지시서').id,
      versions: [{ name: '시방서.pdf', date: '2026-09-10' }],
    });
  }
};

const live = (account: MockAccount, projectId?: string) => {
  seed(account);

  return [...documents.values()].filter(
    (document) =>
      document.scope === scopeOf(account) &&
      !document.deletedAt &&
      (!projectId || document.projectId === projectId),
  );
};

// 고를 수 있는 문서 종류인지 확인 (없거나 숨긴 종류는 거부), 문제가 없으면 undefined
const categoryProblem = (account: MockAccount, categoryId: string) => {
  const option = getOptions(account).find(
    (item) => item.id === categoryId && item.kind === 'DOCUMENT_CATEGORY',
  );

  if (!option) return VALIDATION_MESSAGES.OPTION_NOT_SELECTABLE('문서 종류');

  return option.isActive ? undefined : VALIDATION_MESSAGES.OPTION_HIDDEN('문서 종류');
};

// 종류를 정하지 않고 만드는 문서(변경 작업 증빙)의 종류: 고를 수 있는 종류 중 민감 기본값이 켜진 첫 항목, 없으면 첫 항목
const defaultCategoryId = (account: MockAccount) => {
  const active = getOptions(account).filter(
    (item) => item.kind === 'DOCUMENT_CATEGORY' && item.isActive,
  );

  return (active.find((item) => item.sensitiveDefault) ?? active[0])!.id;
};

// 변경·추가 작업 증빙 올리기가 쓰는 문서 만들기: 올린 파일로 문서를 만듦 (같은 파일로 이미 만들었으면 그 문서)
export const createMockEvidenceDocument = (
  account: MockAccount,
  projectId: string,
  input: { fileId: string; title: string },
): { id: string } | { error: { path: string; message: string } } => {
  const existing = [...documents.values()].find((document) =>
    document.versions.some((version) => version.fileId === input.fileId),
  );

  if (existing && !existing.deletedAt && existing.projectId === projectId)
    return { id: existing.id };

  const file = getMockFile(input.fileId);

  if (
    !file ||
    file.companyId !== scopeOf(account) ||
    file.projectId !== projectId ||
    file.purpose !== 'DOCUMENT' ||
    existing
  ) {
    return {
      error: { path: 'body.fileId', message: VALIDATION_MESSAGES.DOCUMENT_FILE_NOT_IN_PROJECT },
    };
  }

  if (file.status === 'REJECTED') {
    return {
      error: { path: 'body.fileId', message: VALIDATION_MESSAGES.DOCUMENT_FILE_REJECTED },
    };
  }

  return {
    id: addDocument(account, projectId, {
      title: input.title,
      categoryId: defaultCategoryId(account),
      versions: [{ name: file.name, date: todayInSeoul(new Date()), fileId: input.fileId }],
    }),
  };
};

// 검색 목업이 쓰는 문서 조회 (지운 문서 제외)
export const listMockDocuments = (account: MockAccount) =>
  live(account).map((document) => toDocument(account, document));

const toVersion = (version: MockVersion): DocumentVersion => {
  const file = getMockFile(version.fileId)!;

  return {
    versionNo: version.versionNo,
    fileId: version.fileId,
    fileName: file.name,
    contentType: file.contentType,
    size: file.size,
    fileStatus: file.status,
    rejectReason: file.rejectReason,
    revisionDate: version.revisionDate,
    reason: version.reason,
    uploadedBy: version.uploadedBy,
    createdAt: version.createdAt,
  };
};

const toDocument = (account: MockAccount, document: MockDocument): Document => {
  const versions = [...document.versions].sort((a, b) => b.versionNo - a.versionNo);

  return {
    id: document.id,
    projectId: document.projectId,
    categoryId: document.categoryId,
    categoryName:
      getOptions(account).find((item) => item.id === document.categoryId)?.name ?? '(알 수 없음)',
    title: document.title,
    isSensitive: document.isSensitive,
    isPinned: document.isPinned,
    includeInSummary: document.includeInSummary,
    createdBy: document.createdBy,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    versionCount: versions.length,
    latest: toVersion(versions[0]!),
  };
};

const toDetail = (account: MockAccount, document: MockDocument): DocumentDetail => ({
  ...toDocument(account, document),
  versions: [...document.versions].sort((a, b) => b.versionNo - a.versionNo).map(toVersion),
});

/**
 * @description 작업자료 문서함 API 목업 핸들러 (실제 서버와 같은 규칙: 새 버전은 이전본 보존, 같은 파일 재등록은 기존 문서, 민감 자료 열람은 기록, 고정은 10개까지)
 * @param helpers 공통 오류 응답과 본문 검증 함수 (handlers.ts와 같은 규칙)
 * @returns msw 핸들러 목록
 */
export const createDocumentHandlers = ({ apiError, parseBody }: Helpers) => {
  const latency = () => mockDelay(300);
  const hasProject = (account: MockAccount, projectId: string) =>
    getProjects(account).some((project) => project.id === projectId);

  // 버전으로 쓸 파일 검사: 같은 프로젝트의 문서용 파일이고 거부되지 않았으며 다른 문서에 쓰이지 않았는지
  const checkFile = (account: MockAccount, fileId: string, projectId: string) => {
    const file = getMockFile(fileId);

    if (
      !file ||
      file.companyId !== scopeOf(account) ||
      file.projectId !== projectId ||
      file.purpose !== 'DOCUMENT'
    ) {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.fileId', message: VALIDATION_MESSAGES.DOCUMENT_FILE_NOT_IN_PROJECT },
      ]);
    }

    if (!confirmMockFile(file)) return apiError('STAGED_FILE_EXPIRED', stagedExpiredDetail);

    if (file.status === 'REJECTED') {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.fileId', message: VALIDATION_MESSAGES.DOCUMENT_FILE_REJECTED },
      ]);
    }

    return null;
  };

  const owner = (fileId: string) =>
    [...documents.values()].find((document) =>
      document.versions.some((version) => version.fileId === fileId),
    );

  return [
    http.post('/api/v1/projects/:projectId/documents', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = projectFileParamsSchema.safeParse(params);
      const body = await parseBody(request, documentCreateSchema);

      if ('response' in body) return body.response;

      if (!path.success || !hasProject(account, path.data.projectId)) return apiError('NOT_FOUND');

      // 같은 파일로 이미 만든 문서가 있으면 그 문서 (재시도에 안전)
      const existing = owner(body.data.fileId);

      if (existing && !existing.deletedAt && existing.projectId === path.data.projectId) {
        return HttpResponse.json(toDetail(account, existing), { status: 201 });
      }

      const problem = checkFile(account, body.data.fileId, path.data.projectId);

      if (problem) return problem;

      if (existing) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.fileId', message: VALIDATION_MESSAGES.DOCUMENT_FILE_ALREADY_USED },
        ]);
      }

      const categoryMessage = categoryProblem(account, body.data.categoryId);

      if (categoryMessage) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.categoryId', message: categoryMessage },
        ]);
      }

      const file = getMockFile(body.data.fileId)!;
      const id = addDocument(account, path.data.projectId, {
        title: body.data.title,
        categoryId: body.data.categoryId,
        isSensitive: body.data.isSensitive,
        versions: [
          {
            name: file.name,
            date: body.data.revisionDate ?? todayInSeoul(new Date()),
            reason: body.data.reason,
            fileId: body.data.fileId,
          },
        ],
      });

      return HttpResponse.json(toDetail(account, documents.get(id)!), { status: 201 });
    }),

    http.get('/api/v1/projects/:projectId/documents', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = projectFileParamsSchema.safeParse(params);
      const query = documentListQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      if (!query.success) return apiError('VALIDATION_ERROR');

      if (!path.success || !hasProject(account, path.data.projectId)) return apiError('NOT_FOUND');

      const { categoryId, q, pinned } = query.data;
      const keyword = q?.toLowerCase();

      return HttpResponse.json({
        items: live(account, path.data.projectId)
          .filter(
            (document) =>
              (!categoryId || document.categoryId === categoryId) &&
              (pinned === undefined || document.isPinned === pinned) &&
              (!keyword || document.title.toLowerCase().includes(keyword)),
          )
          .sort(
            (a, b) =>
              Number(b.isPinned) - Number(a.isPinned) ||
              b.updatedAt.localeCompare(a.updatedAt) ||
              b.id.localeCompare(a.id),
          )
          .map((item) => toDocument(account, item)),
      });
    }),

    http.get('/api/v1/documents/:id', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = documentParamsSchema.safeParse(params);
      const document = parsed.success
        ? live(account).find((item) => item.id === parsed.data.id)
        : undefined;

      return document ? HttpResponse.json(toDetail(account, document)) : apiError('NOT_FOUND');
    }),

    http.patch('/api/v1/documents/:id', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = documentParamsSchema.safeParse(params);
      const body = await parseBody(request, documentUpdateSchema);

      if ('response' in body) return body.response;

      const document = parsed.success
        ? live(account).find((item) => item.id === parsed.data.id)
        : undefined;

      if (!document) return apiError('NOT_FOUND');

      if (
        body.data.isPinned &&
        !document.isPinned &&
        live(account, document.projectId).filter((item) => item.isPinned).length >=
          DOCUMENT_PINNED_MAX
      ) {
        return apiError('VALIDATION_ERROR', [
          {
            path: 'body.isPinned',
            message: VALIDATION_MESSAGES.DOCUMENT_PINNED_LIMIT(DOCUMENT_PINNED_MAX),
          },
        ]);
      }

      if (body.data.categoryId && body.data.categoryId !== document.categoryId) {
        const categoryMessage = categoryProblem(account, body.data.categoryId);

        if (categoryMessage) {
          return apiError('VALIDATION_ERROR', [
            { path: 'body.categoryId', message: categoryMessage },
          ]);
        }
      }

      Object.assign(
        document,
        Object.fromEntries(Object.entries(body.data).filter(([, value]) => value !== undefined)),
      );

      return HttpResponse.json(toDetail(account, document));
    }),

    http.delete('/api/v1/documents/:id', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = documentParamsSchema.safeParse(params);
      const document = parsed.success
        ? live(account).find((item) => item.id === parsed.data.id)
        : undefined;

      if (!document) return apiError('NOT_FOUND');

      document.deletedAt = new Date().toISOString();
      document.isPinned = false;

      return HttpResponse.json({ success: true });
    }),

    http.post('/api/v1/documents/:id/versions', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = documentParamsSchema.safeParse(params);
      const body = await parseBody(request, documentVersionCreateSchema);

      if ('response' in body) return body.response;

      const document = parsed.success
        ? live(account).find((item) => item.id === parsed.data.id)
        : undefined;

      if (!document) return apiError('NOT_FOUND');

      const problem = checkFile(account, body.data.fileId, document.projectId);

      if (problem) return problem;

      const used = owner(body.data.fileId);

      // 이미 이 문서의 버전이면 그대로 (재시도에 안전), 다른 문서에 쓴 파일이면 거부
      if (used && used.id !== document.id) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.fileId', message: VALIDATION_MESSAGES.DOCUMENT_FILE_ALREADY_USED },
        ]);
      }

      if (!used) {
        document.versions.push({
          versionNo: Math.max(...document.versions.map((version) => version.versionNo)) + 1,
          fileId: body.data.fileId,
          revisionDate: body.data.revisionDate ?? todayInSeoul(new Date()),
          reason: body.data.reason ?? null,
          uploadedBy: MOCK_USER_ID,
          createdAt: new Date().toISOString(),
        });
        document.updatedAt = new Date().toISOString();
      }

      return HttpResponse.json(toDetail(account, document), { status: 201 });
    }),

    http.get('/api/v1/documents/:id/versions/:versionNo/url', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = documentVersionParamsSchema.safeParse(params);
      const query = documentAccessQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      if (!query.success) return apiError('VALIDATION_ERROR');

      const document = parsed.success
        ? live(account).find((item) => item.id === parsed.data.id)
        : undefined;
      const version = document?.versions.find((item) => item.versionNo === parsed.data!.versionNo);

      if (!document || !version) return apiError('NOT_FOUND');

      if (getMockFile(version.fileId)!.status !== 'READY') {
        return apiError('VALIDATION_ERROR', [
          { path: 'params.versionNo', message: VALIDATION_MESSAGES.FILE_NOT_READY_TO_OPEN },
        ]);
      }

      // 민감 자료는 기록을 먼저 남긴 뒤에만 주소를 줌
      if (document.isSensitive) {
        addMockAudit(account, {
          action: query.data.mode === 'download' ? 'DOCUMENT_DOWNLOADED' : 'DOCUMENT_VIEWED',
          targetType: 'DOCUMENT',
          targetId: document.id,
          targetName: document.title,
          summary: `${document.title} · v${version.versionNo}`,
        });
        logs.push({
          id: crypto.randomUUID(),
          scope: scopeOf(account),
          documentId: document.id,
          action: (query.data.mode === 'download'
            ? 'DOCUMENT_DOWNLOADED'
            : 'DOCUMENT_VIEWED') satisfies AuditAction,
          actorId: MOCK_USER_ID,
          actorName: account.displayName,
          versionNo: version.versionNo,
          createdAt: new Date().toISOString(),
        });
      }

      return HttpResponse.json({
        url: `${location.origin}/mock-storage/document/${document.id}-v${version.versionNo}.pdf`,
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        isLogged: document.isSensitive,
      });
    }),

    http.get('/api/v1/documents/:id/access-logs', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = documentParamsSchema.safeParse(params);
      const document = parsed.success
        ? live(account).find((item) => item.id === parsed.data.id)
        : undefined;

      if (!document) return apiError('NOT_FOUND');

      return HttpResponse.json({
        items: logs
          .filter((log) => log.documentId === document.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((log) => ({
            id: log.id,
            action: log.action,
            actorId: log.actorId,
            actorName: log.actorName,
            versionNo: log.versionNo,
            createdAt: log.createdAt,
          })),
      });
    }),
  ];
};
