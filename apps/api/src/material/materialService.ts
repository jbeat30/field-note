import {
  MATERIAL_MAX_PER_COMPANY,
  compareMaterials,
  normalizeMaterialText,
  summarizeMaterialBalance,
  type Material,
  type MaterialBalanceResponse,
  type MaterialCreate,
  type MaterialListQuery,
  type MaterialRecord,
  type MaterialRecordBatch,
  type MaterialRecordCreate,
  type MaterialRecordListQuery,
  type MaterialRecordsResponse,
  type MaterialRecordUpdate,
  type MaterialUpdate,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class MaterialError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID' | 'DUPLICATE' | 'LIMIT',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[material.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type MaterialService = {
  // 자재 목록 (최근 기록한 자재가 먼저, 숨긴 자재는 기본 제외)
  list: (companyId: string, query: MaterialListQuery) => Promise<Material[]>;
  // 즉석 추가: 같은 이름·규격이 이미 있으면 DUPLICATE
  create: (companyId: string, input: MaterialCreate) => Promise<Material>;
  // 이름·규격·분류 수정과 숨김. 기록이 있는 자재는 단위를 바꿀 수 없음
  update: (companyId: string, id: string, input: MaterialUpdate) => Promise<Material>;
  createRecord: (
    companyId: string,
    userId: string,
    projectId: string,
    input: MaterialRecordCreate,
  ) => Promise<MaterialRecord>;
  // 한 번에 여러 건 (목록형 입력): 한 건이라도 잘못되면 전부 저장하지 않음
  createRecords: (
    companyId: string,
    userId: string,
    projectId: string,
    input: MaterialRecordBatch,
  ) => Promise<MaterialRecord[]>;
  listRecords: (
    companyId: string,
    projectId: string,
    query: MaterialRecordListQuery,
  ) => Promise<MaterialRecordsResponse>;
  updateRecord: (
    companyId: string,
    id: string,
    input: MaterialRecordUpdate,
  ) => Promise<MaterialRecord>;
  // 소프트 삭제
  removeRecord: (companyId: string, id: string) => Promise<void>;
  // 프로젝트별 자재 현황 (반입·사용·반출·폐기·잔량)
  balance: (companyId: string, projectId: string) => Promise<MaterialBalanceResponse>;
};

type RecordRow = Prisma.MaterialRecordGetPayload<object>;
type MaterialRow = Prisma.MaterialGetPayload<object>;

const asDate = (value: string) => new Date(`${value}T00:00:00Z`);
const isoDate = (value: Date) => value.toISOString().slice(0, 10);

const toRecord = (row: RecordRow): MaterialRecord => ({
  id: row.id,
  projectId: row.projectId,
  materialId: row.materialId,
  recordDate: isoDate(row.recordDate),
  kind: row.kind,
  quantity: Number(row.quantity),
  categoryId: row.categoryId,
  area: row.area,
  partnerId: row.partnerId,
  sourceText: row.sourceText,
  isChange: row.isChange,
  isAfterService: row.isAfterService,
  memo: row.memo,
  createdBy: row.createdBy,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toMaterial = (row: MaterialRow, lastUsedOn: Date | null): Material => ({
  id: row.id,
  name: row.name,
  spec: row.spec,
  unit: row.unit,
  category: row.category,
  isActive: row.isActive,
  lastUsedOn: lastUsedOn ? isoDate(lastUsedOn) : null,
});

const encodeCursor = (row: RecordRow) =>
  Buffer.from(JSON.stringify([isoDate(row.recordDate), row.id])).toString('base64url');

const decodeCursor = (cursor: string): { recordDate: Date; id: string } => {
  try {
    const [recordDate, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as [
      string,
      string,
    ];
    const date = asDate(recordDate);

    if (Number.isNaN(date.getTime()) || typeof id !== 'string') {
      throw new Error('형식 오류');
    }

    return { recordDate: date, id };
  } catch {
    throw new MaterialError('INVALID', {
      path: 'query.cursor',
      message: '목록 위치가 올바르지 않습니다',
    });
  }
};

const isUniqueViolation = (error: unknown) =>
  error instanceof Error &&
  /unique|P2002|duplicate/i.test(`${error.message} ${(error as { code?: string }).code ?? ''}`);

/**
 * @description 사용 자재 서비스 (앱 계정으로 자기 회사 범위에서만 처리). 자재 목록 관리와 프로젝트별 반입·사용·반출·폐기 기록, 잔량 집계를 맡는다 (서비스 기획서 §11)
 * 단가·구매·재고는 다루지 않는다
 * @param app 앱 계정 Prisma 클라이언트
 * @param now 현재 시각 (소프트 삭제 시각 기록용)
 * @returns 자재 서비스
 */
export const createMaterialService = (
  app: PrismaClient,
  now: () => Date = () => new Date(),
): MaterialService => {
  const lastUsedMap = async (tx: Prisma.TransactionClient) => {
    const groups = await tx.materialRecord.groupBy({
      by: ['materialId'],
      where: { deletedAt: null },
      _max: { recordDate: true },
    });

    return new Map(groups.map((group) => [group.materialId, group._max.recordDate]));
  };

  // 기록 한 건의 참조(프로젝트·자재·작업 구분·업체)가 이 회사에서 쓸 수 있는지 확인
  const checkReferences = async (
    tx: Prisma.TransactionClient,
    input: { materialId?: string; categoryId?: string | null; partnerId?: string | null },
    prefix: string,
    currentMaterialId?: string,
  ) => {
    if (input.materialId && input.materialId !== currentMaterialId) {
      const material = await tx.material.findFirst({ where: { id: input.materialId } });

      if (!material || !material.isActive) {
        throw new MaterialError('INVALID', {
          path: `${prefix}.materialId`,
          message: '선택할 수 없는 자재입니다',
        });
      }
    }

    if (input.categoryId) {
      const option = await tx.optionItem.findFirst({
        where: { id: input.categoryId, kind: 'WORK_CATEGORY' },
      });

      if (!option) {
        throw new MaterialError('INVALID', {
          path: `${prefix}.categoryId`,
          message: '선택할 수 없는 작업 구분입니다',
        });
      }
    }

    if (input.partnerId && !(await tx.partner.findFirst({ where: { id: input.partnerId } }))) {
      throw new MaterialError('INVALID', {
        path: `${prefix}.partnerId`,
        message: '선택할 수 없는 업체입니다',
      });
    }
  };

  const requireProject = async (tx: Prisma.TransactionClient, projectId: string) => {
    if (!(await tx.project.findFirst({ where: { id: projectId } }))) {
      throw new MaterialError('NOT_FOUND');
    }
  };

  const findLiveRecord = async (tx: Prisma.TransactionClient, id: string) => {
    const row = await tx.materialRecord.findFirst({ where: { id, deletedAt: null } });

    if (!row) {
      throw new MaterialError('NOT_FOUND');
    }

    return row;
  };

  const createOne = (
    tx: Prisma.TransactionClient,
    companyId: string,
    userId: string,
    projectId: string,
    input: MaterialRecordCreate,
  ) =>
    tx.materialRecord.create({
      data: {
        companyId,
        projectId,
        materialId: input.materialId,
        recordDate: asDate(input.recordDate),
        kind: input.kind,
        quantity: input.quantity,
        categoryId: input.categoryId,
        area: input.area,
        partnerId: input.partnerId,
        sourceText: input.sourceText,
        isChange: input.isChange,
        isAfterService: input.isAfterService,
        memo: input.memo,
        createdBy: userId,
      },
    });

  return {
    list: (companyId, query) =>
      withCompany(app, companyId, async (tx) => {
        const rows = await tx.material.findMany({
          where: {
            isActive: query.includeInactive ? undefined : true,
            category: query.category,
            ...(query.q
              ? {
                  OR: [
                    { name: { contains: query.q, mode: 'insensitive' } },
                    { spec: { contains: query.q, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
        });
        const last = await lastUsedMap(tx);

        return rows.map((row) => toMaterial(row, last.get(row.id) ?? null)).sort(compareMaterials);
      }),

    create: (companyId, input) =>
      withCompany(app, companyId, async (tx) => {
        const nameKey = normalizeMaterialText(input.name);
        const specKey = normalizeMaterialText(input.spec);

        if ((await tx.material.count()) >= MATERIAL_MAX_PER_COMPANY) {
          throw new MaterialError('LIMIT');
        }

        if (await tx.material.findFirst({ where: { nameKey, specKey } })) {
          throw new MaterialError('DUPLICATE');
        }

        try {
          return toMaterial(
            await tx.material.create({
              data: {
                companyId,
                name: input.name,
                nameKey,
                spec: input.spec,
                specKey,
                unit: input.unit,
                category: input.category,
              },
            }),
            null,
          );
        } catch (error) {
          // 같은 자재가 동시에 들어온 경우의 안전망 (사전 조회 이후 고유 제약에 걸림)
          if (isUniqueViolation(error)) throw new MaterialError('DUPLICATE');

          throw error;
        }
      }),

    update: (companyId, id, input) =>
      withCompany(app, companyId, async (tx) => {
        const current = await tx.material.findFirst({ where: { id } });

        if (!current) {
          throw new MaterialError('NOT_FOUND');
        }

        const name = input.name ?? current.name;
        const spec = input.spec === undefined ? current.spec : input.spec;
        const nameKey = normalizeMaterialText(name);
        const specKey = normalizeMaterialText(spec);

        if (
          (nameKey !== current.nameKey || specKey !== current.specKey) &&
          (await tx.material.findFirst({ where: { nameKey, specKey, id: { not: id } } }))
        ) {
          throw new MaterialError('DUPLICATE');
        }

        if (
          input.unit !== undefined &&
          input.unit !== current.unit &&
          (await tx.materialRecord.count({ where: { materialId: id } })) > 0
        ) {
          throw new MaterialError('INVALID', {
            path: 'body.unit',
            message: '기록이 있는 자재는 단위를 바꿀 수 없습니다',
          });
        }

        const row = await tx.material.update({
          where: { companyId_id: { companyId, id } },
          data: {
            name,
            nameKey,
            spec,
            specKey,
            unit: input.unit,
            category: input.category,
            isActive: input.isActive,
          },
        });

        return toMaterial(row, (await lastUsedMap(tx)).get(id) ?? null);
      }),

    createRecord: (companyId, userId, projectId, input) =>
      withCompany(app, companyId, async (tx) => {
        await requireProject(tx, projectId);
        await checkReferences(tx, input, 'body');

        return toRecord(await createOne(tx, companyId, userId, projectId, input));
      }),

    createRecords: (companyId, userId, projectId, input) =>
      withCompany(app, companyId, async (tx) => {
        await requireProject(tx, projectId);

        const created: MaterialRecord[] = [];

        for (const [index, record] of input.records.entries()) {
          await checkReferences(tx, record, `body.records.${index}`);
          created.push(toRecord(await createOne(tx, companyId, userId, projectId, record)));
        }

        return created;
      }),

    listRecords: async (companyId, projectId, query) => {
      const cursor = query.cursor ? decodeCursor(query.cursor) : null;
      const rows = await withCompany(app, companyId, async (tx) => {
        await requireProject(tx, projectId);

        return tx.materialRecord.findMany({
          where: {
            projectId,
            deletedAt: null,
            recordDate: query.date ? asDate(query.date) : undefined,
            materialId: query.materialId,
            kind: query.kind,
            ...(cursor
              ? {
                  OR: [
                    { recordDate: { lt: cursor.recordDate } },
                    { recordDate: cursor.recordDate, id: { lt: cursor.id } },
                  ],
                }
              : {}),
          },
          orderBy: [{ recordDate: 'desc' }, { id: 'desc' }],
          // 다음 페이지가 있는지 알기 위해 한 건 더 읽음
          take: query.limit + 1,
        });
      });
      const page = rows.slice(0, query.limit);

      return {
        items: page.map(toRecord),
        nextCursor: rows.length > query.limit ? encodeCursor(page[page.length - 1]!) : null,
      };
    },

    updateRecord: (companyId, id, input) =>
      withCompany(app, companyId, async (tx) => {
        const current = await findLiveRecord(tx, id);

        await checkReferences(tx, input, 'body', current.materialId);

        return toRecord(
          await tx.materialRecord.update({
            where: { companyId_id: { companyId, id } },
            data: {
              recordDate: input.recordDate ? asDate(input.recordDate) : undefined,
              kind: input.kind,
              quantity: input.quantity,
              categoryId: input.categoryId,
              area: input.area,
              partnerId: input.partnerId,
              sourceText: input.sourceText,
              isChange: input.isChange,
              isAfterService: input.isAfterService,
              memo: input.memo,
            },
          }),
        );
      }),

    removeRecord: async (companyId, id) => {
      await withCompany(app, companyId, async (tx) => {
        await findLiveRecord(tx, id);
        await tx.materialRecord.update({
          where: { companyId_id: { companyId, id } },
          data: { deletedAt: now() },
        });
      });
    },

    balance: (companyId, projectId) =>
      withCompany(app, companyId, async (tx) => {
        await requireProject(tx, projectId);

        const rows = await tx.materialRecord.findMany({
          where: { projectId, deletedAt: null },
          select: {
            materialId: true,
            kind: true,
            quantity: true,
            isChange: true,
            isAfterService: true,
          },
        });
        const materials = await tx.material.findMany({
          where: { id: { in: [...new Set(rows.map((row) => row.materialId))] } },
        });

        return {
          items: summarizeMaterialBalance(
            rows.map((row) => ({ ...row, quantity: Number(row.quantity) })),
            materials,
          ),
        };
      }),
  };
};
