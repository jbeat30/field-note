import { createHash, randomUUID } from 'node:crypto';

import {
  FILE_DOWNLOAD_URL_TTL_SECONDS,
  FILE_UPLOAD_URL_TTL_SECONDS,
  fileObjectKey,
  isAllowedFileType,
  isImageMime,
  type FileRejectReason,
  type FileUploadRequest,
  type FileUploadTicket,
  type FileUrlQuery,
  type FileUrlResponse,
  type StoredFile,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';
import type { JobQueue } from '../queue/jobQueue';
import type { ObjectStorage } from '../storage/objectStorage';

import { createThumbnail, detectFileType } from './fileInspector';

export const FILE_PROCESS_QUEUE = 'file.process';

export type FileProcessJob = { companyId: string; fileId: string };

export class FileError extends Error {
  constructor(readonly code: 'NOT_FOUND' | 'QUOTA' | 'NOT_UPLOADED' | 'NOT_READY') {
    super(`[file.service] ${code}`);
  }
}

export type FileService = {
  // 업로드 신청: 형식·크기·회사 용량을 확인하고 짧은 만료의 업로드 주소를 발급
  requestUpload: (
    companyId: string,
    userId: string,
    projectId: string,
    input: FileUploadRequest,
  ) => Promise<FileUploadTicket>;
  // 업로드 완료 알림: 저장소에 올라왔는지 확인하고 내용 검사·썸네일 작업을 시작 (여러 번 불러도 안전)
  complete: (companyId: string, fileId: string) => Promise<StoredFile>;
  get: (companyId: string, fileId: string) => Promise<StoredFile>;
  // 사용 가능한 파일의 내려받기 주소 (회사 범위에서 찾은 파일에만 발급)
  url: (companyId: string, fileId: string, query: FileUrlQuery) => Promise<FileUrlResponse>;
  // 내용 검사·썸네일 작업 (작업 큐 처리기가 호출)
  process: (job: FileProcessJob) => Promise<void>;
};

type Row = Prisma.StoredFileGetPayload<object>;

const toFile = (row: Row): StoredFile => ({
  id: row.id,
  projectId: row.projectId,
  purpose: row.purpose,
  name: row.originalName,
  contentType: row.contentType,
  size: Number(row.sizeBytes),
  status: row.status,
  rejectReason: row.rejectReason,
  hasThumbnail: row.thumbnailKey !== null,
  sha256: row.sha256,
  uploadedBy: row.uploadedBy,
  createdAt: row.createdAt.toISOString(),
  readyAt: row.readyAt?.toISOString() ?? null,
});

export type FileServiceDeps = {
  app: PrismaClient;
  storage: ObjectStorage;
  queue: JobQueue;
  now?: () => Date;
};

/**
 * @description 파일 업로드 서비스 (앱 계정으로 자기 회사 범위에서만 처리). 브라우저가 저장소에 직접 올리고,
 * 서버는 올라온 뒤 내용 검사(file-type)·크기 확인·썸네일(sharp)을 작업으로 처리한다 (기술 기획서 §10)
 * @param deps 앱 계정 Prisma 클라이언트, 객체 저장소, 작업 큐, 현재 시각
 * @returns 파일 서비스
 */
export const createFileService = ({
  app,
  storage,
  queue,
  now = () => new Date(),
}: FileServiceDeps): FileService => {
  const find = (companyId: string, fileId: string) =>
    withCompany(app, companyId, (tx) => tx.storedFile.findFirst({ where: { id: fileId } }));

  const getOrThrow = async (companyId: string, fileId: string) => {
    const row = await find(companyId, fileId);

    if (!row) {
      throw new FileError('NOT_FOUND');
    }

    return row;
  };

  // 검사에서 걸러진 파일은 저장소에서도 지운다 (악성 파일을 남겨 두지 않음)
  const reject = async (row: Row, reason: FileRejectReason) => {
    await storage.remove(row.objectKey);
    await withCompany(app, row.companyId, (tx) =>
      tx.storedFile.update({
        where: { companyId_id: { companyId: row.companyId, id: row.id } },
        data: { status: 'REJECTED', rejectReason: reason },
      }),
    );
  };

  return {
    requestUpload: async (companyId, userId, projectId, input) => {
      const at = now();
      const row = await withCompany(app, companyId, async (tx) => {
        const project = await tx.project.findFirst({ where: { id: projectId } });

        if (!project) {
          throw new FileError('NOT_FOUND');
        }

        // 같은 회사의 동시 신청이 한도를 함께 넘지 않도록 회사 단위로 순서를 맞춤
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`files:${companyId}`}))`;

        const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
        // 사용 중: 검사 중·사용 가능 파일 + 아직 업로드 주소가 유효한 신청 (만료된 신청은 용량에서 제외)
        const used = await tx.storedFile.aggregate({
          _sum: { sizeBytes: true },
          where: {
            OR: [
              { status: { in: ['PROCESSING', 'READY'] } },
              {
                status: 'PENDING',
                createdAt: { gt: new Date(at.getTime() - FILE_UPLOAD_URL_TTL_SECONDS * 1000) },
              },
            ],
          },
        });

        if ((used._sum.sizeBytes ?? 0n) + BigInt(input.size) > company.storageQuotaBytes) {
          throw new FileError('QUOTA');
        }

        // 객체 키에 파일 ID가 들어가므로 ID를 먼저 정함 (회사·프로젝트·파일이 경로에 모두 들어감)
        const id = randomUUID();

        return tx.storedFile.create({
          data: {
            companyId,
            id,
            projectId,
            purpose: input.purpose,
            originalName: input.name,
            contentType: input.contentType,
            sizeBytes: BigInt(input.size),
            objectKey: fileObjectKey(companyId, projectId, id, 'original'),
            uploadedBy: userId,
          },
        });
      });
      const upload = await storage.presignUpload(row.objectKey, {
        contentType: input.contentType,
        size: input.size,
        expiresInSeconds: FILE_UPLOAD_URL_TTL_SECONDS,
      });

      return {
        file: toFile(row),
        upload: {
          url: upload.url,
          method: 'PUT',
          headers: upload.headers,
          expiresAt: new Date(at.getTime() + FILE_UPLOAD_URL_TTL_SECONDS * 1000).toISOString(),
        },
      };
    },

    complete: async (companyId, fileId) => {
      let row = await getOrThrow(companyId, fileId);

      if (row.status === 'READY' || row.status === 'REJECTED') {
        return toFile(row);
      }

      if (row.status === 'PENDING') {
        if ((await storage.size(row.objectKey)) === null) {
          throw new FileError('NOT_UPLOADED');
        }

        row = await withCompany(app, companyId, (tx) =>
          tx.storedFile.update({
            where: { companyId_id: { companyId, id: fileId } },
            data: { status: 'PROCESSING' },
          }),
        );
      }

      // 작업 등록 뒤 서버가 멈춰도 같은 요청을 다시 보내면 작업이 다시 등록됨
      await queue.send(FILE_PROCESS_QUEUE, { companyId, fileId } satisfies FileProcessJob);

      return toFile((await find(companyId, fileId)) ?? row);
    },

    get: async (companyId, fileId) => toFile(await getOrThrow(companyId, fileId)),

    url: async (companyId, fileId, { variant }) => {
      const row = await getOrThrow(companyId, fileId);

      if (row.status !== 'READY') {
        throw new FileError('NOT_READY');
      }

      // 작업자료 문서 파일은 문서 API로만 열람한다 (민감 자료 열람 기록을 거치지 않고 열 수 없게 함)
      if (row.purpose === 'DOCUMENT') {
        throw new FileError('NOT_FOUND');
      }

      const key = variant === 'thumbnail' ? row.thumbnailKey : row.objectKey;

      if (!key) {
        throw new FileError('NOT_FOUND');
      }

      return {
        url: await storage.presignDownload(key, {
          expiresInSeconds: FILE_DOWNLOAD_URL_TTL_SECONDS,
          fileName: variant === 'original' ? row.originalName : undefined,
        }),
        expiresAt: new Date(now().getTime() + FILE_DOWNLOAD_URL_TTL_SECONDS * 1000).toISOString(),
      };
    },

    process: async ({ companyId, fileId }) => {
      const row = await find(companyId, fileId);

      // 이미 끝났거나 없는 파일은 건너뜀 (재시도·중복 등록에도 안전)
      if (!row || row.status !== 'PROCESSING') {
        return;
      }

      const size = await storage.size(row.objectKey);

      if (size === null) {
        return reject(row, 'NOT_UPLOADED');
      }

      if (size !== Number(row.sizeBytes)) {
        return reject(row, 'SIZE_MISMATCH');
      }

      const body = await storage.read(row.objectKey);
      const detected = await detectFileType(body);

      // 확장자·선언한 형식이 아니라 내용으로 판별한 형식이 허용 목록에 있고 둘 다와 일치해야 통과
      if (
        !detected ||
        detected.mime !== row.contentType ||
        !isAllowedFileType(row.purpose, detected.mime, row.originalName)
      ) {
        return reject(row, 'CONTENT_MISMATCH');
      }

      let thumbnailKey: string | null = null;

      if (isImageMime(detected.mime)) {
        const thumbnail = await createThumbnail(body);

        if (!thumbnail) {
          return reject(row, 'UNREADABLE_IMAGE');
        }

        thumbnailKey = fileObjectKey(companyId, row.projectId, row.id, 'thumbnail');
        await storage.write(thumbnailKey, thumbnail, 'image/webp');
      }

      const at = now();

      await withCompany(app, companyId, (tx) =>
        tx.storedFile.update({
          where: { companyId_id: { companyId, id: fileId } },
          data: {
            status: 'READY',
            contentType: detected.mime,
            thumbnailKey,
            sha256: createHash('sha256').update(body).digest('hex'),
            readyAt: at,
          },
        }),
      );
    },
  };
};

/**
 * @description 파일 처리 작업 처리기 등록. 저장소 장애처럼 일시적인 오류는 예외로 던져 재시도하고,
 * 파일 자체의 문제(형식 위조 등)는 거부 상태로 기록한 뒤 정상 종료한다
 * @param queue 작업 큐
 * @param service 파일 서비스
 */
export const registerFileWorker = async (queue: JobQueue, service: FileService) => {
  await queue.register(FILE_PROCESS_QUEUE, { retryLimit: 5, retryDelaySeconds: 30 });
  await queue.work<FileProcessJob>(FILE_PROCESS_QUEUE, (job) => service.process(job));
};
