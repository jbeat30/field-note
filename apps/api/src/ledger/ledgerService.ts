import {
  summarizeLedger,
  type LedgerEntriesResponse,
  type LedgerEntry,
  type LedgerEntryCreate,
  type LedgerEntryListQuery,
  type LedgerEntryUpdate,
  type LedgerKind,
  type LedgerSummary,
  type LedgerSummaryQuery,
  type OptionKind,
  VALIDATION_MESSAGES,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class LedgerError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[ledger.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type RemovedLedgerEntry = {
  projectId: string;
  kind: string;
  entryDate: string;
  amount: number;
  content: string | null;
};

export type LedgerService = {
  create: (
    companyId: string,
    userId: string,
    projectId: string,
    input: LedgerEntryCreate,
  ) => Promise<LedgerEntry>;
  list: (
    companyId: string,
    projectId: string,
    query: LedgerEntryListQuery,
  ) => Promise<LedgerEntriesResponse>;
  // 지출 합계·수입 합계·분류별 합계 (내역과 같은 필터)
  summary: (
    companyId: string,
    projectId: string,
    query: LedgerSummaryQuery,
  ) => Promise<LedgerSummary>;
  update: (companyId: string, id: string, input: LedgerEntryUpdate) => Promise<LedgerEntry>;
  // 소프트 삭제, 삭제한 기록의 요약(활동 기록용) 반환
  remove: (companyId: string, id: string) => Promise<RemovedLedgerEntry>;
};

type EntryRow = Prisma.LedgerEntryGetPayload<object>;

const asDate = (value: string) => new Date(`${value}T00:00:00Z`);
const isoDate = (value: Date) => value.toISOString().slice(0, 10);

// 구분마다 쓰는 분류 목록이 다름 (지출은 지출 분류, 수입은 수입 분류)
const CATEGORY_KIND: Record<LedgerKind, OptionKind> = {
  EXPENSE: 'EXPENSE_CATEGORY',
  INCOME: 'INCOME_CATEGORY',
};

const toEntry = (row: EntryRow): LedgerEntry => ({
  id: row.id,
  projectId: row.projectId,
  entryDate: isoDate(row.entryDate),
  kind: row.kind,
  categoryId: row.categoryId,
  amount: Number(row.amount),
  partnerId: row.partnerId,
  content: row.content,
  documentId: row.documentId,
  changeWorkId: row.changeWorkId,
  createdBy: row.createdBy,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const encodeCursor = (row: EntryRow) =>
  Buffer.from(JSON.stringify([isoDate(row.entryDate), row.id])).toString('base64url');

const decodeCursor = (cursor: string): { entryDate: Date; id: string } => {
  try {
    const [entryDate, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as [
      string,
      string,
    ];
    const date = asDate(entryDate);

    if (Number.isNaN(date.getTime()) || typeof id !== 'string') {
      throw new Error('형식 오류');
    }

    return { entryDate: date, id };
  } catch {
    throw new LedgerError('INVALID', {
      path: 'query.cursor',
      message: VALIDATION_MESSAGES.LIST_CURSOR_INVALID,
    });
  }
};

// 내역과 합계가 같은 조건을 쓰도록 한곳에서 생성
const filterOf = (
  projectId: string,
  query: Pick<LedgerSummaryQuery, 'kind' | 'categoryId' | 'from' | 'to'> & { date?: string },
): Prisma.LedgerEntryWhereInput => ({
  projectId,
  deletedAt: null,
  kind: query.kind,
  categoryId: query.categoryId,
  entryDate: query.date
    ? asDate(query.date)
    : {
        gte: query.from ? asDate(query.from) : undefined,
        lte: query.to ? asDate(query.to) : undefined,
      },
});

/**
 * @description 지출·수입 기록 서비스 (앱 계정으로 자기 회사 범위에서만 처리), 프로젝트에서 나간 돈과 가끔 생기는 수입만 적음 (08 문서 §6)
 * 계약 금액·청구·입금 관리와 회계·세금·급여는 범위 밖
 * @param app 앱 계정 Prisma 클라이언트
 * @param now 현재 시각 (소프트 삭제 시각 기록용)
 * @returns 지출·수입 기록 서비스
 */
export const createLedgerService = (
  app: PrismaClient,
  now: () => Date = () => new Date(),
): LedgerService => {
  const requireProject = async (tx: Prisma.TransactionClient, projectId: string) => {
    if (!(await tx.project.findFirst({ where: { id: projectId } }))) {
      throw new LedgerError('NOT_FOUND');
    }
  };

  // 기록 한 건의 참조(분류·업체·증빙 문서·추가 공사)가 이 회사·이 프로젝트에서 쓸 수 있는지 확인
  const checkReferences = async (
    tx: Prisma.TransactionClient,
    projectId: string,
    ref: {
      kind: LedgerKind;
      categoryId?: string | null;
      partnerId?: string | null;
      documentId?: string | null;
      changeWorkId?: string | null;
    },
  ) => {
    if (
      ref.categoryId &&
      !(await tx.optionItem.findFirst({
        where: { id: ref.categoryId, kind: CATEGORY_KIND[ref.kind] },
      }))
    ) {
      throw new LedgerError('INVALID', {
        path: 'body.categoryId',
        message: VALIDATION_MESSAGES.CATEGORY_NOT_SELECTABLE,
      });
    }

    if (ref.partnerId && !(await tx.partner.findFirst({ where: { id: ref.partnerId } }))) {
      throw new LedgerError('INVALID', {
        path: 'body.partnerId',
        message: VALIDATION_MESSAGES.PARTNER_NOT_SELECTABLE,
      });
    }

    if (
      ref.documentId &&
      !(await tx.document.findFirst({
        where: { id: ref.documentId, projectId, deletedAt: null },
      }))
    ) {
      throw new LedgerError('INVALID', {
        path: 'body.documentId',
        message: VALIDATION_MESSAGES.LEDGER_DOCUMENT_OTHER_PROJECT,
      });
    }

    if (
      ref.changeWorkId &&
      !(await tx.changeWork.findFirst({ where: { id: ref.changeWorkId, projectId } }))
    ) {
      throw new LedgerError('INVALID', {
        path: 'body.changeWorkId',
        message: VALIDATION_MESSAGES.LEDGER_CHANGE_WORK_OTHER_PROJECT,
      });
    }
  };

  const findLive = async (tx: Prisma.TransactionClient, id: string) => {
    const row = await tx.ledgerEntry.findFirst({ where: { id, deletedAt: null } });

    if (!row) {
      throw new LedgerError('NOT_FOUND');
    }

    return row;
  };

  return {
    create: (companyId, userId, projectId, input) =>
      withCompany(app, companyId, async (tx) => {
        await requireProject(tx, projectId);
        await checkReferences(tx, projectId, input);

        return toEntry(
          await tx.ledgerEntry.create({
            data: {
              companyId,
              projectId,
              entryDate: asDate(input.entryDate),
              kind: input.kind,
              categoryId: input.categoryId,
              amount: input.amount,
              partnerId: input.partnerId,
              content: input.content,
              documentId: input.documentId,
              changeWorkId: input.changeWorkId,
              createdBy: userId,
            },
          }),
        );
      }),

    list: async (companyId, projectId, query) => {
      const cursor = query.cursor ? decodeCursor(query.cursor) : null;
      const rows = await withCompany(app, companyId, async (tx) => {
        await requireProject(tx, projectId);

        return tx.ledgerEntry.findMany({
          where: {
            ...filterOf(projectId, query),
            ...(cursor
              ? {
                  OR: [
                    { entryDate: { lt: cursor.entryDate } },
                    { entryDate: cursor.entryDate, id: { lt: cursor.id } },
                  ],
                }
              : {}),
          },
          orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
          // 다음 페이지가 있는지 알기 위해 한 건 더 읽음
          take: query.limit + 1,
        });
      });
      const page = rows.slice(0, query.limit);

      return {
        items: page.map(toEntry),
        nextCursor: rows.length > query.limit ? encodeCursor(page[page.length - 1]!) : null,
      };
    },

    summary: (companyId, projectId, query) =>
      withCompany(app, companyId, async (tx) => {
        await requireProject(tx, projectId);

        const rows = await tx.ledgerEntry.findMany({
          where: filterOf(projectId, query),
          select: { kind: true, categoryId: true, amount: true },
        });

        return summarizeLedger(rows.map((row) => ({ ...row, amount: Number(row.amount) })));
      }),

    update: (companyId, id, input) =>
      withCompany(app, companyId, async (tx) => {
        const current = await findLive(tx, id);
        const kind = input.kind ?? current.kind;
        // 구분이 바뀌는데 새 분류가 없으면 이전 구분의 분류는 사용 불가이므로 분류 비움
        const categoryId =
          input.categoryId !== undefined
            ? input.categoryId
            : kind !== current.kind
              ? null
              : undefined;

        // 바뀌지 않은 연결은 다시 검사하지 않음 (예전에 연결한 문서가 지워졌어도 다른 곳을 고칠 수 있게)
        await checkReferences(tx, current.projectId, {
          kind,
          categoryId,
          partnerId: input.partnerId,
          documentId: input.documentId,
          changeWorkId: input.changeWorkId,
        });

        return toEntry(
          await tx.ledgerEntry.update({
            where: { companyId_id: { companyId, id } },
            data: {
              entryDate: input.entryDate ? asDate(input.entryDate) : undefined,
              kind: input.kind,
              categoryId,
              amount: input.amount,
              partnerId: input.partnerId,
              content: input.content,
              documentId: input.documentId,
              changeWorkId: input.changeWorkId,
            },
          }),
        );
      }),

    remove: (companyId, id) =>
      withCompany(app, companyId, async (tx) => {
        const row = await findLive(tx, id);

        await tx.ledgerEntry.update({
          where: { companyId_id: { companyId, id } },
          data: { deletedAt: now() },
        });

        return {
          projectId: row.projectId,
          kind: row.kind,
          entryDate: isoDate(row.entryDate),
          amount: Number(row.amount),
          content: row.content,
        };
      }),
  };
};
