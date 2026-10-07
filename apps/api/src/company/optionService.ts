import {
  OPTION_KINDS,
  OPTION_MAX_PER_KIND,
  OPTION_PRESETS,
  normalizeOptionName,
  type OptionItem,
  type OptionKind,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class OptionError extends Error {
  constructor(readonly code: 'DUPLICATE' | 'LIMIT' | 'NOT_FOUND' | 'ORDER_MISMATCH') {
    super(`[company.option] ${code}`);
  }
}

export type OptionService = {
  // 전체 목록 (종류 순서 → 회사가 정한 순서). 비어 있는 종류는 프리셋으로 채운 뒤 돌려줌
  list: (companyId: string) => Promise<OptionItem[]>;
  create: (companyId: string, input: { kind: OptionKind; name: string }) => Promise<OptionItem>;
  update: (
    companyId: string,
    id: string,
    input: { name?: string; isActive?: boolean },
  ) => Promise<OptionItem>;
  // 해당 종류의 모든 항목(숨긴 것 포함)을 주어진 순서로 정렬
  reorder: (companyId: string, kind: OptionKind, ids: string[]) => Promise<void>;
};

type Row = { id: string; kind: OptionKind; name: string; isActive: boolean };

const toItem = (row: Row): OptionItem => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  isActive: row.isActive,
});

// 같은 이름이 동시에 들어오는 경우의 안전망 (사전 조회 이후 고유 제약에 걸림)
const isUniqueViolation = (error: unknown) =>
  error instanceof Error &&
  /unique|P2002|duplicate/i.test(`${error.message} ${(error as { code?: string }).code ?? ''}`);

// 종류별로 아직 항목이 하나도 없으면 프리셋을 채움. 항목은 삭제하지 않고 숨기기만 하므로 한 번 채우면 다시 비지 않는다
// 동시 요청이 겹쳐도 (회사, 종류, 이름) 고유 제약과 skipDuplicates로 중복 없이 한 번만 들어간다
const ensurePresets = async (tx: Prisma.TransactionClient, companyId: string) => {
  const existing = await tx.optionItem.groupBy({ by: ['kind'], _count: { _all: true } });
  const seeded = new Set(existing.map((row) => row.kind));

  for (const kind of OPTION_KINDS.filter((candidate) => !seeded.has(candidate))) {
    await tx.optionItem.createMany({
      data: OPTION_PRESETS[kind].map((name, index) => ({
        companyId,
        kind,
        name,
        nameKey: normalizeOptionName(name),
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }
};

/**
 * @description 선택 목록 서비스 (앱 계정으로 자기 회사 범위에서만 조회·수정, 삭제는 하지 않고 숨김 처리)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @returns 선택 목록 서비스
 */
export const createOptionService = (app: PrismaClient): OptionService => ({
  list: (companyId) =>
    withCompany(app, companyId, async (tx) => {
      await ensurePresets(tx, companyId);

      const rows = await tx.optionItem.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      // 종류 순서는 OPTION_KINDS 기준, 같은 종류 안에서는 정렬 값 순서 유지
      return OPTION_KINDS.flatMap((kind) => rows.filter((row) => row.kind === kind)).map(toItem);
    }),

  create: (companyId, { kind, name }) =>
    withCompany(app, companyId, async (tx) => {
      // 목록을 열기 전에 추가부터 하더라도 프리셋이 영영 안 채워지는 일이 없도록 먼저 채움
      await ensurePresets(tx, companyId);

      const nameKey = normalizeOptionName(name);

      if (await tx.optionItem.findFirst({ where: { kind, nameKey } })) {
        throw new OptionError('DUPLICATE');
      }

      const { _count: count, _max: max } = await tx.optionItem.aggregate({
        where: { kind },
        _count: { _all: true },
        _max: { sortOrder: true },
      });

      if (count._all >= OPTION_MAX_PER_KIND) {
        throw new OptionError('LIMIT');
      }

      try {
        return toItem(
          await tx.optionItem.create({
            data: { companyId, kind, name, nameKey, sortOrder: (max.sortOrder ?? -1) + 1 },
          }),
        );
      } catch (error) {
        throw isUniqueViolation(error) ? new OptionError('DUPLICATE') : error;
      }
    }),

  update: (companyId, id, { name, isActive }) =>
    withCompany(app, companyId, async (tx) => {
      // 다른 회사의 항목은 RLS 때문에 보이지 않아 없는 것과 같은 응답이 됨
      const current = await tx.optionItem.findFirst({ where: { id } });

      if (!current) {
        throw new OptionError('NOT_FOUND');
      }

      const nameKey = name === undefined ? undefined : normalizeOptionName(name);

      if (nameKey !== undefined) {
        const same = await tx.optionItem.findFirst({
          where: { kind: current.kind, nameKey, NOT: { id } },
        });

        if (same) {
          throw new OptionError('DUPLICATE');
        }
      }

      try {
        return toItem(
          await tx.optionItem.update({
            where: { companyId_id: { companyId, id } },
            data: { name, nameKey, isActive },
          }),
        );
      } catch (error) {
        throw isUniqueViolation(error) ? new OptionError('DUPLICATE') : error;
      }
    }),

  reorder: (companyId, kind, ids) =>
    withCompany(app, companyId, async (tx) => {
      const rows = await tx.optionItem.findMany({ where: { kind }, select: { id: true } });
      const known = new Set(rows.map((row) => row.id));

      // 일부만 보내거나 중복·남의 항목이 섞이면 순서가 꼬이므로 거부
      if (
        new Set(ids).size !== ids.length ||
        ids.length !== known.size ||
        ids.some((id) => !known.has(id))
      ) {
        throw new OptionError('ORDER_MISMATCH');
      }

      for (const [index, id] of ids.entries()) {
        await tx.optionItem.update({
          where: { companyId_id: { companyId, id } },
          data: { sortOrder: index },
        });
      }
    }),
});
