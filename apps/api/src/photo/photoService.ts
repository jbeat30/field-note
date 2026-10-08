import {
  FILE_DOWNLOAD_URL_TTL_SECONDS,
  todayInSeoul,
  type Photo,
  type PhotoCreate,
  type PhotoListQuery,
  type PhotosResponse,
  type PhotoUpdate,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';
import type { ObjectStorage } from '../storage/objectStorage';

export class PhotoError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[photo.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type PhotoService = {
  // 올라온 파일을 사진으로 등록. 같은 파일을 다시 등록하면 기존 사진을 돌려줌 (재시도에 안전)
  create: (
    companyId: string,
    userId: string,
    projectId: string,
    input: PhotoCreate,
  ) => Promise<Photo>;
  // 사진첩 목록 (촬영일시 최근순, 커서 방식). 지운 사진은 제외
  list: (companyId: string, projectId: string, query: PhotoListQuery) => Promise<PhotosResponse>;
  get: (companyId: string, photoId: string) => Promise<Photo>;
  update: (companyId: string, photoId: string, input: PhotoUpdate) => Promise<Photo>;
  // 소프트 삭제 (파일과 기록은 보존)
  remove: (companyId: string, photoId: string) => Promise<void>;
};

type Row = Prisma.PhotoGetPayload<{ include: { file: true } }>;

const include = { file: true } as const;

const encodeCursor = (row: Row) =>
  Buffer.from(JSON.stringify([row.takenAt.toISOString(), row.id])).toString('base64url');

const decodeCursor = (cursor: string): { takenAt: Date; id: string } => {
  try {
    const [takenAt, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as [
      string,
      string,
    ];
    const date = new Date(takenAt);

    if (Number.isNaN(date.getTime()) || typeof id !== 'string') {
      throw new Error('형식 오류');
    }

    return { takenAt: date, id };
  } catch {
    throw new PhotoError('INVALID', {
      path: 'query.cursor',
      message: '목록 위치가 올바르지 않습니다',
    });
  }
};

const isoDate = (value: Date) => value.toISOString().slice(0, 10);

/**
 * @description 작업 사진 서비스 (앱 계정으로 자기 회사 범위에서만 처리). 파일 업로드(P2-1)로 올라온 파일에
 * 구분·구역·촬영일시·설명을 붙이고, 사진첩 조회·대표 사진 지정·소프트 삭제를 맡는다 (서비스 기획서 §12.2)
 * @param app 앱 계정 Prisma 클라이언트
 * @param storage 객체 저장소 (썸네일 주소 발급용)
 * @param now 현재 시각
 * @returns 사진 서비스
 */
export const createPhotoService = (
  app: PrismaClient,
  storage: ObjectStorage,
  now: () => Date = () => new Date(),
): PhotoService => {
  const toPhoto = async (row: Row): Promise<Photo> => ({
    id: row.id,
    projectId: row.projectId,
    fileId: row.fileId,
    category: row.category,
    area: row.area,
    takenAt: row.takenAt.toISOString(),
    workDate: isoDate(row.workDate),
    description: row.description,
    isCover: row.isCover,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
    file: {
      status: row.file.status,
      rejectReason: row.file.rejectReason,
      size: Number(row.file.sizeBytes),
    },
    thumbnailUrl:
      row.file.status === 'READY' && row.file.thumbnailKey
        ? await storage.presignDownload(row.file.thumbnailKey, {
            expiresInSeconds: FILE_DOWNLOAD_URL_TTL_SECONDS,
          })
        : null,
  });

  const findLive = async (tx: Prisma.TransactionClient, photoId: string) => {
    const row = await tx.photo.findFirst({ where: { id: photoId, deletedAt: null }, include });

    if (!row) {
      throw new PhotoError('NOT_FOUND');
    }

    return row;
  };

  return {
    create: async (companyId, userId, projectId, input) => {
      const row = await withCompany(app, companyId, async (tx) => {
        if (!(await tx.project.findFirst({ where: { id: projectId } }))) {
          throw new PhotoError('NOT_FOUND');
        }

        const file = await tx.storedFile.findFirst({ where: { id: input.fileId, projectId } });

        if (!file || file.purpose !== 'PHOTO') {
          throw new PhotoError('INVALID', {
            path: 'body.fileId',
            message: '이 프로젝트에 올린 사진 파일이 아닙니다',
          });
        }

        if (file.status === 'REJECTED') {
          throw new PhotoError('INVALID', {
            path: 'body.fileId',
            message: '검사에서 거부된 파일은 사진으로 등록할 수 없습니다',
          });
        }

        const existing = await tx.photo.findFirst({ where: { fileId: file.id }, include });

        if (existing) {
          if (existing.deletedAt) {
            throw new PhotoError('INVALID', {
              path: 'body.fileId',
              message: '이미 삭제된 사진의 파일입니다',
            });
          }

          return existing;
        }

        const takenAt = input.takenAt ? new Date(input.takenAt) : now();

        return tx.photo.create({
          data: {
            companyId,
            projectId,
            fileId: file.id,
            category: input.category,
            area: input.area,
            takenAt,
            // 날짜는 서울 기준 (밤 12시 전후에 찍은 사진이 하루 어긋나지 않게 함)
            workDate: new Date(`${input.workDate ?? todayInSeoul(takenAt)}T00:00:00Z`),
            description: input.description,
            uploadedBy: userId,
          },
          include,
        });
      });

      return toPhoto(row);
    },

    list: async (companyId, projectId, query) => {
      const cursor = query.cursor ? decodeCursor(query.cursor) : null;
      const rows = await withCompany(app, companyId, async (tx) => {
        if (!(await tx.project.findFirst({ where: { id: projectId } }))) {
          throw new PhotoError('NOT_FOUND');
        }

        return tx.photo.findMany({
          where: {
            projectId,
            deletedAt: null,
            category: query.category,
            area: query.area,
            workDate: query.workDate ? new Date(`${query.workDate}T00:00:00Z`) : undefined,
            ...(cursor
              ? {
                  OR: [
                    { takenAt: { lt: cursor.takenAt } },
                    { takenAt: cursor.takenAt, id: { lt: cursor.id } },
                  ],
                }
              : {}),
          },
          orderBy: [{ takenAt: 'desc' }, { id: 'desc' }],
          // 다음 페이지가 있는지 알기 위해 한 건 더 읽음
          take: query.limit + 1,
          include,
        });
      });
      const page = rows.slice(0, query.limit);

      return {
        items: await Promise.all(page.map(toPhoto)),
        nextCursor: rows.length > query.limit ? encodeCursor(page[page.length - 1]!) : null,
      };
    },

    get: async (companyId, photoId) =>
      toPhoto(await withCompany(app, companyId, (tx) => findLive(tx, photoId))),

    update: async (companyId, photoId, input) => {
      const row = await withCompany(app, companyId, async (tx) => {
        const current = await findLive(tx, photoId);

        if (input.isCover) {
          // 대표 사진은 프로젝트마다 한 장: 같은 프로젝트의 동시 변경이 겹치지 않도록 프로젝트 행을 잠금
          await tx.$queryRaw`SELECT 1 FROM projects WHERE id = ${current.projectId}::uuid FOR UPDATE`;
          await tx.photo.updateMany({
            where: { projectId: current.projectId, isCover: true, id: { not: photoId } },
            data: { isCover: false },
          });
        }

        return tx.photo.update({
          where: { companyId_id: { companyId, id: photoId } },
          data: {
            category: input.category,
            area: input.area,
            takenAt: input.takenAt ? new Date(input.takenAt) : undefined,
            workDate: input.workDate ? new Date(`${input.workDate}T00:00:00Z`) : undefined,
            description: input.description,
            isCover: input.isCover,
          },
          include,
        });
      });

      return toPhoto(row);
    },

    remove: async (companyId, photoId) => {
      await withCompany(app, companyId, async (tx) => {
        await findLive(tx, photoId);
        await tx.photo.update({
          where: { companyId_id: { companyId, id: photoId } },
          data: { deletedAt: now(), isCover: false },
        });
      });
    },
  };
};
