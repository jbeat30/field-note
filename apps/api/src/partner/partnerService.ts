import {
  PARTNER_KINDS,
  PARTNER_MAX_PER_COMPANY,
  normalizePartnerName,
  type PartnerCreate,
  type PartnerDetail,
  type PartnerListQuery,
  type PartnerSummary,
  type PartnerUpdate,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class PartnerError extends Error {
  constructor(readonly code: 'NOT_FOUND' | 'LIMIT' | 'DUPLICATE') {
    super(`[partner.service] ${code}`);
  }
}

export type PartnerService = {
  // 목록 (연락처·메모 제외). 구분 순서(고객 → 협력업체 → 공급처), 같은 구분 안에서는 이름순
  list: (companyId: string, query: PartnerListQuery) => Promise<PartnerSummary[]>;
  get: (companyId: string, id: string) => Promise<PartnerDetail>;
  create: (companyId: string, input: PartnerCreate) => Promise<PartnerDetail>;
  update: (companyId: string, id: string, input: PartnerUpdate) => Promise<PartnerDetail>;
};

type Row = Prisma.PartnerGetPayload<object>;

const toSummary = (row: Row): PartnerSummary => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  contactName: row.contactName,
  isActive: row.isActive,
});

const toDetail = (row: Row): PartnerDetail => ({
  ...toSummary(row),
  phone: row.phone,
  memo: row.memo,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

// 같은 상호가 동시에 들어오는 경우의 안전망 (사전 조회 이후 고유 제약에 걸림)
const isUniqueViolation = (error: unknown) =>
  error instanceof Error &&
  /unique|P2002|duplicate/i.test(`${error.message} ${(error as { code?: string }).code ?? ''}`);

/**
 * @description 고객·협력업체·자재 공급처 명부 서비스 (앱 계정으로 자기 회사 범위에서만 조회·수정, 삭제하지 않고 숨김 처리)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @returns 명부 서비스
 */
export const createPartnerService = (app: PrismaClient): PartnerService => ({
  list: (companyId, { kind, q }) =>
    withCompany(app, companyId, async (tx) => {
      const rows = await tx.partner.findMany({
        where: {
          kind,
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { contactName: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      });

      return rows
        .sort(
          (a, b) =>
            PARTNER_KINDS.indexOf(a.kind) - PARTNER_KINDS.indexOf(b.kind) ||
            a.name.localeCompare(b.name, 'ko') ||
            a.id.localeCompare(b.id),
        )
        .map(toSummary);
    }),

  get: (companyId, id) =>
    withCompany(app, companyId, async (tx) => {
      // 다른 회사의 업체는 RLS 때문에 보이지 않아 없는 것과 같은 응답이 됨
      const row = await tx.partner.findFirst({ where: { id } });

      if (!row) {
        throw new PartnerError('NOT_FOUND');
      }

      return toDetail(row);
    }),

  create: (companyId, input) =>
    withCompany(app, companyId, async (tx) => {
      if ((await tx.partner.count()) >= PARTNER_MAX_PER_COMPANY) {
        throw new PartnerError('LIMIT');
      }

      const nameKey = normalizePartnerName(input.name);

      if (await tx.partner.findFirst({ where: { kind: input.kind, nameKey } })) {
        throw new PartnerError('DUPLICATE');
      }

      try {
        return toDetail(
          await tx.partner.create({
            data: {
              companyId,
              kind: input.kind,
              name: input.name,
              nameKey,
              contactName: input.contactName ?? null,
              phone: input.phone ?? null,
              memo: input.memo || null,
            },
          }),
        );
      } catch (error) {
        throw isUniqueViolation(error) ? new PartnerError('DUPLICATE') : error;
      }
    }),

  update: (companyId, id, input) =>
    withCompany(app, companyId, async (tx) => {
      const current = await tx.partner.findFirst({ where: { id } });

      if (!current) {
        throw new PartnerError('NOT_FOUND');
      }

      const nameKey = input.name === undefined ? undefined : normalizePartnerName(input.name);

      if (
        nameKey !== undefined &&
        (await tx.partner.findFirst({ where: { kind: current.kind, nameKey, NOT: { id } } }))
      ) {
        throw new PartnerError('DUPLICATE');
      }

      try {
        return toDetail(
          await tx.partner.update({
            where: { companyId_id: { companyId, id } },
            data: {
              name: input.name,
              nameKey,
              contactName: input.contactName,
              phone: input.phone,
              memo: input.memo === undefined ? undefined : input.memo || null,
              isActive: input.isActive,
            },
          }),
        );
      } catch (error) {
        throw isUniqueViolation(error) ? new PartnerError('DUPLICATE') : error;
      }
    }),
});
