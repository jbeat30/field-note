import {
  FILE_DOWNLOAD_URL_TTL_SECONDS,
  DOCUMENT_PINNED_MAX,
  resolveSensitive,
  todayInSeoul,
  type Document,
  type DocumentAccessLogsResponse,
  type DocumentAccessQuery,
  type DocumentAccessUrl,
  type DocumentCreate,
  type DocumentDetail,
  type DocumentListQuery,
  type DocumentsResponse,
  type DocumentUpdate,
  type DocumentVersion,
  type DocumentVersionCreate,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';
import type { ObjectStorage } from '../storage/objectStorage';

export class DocumentError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[document.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type DocumentService = {
  // 올린 파일로 문서를 만듦 (첫 버전). 같은 파일로 다시 부르면 만들어 둔 문서를 돌려줌 (재시도에 안전)
  create: (
    companyId: string,
    userId: string,
    projectId: string,
    input: DocumentCreate,
  ) => Promise<DocumentDetail>;
  // 프로젝트의 문서 목록 (고정한 문서가 먼저, 그다음 최근 수정순). 각 문서는 최신본을 보여 줌
  list: (
    companyId: string,
    projectId: string,
    query: DocumentListQuery,
  ) => Promise<DocumentsResponse>;
  get: (companyId: string, documentId: string) => Promise<DocumentDetail>;
  // 새 버전 추가: 이전 버전은 그대로 보존
  addVersion: (
    companyId: string,
    userId: string,
    documentId: string,
    input: DocumentVersionCreate,
  ) => Promise<DocumentDetail>;
  update: (companyId: string, documentId: string, input: DocumentUpdate) => Promise<DocumentDetail>;
  // 소프트 삭제 (파일·버전·열람 기록은 보존)
  remove: (companyId: string, documentId: string) => Promise<void>;
  // 열람·내려받기 주소 발급. 민감 자료면 감사 기록을 남긴 뒤에만 발급
  access: (
    companyId: string,
    userId: string,
    documentId: string,
    versionNo: number,
    query: DocumentAccessQuery,
  ) => Promise<DocumentAccessUrl>;
  // 민감 자료의 열람 기록 (최근순)
  accessLogs: (companyId: string, documentId: string) => Promise<DocumentAccessLogsResponse>;
};

const include = {
  versions: { include: { file: true }, orderBy: { versionNo: 'desc' } },
} satisfies Prisma.DocumentInclude;

type Row = Prisma.DocumentGetPayload<{ include: typeof include }>;
type VersionRow = Row['versions'][number];

const isoDate = (value: Date) => value.toISOString().slice(0, 10);

const toVersion = (row: VersionRow): DocumentVersion => ({
  versionNo: row.versionNo,
  fileId: row.fileId,
  fileName: row.file.originalName,
  contentType: row.file.contentType,
  size: Number(row.file.sizeBytes),
  fileStatus: row.file.status,
  rejectReason: row.file.rejectReason,
  revisionDate: isoDate(row.revisionDate),
  reason: row.reason,
  uploadedBy: row.uploadedBy,
  createdAt: row.createdAt.toISOString(),
});

const toDocument = (row: Row): Document => ({
  id: row.id,
  projectId: row.projectId,
  category: row.category,
  title: row.title,
  isSensitive: row.isSensitive,
  isPinned: row.isPinned,
  createdBy: row.createdBy,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  versionCount: row.versions.length,
  // 최신 버전이 맨 앞 (버전 번호 내림차순)
  latest: toVersion(row.versions[0]!),
});

const toDetail = (row: Row): DocumentDetail => ({
  ...toDocument(row),
  versions: row.versions.map(toVersion),
});

/**
 * @description 작업자료 문서함 서비스 (앱 계정으로 자기 회사 범위에서만 처리). 문서마다 버전을 쌓고(덮어쓰지 않음),
 * 민감 자료는 열람·내려받기를 수정·삭제할 수 없는 감사 기록으로 남긴다 (서비스 기획서 §12.3, §7.3, §13.1)
 * @param app 앱 계정 Prisma 클라이언트
 * @param storage 객체 저장소 (열람 주소 발급용)
 * @param now 현재 시각
 * @returns 문서 서비스
 */
export const createDocumentService = (
  app: PrismaClient,
  storage: ObjectStorage,
  now: () => Date = () => new Date(),
): DocumentService => {
  const findLive = async (tx: Prisma.TransactionClient, documentId: string) => {
    const row = await tx.document.findFirst({
      where: { id: documentId, deletedAt: null },
      include,
    });

    if (!row) {
      throw new DocumentError('NOT_FOUND');
    }

    return row;
  };

  // 버전으로 쓸 파일 검사: 같은 프로젝트에 올린 문서용 파일이고 거부되지 않았으며 다른 문서에 쓰이지 않았는지
  const checkFile = async (
    tx: Prisma.TransactionClient,
    fileId: string,
    projectId: string,
    allowedDocumentId?: string,
  ) => {
    const file = await tx.storedFile.findFirst({ where: { id: fileId, projectId } });

    if (!file || file.purpose !== 'DOCUMENT') {
      throw new DocumentError('INVALID', {
        path: 'body.fileId',
        message: '이 프로젝트에 올린 문서 파일이 아닙니다',
      });
    }

    if (file.status === 'REJECTED') {
      throw new DocumentError('INVALID', {
        path: 'body.fileId',
        message: '검사에서 거부된 파일은 문서로 등록할 수 없습니다',
      });
    }

    const used = await tx.documentVersion.findFirst({ where: { fileId } });

    if (used && used.documentId !== allowedDocumentId) {
      throw new DocumentError('INVALID', {
        path: 'body.fileId',
        message: '이미 다른 문서에 등록된 파일입니다',
      });
    }

    return { file, used };
  };

  const revisionDateOf = (value: string | undefined) =>
    new Date(`${value ?? todayInSeoul(now())}T00:00:00Z`);

  return {
    create: (companyId, userId, projectId, input) =>
      withCompany(app, companyId, async (tx) => {
        if (!(await tx.project.findFirst({ where: { id: projectId } }))) {
          throw new DocumentError('NOT_FOUND');
        }

        // 같은 파일로 이미 만든 문서가 있으면 그 문서를 돌려줌 (재시도에 안전)
        const existing = await tx.documentVersion.findFirst({
          where: { fileId: input.fileId, document: { projectId, deletedAt: null } },
        });

        if (existing) {
          return toDetail(await findLive(tx, existing.documentId));
        }

        await checkFile(tx, input.fileId, projectId);

        const created = await tx.document.create({
          data: {
            companyId,
            projectId,
            category: input.category,
            title: input.title,
            isSensitive: resolveSensitive(input.category, input.isSensitive),
            createdBy: userId,
          },
        });

        await tx.documentVersion.create({
          data: {
            companyId,
            documentId: created.id,
            versionNo: 1,
            fileId: input.fileId,
            revisionDate: revisionDateOf(input.revisionDate),
            reason: input.reason,
            uploadedBy: userId,
          },
        });

        return toDetail(await findLive(tx, created.id));
      }),

    list: (companyId, projectId, query) =>
      withCompany(app, companyId, async (tx) => {
        if (!(await tx.project.findFirst({ where: { id: projectId } }))) {
          throw new DocumentError('NOT_FOUND');
        }

        const rows = await tx.document.findMany({
          where: {
            projectId,
            deletedAt: null,
            category: query.category,
            isPinned: query.pinned,
            title: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
          },
          include,
          orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
          take: 200,
        });

        return { items: rows.map(toDocument) };
      }),

    get: (companyId, documentId) =>
      withCompany(app, companyId, async (tx) => toDetail(await findLive(tx, documentId))),

    addVersion: (companyId, userId, documentId, input) =>
      withCompany(app, companyId, async (tx) => {
        // 같은 문서에 새 버전이 동시에 들어와도 번호가 겹치지 않도록 문서 행을 잠금
        await tx.$queryRaw`SELECT 1 FROM documents WHERE id = ${documentId}::uuid FOR UPDATE`;

        const current = await findLive(tx, documentId);
        const { used } = await checkFile(tx, input.fileId, current.projectId, documentId);

        // 이미 이 문서의 버전으로 등록된 파일이면 그대로 돌려줌 (재시도에 안전)
        if (used) {
          return toDetail(current);
        }

        await tx.documentVersion.create({
          data: {
            companyId,
            documentId,
            versionNo: current.versions[0]!.versionNo + 1,
            fileId: input.fileId,
            revisionDate: revisionDateOf(input.revisionDate),
            reason: input.reason,
            uploadedBy: userId,
          },
        });
        await tx.document.update({
          where: { companyId_id: { companyId, id: documentId } },
          data: { updatedAt: now() },
        });

        return toDetail(await findLive(tx, documentId));
      }),

    update: (companyId, documentId, input) =>
      withCompany(app, companyId, async (tx) => {
        const current = await findLive(tx, documentId);

        if (input.isPinned && !current.isPinned) {
          const pinned = await tx.document.count({
            where: { projectId: current.projectId, isPinned: true, deletedAt: null },
          });

          if (pinned >= DOCUMENT_PINNED_MAX) {
            throw new DocumentError('INVALID', {
              path: 'body.isPinned',
              message: `고정한 문서는 프로젝트마다 ${DOCUMENT_PINNED_MAX}개까지입니다`,
            });
          }
        }

        await tx.document.update({
          where: { companyId_id: { companyId, id: documentId } },
          data: {
            title: input.title,
            category: input.category,
            isSensitive: input.isSensitive,
            isPinned: input.isPinned,
          },
        });

        return toDetail(await findLive(tx, documentId));
      }),

    remove: async (companyId, documentId) => {
      await withCompany(app, companyId, async (tx) => {
        await findLive(tx, documentId);
        await tx.document.update({
          where: { companyId_id: { companyId, id: documentId } },
          data: { deletedAt: now(), isPinned: false },
        });
      });
    },

    access: async (companyId, userId, documentId, versionNo, query) => {
      const { key, fileName, isSensitive } = await withCompany(app, companyId, async (tx) => {
        const document = await findLive(tx, documentId);
        const version = document.versions.find((item) => item.versionNo === versionNo);

        if (!version) {
          throw new DocumentError('NOT_FOUND');
        }

        if (version.file.status !== 'READY') {
          throw new DocumentError('INVALID', {
            path: 'params.versionNo',
            message: '검사가 끝난 파일만 열 수 있습니다',
          });
        }

        // 민감 자료는 기록을 먼저 남긴 같은 트랜잭션 안에서만 주소를 발급 (기록 없이 열 수 없음)
        if (document.isSensitive) {
          await tx.auditLog.create({
            data: {
              companyId,
              action: query.mode === 'download' ? 'DOCUMENT_DOWNLOADED' : 'DOCUMENT_VIEWED',
              actorId: userId,
              targetId: documentId,
              detail: { versionNo, title: document.title },
              // 서비스 시계로 기록 (테스트·시각 일관성)
              createdAt: now(),
            },
          });
        }

        return {
          key: version.file.objectKey,
          fileName: version.file.originalName,
          isSensitive: document.isSensitive,
        };
      });

      return {
        url: await storage.presignDownload(key, {
          expiresInSeconds: FILE_DOWNLOAD_URL_TTL_SECONDS,
          // 내려받기만 첨부 파일로, 열람은 브라우저가 바로 보여 줌
          fileName: query.mode === 'download' ? fileName : undefined,
        }),
        expiresAt: new Date(now().getTime() + FILE_DOWNLOAD_URL_TTL_SECONDS * 1000).toISOString(),
        isLogged: isSensitive,
      };
    },

    accessLogs: (companyId, documentId) =>
      withCompany(app, companyId, async (tx) => {
        await findLive(tx, documentId);

        const logs = await tx.auditLog.findMany({
          where: {
            targetId: documentId,
            action: { in: ['DOCUMENT_VIEWED', 'DOCUMENT_DOWNLOADED'] },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 200,
        });
        const users = await tx.user.findMany({
          where: { id: { in: [...new Set(logs.map((log) => log.actorId))] } },
          select: { id: true, displayName: true },
        });

        return {
          items: logs.map((log) => ({
            id: log.id,
            action: log.action,
            actorId: log.actorId,
            actorName: users.find((user) => user.id === log.actorId)?.displayName ?? '(알 수 없음)',
            versionNo: (log.detail as { versionNo: number }).versionNo,
            createdAt: log.createdAt.toISOString(),
          })),
        };
      }),
  };
};
