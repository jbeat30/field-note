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
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import type { MockAccount } from './data';
import { addMockReadyFile, getMockFile } from './photoHandlers';
import { getCurrentAccount, getProjects } from './state';

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

type MockDocument = Omit<Document, 'versionCount' | 'latest'> & {
  scope: string;
  versions: MockVersion[];
  deletedAt?: string;
};

type MockLog = DocumentAccessLog & { scope: string; documentId: string };

// 목업 저장소: 회사별 문서·열람 기록 (새로고침하면 초기화). 실제 서버가 하는 일을 흉내 낸다
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

const addDocument = (
  account: MockAccount,
  projectId: string,
  input: {
    // 정해 두면 그 ID를 씀 (더미 문서의 고정 ID)
    id?: string;
    title: string;
    category: Document['category'];
    isSensitive?: boolean;
    isPinned?: boolean;
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
    category: input.category,
    title: input.title,
    isSensitive: resolveSensitive(input.category, input.isSensitive),
    isPinned: input.isPinned ?? false,
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
      category: 'DRAWING',
      isPinned: true,
      versions: [
        { name: '1층시공도_rev1.pdf', date: '2026-09-20', reason: '최초' },
        { name: '1층시공도_rev2.pdf', date: '2026-10-02', reason: '배관 위치 변경' },
      ],
    });
    addDocument(account, project.id, {
      id: seedDocumentId(project.id, 1),
      title: '도급 계약서',
      category: 'CONTRACT',
      versions: [{ name: '도급계약서.pdf', date: '2026-09-01' }],
    });
    addDocument(account, project.id, {
      id: seedDocumentId(project.id, 2),
      title: '외장 판금 시방서',
      category: 'SPEC',
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

// 검색 목업이 쓰는 문서 조회 (지운 문서 제외)
export const listMockDocuments = (account: MockAccount) =>
  live(account).map((document) => toDocument(document));

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

const toDocument = (document: MockDocument): Document => {
  const versions = [...document.versions].sort((a, b) => b.versionNo - a.versionNo);

  return {
    id: document.id,
    projectId: document.projectId,
    category: document.category,
    title: document.title,
    isSensitive: document.isSensitive,
    isPinned: document.isPinned,
    createdBy: document.createdBy,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    versionCount: versions.length,
    latest: toVersion(versions[0]!),
  };
};

const toDetail = (document: MockDocument): DocumentDetail => ({
  ...toDocument(document),
  versions: [...document.versions].sort((a, b) => b.versionNo - a.versionNo).map(toVersion),
});

/**
 * @description 작업자료 문서함 API 목업 핸들러 (실제 서버와 같은 규칙: 새 버전은 이전본 보존, 같은 파일 재등록은 기존 문서, 민감 자료 열람은 기록, 고정은 10개까지)
 * @param helpers 공통 오류 응답과 본문 검증 함수 (handlers.ts와 같은 규칙)
 * @returns msw 핸들러 목록
 */
export const createDocumentHandlers = ({ apiError, parseBody }: Helpers) => {
  const latency = () => delay(300);
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
        { path: 'body.fileId', message: '이 프로젝트에 올린 문서 파일이 아닙니다' },
      ]);
    }

    if (file.status === 'REJECTED') {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.fileId', message: '검사에서 거부된 파일은 문서로 등록할 수 없습니다' },
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
        return HttpResponse.json(toDetail(existing), { status: 201 });
      }

      const problem = checkFile(account, body.data.fileId, path.data.projectId);

      if (problem) return problem;

      if (existing) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.fileId', message: '이미 다른 문서에 등록된 파일입니다' },
        ]);
      }

      const file = getMockFile(body.data.fileId)!;
      const id = addDocument(account, path.data.projectId, {
        title: body.data.title,
        category: body.data.category,
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

      return HttpResponse.json(toDetail(documents.get(id)!), { status: 201 });
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

      const { category, q, pinned } = query.data;
      const keyword = q?.toLowerCase();

      return HttpResponse.json({
        items: live(account, path.data.projectId)
          .filter(
            (document) =>
              (!category || document.category === category) &&
              (pinned === undefined || document.isPinned === pinned) &&
              (!keyword || document.title.toLowerCase().includes(keyword)),
          )
          .sort(
            (a, b) =>
              Number(b.isPinned) - Number(a.isPinned) ||
              b.updatedAt.localeCompare(a.updatedAt) ||
              b.id.localeCompare(a.id),
          )
          .map(toDocument),
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

      return document ? HttpResponse.json(toDetail(document)) : apiError('NOT_FOUND');
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
            message: `고정한 문서는 프로젝트마다 ${DOCUMENT_PINNED_MAX}개까지입니다`,
          },
        ]);
      }

      Object.assign(
        document,
        Object.fromEntries(Object.entries(body.data).filter(([, value]) => value !== undefined)),
      );

      return HttpResponse.json(toDetail(document));
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
          { path: 'body.fileId', message: '이미 다른 문서에 등록된 파일입니다' },
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

      return HttpResponse.json(toDetail(document), { status: 201 });
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
          { path: 'params.versionNo', message: '검사가 끝난 파일만 열 수 있습니다' },
        ]);
      }

      // 민감 자료는 기록을 먼저 남긴 뒤에만 주소를 줌
      if (document.isSensitive) {
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
