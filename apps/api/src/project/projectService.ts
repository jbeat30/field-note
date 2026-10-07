import {
  formatProjectCode,
  todayInSeoul,
  type ProjectCreate,
  type ProjectDetail,
  type ProjectListQuery,
  type ProjectSummary,
  type ProjectUpdate,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

type Clock = () => Date;

export class ProjectError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[project.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type ProjectService = {
  // 목록 (현장 연락처·출입 메모·계약일·메모 제외)
  list: (companyId: string, query: ProjectListQuery) => Promise<ProjectSummary[]>;
  get: (companyId: string, id: string) => Promise<ProjectDetail>;
  // 등록: 코드를 자동으로 붙이고 상태는 '예정'
  create: (companyId: string, input: ProjectCreate) => Promise<ProjectDetail>;
  // 수정: 코드·상태는 바꿀 수 없음
  update: (companyId: string, id: string, input: ProjectUpdate) => Promise<ProjectDetail>;
};

type Row = Prisma.ProjectGetPayload<{ include: { trades: { select: { tradeId: true } } } }>;

// DATE 컬럼은 시간대 없이 날짜만 다루므로 UTC 자정으로 넣고 읽을 때 날짜 부분만 사용
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const fromDate = (value: Date) => value.toISOString().slice(0, 10);

const toSummary = (row: Row): ProjectSummary => ({
  id: row.id,
  code: row.code,
  name: row.name,
  status: row.status,
  siteName: row.siteName,
  clientId: row.clientId,
  managerId: row.managerId,
  tradeIds: row.trades.map((trade) => trade.tradeId).sort(),
  plannedStart: fromDate(row.plannedStart),
  plannedEnd: fromDate(row.plannedEnd),
});

const toDetail = (row: Row): ProjectDetail => ({
  ...toSummary(row),
  siteAddress: row.siteAddress,
  siteMapUrl: row.siteMapUrl,
  siteContactName: row.siteContactName,
  siteContactPhone: row.siteContactPhone,
  accessMemo: row.accessMemo,
  contractDate: fromDate(row.contractDate),
  memo: row.memo,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const invalid = (path: string, message: string) => new ProjectError('INVALID', { path, message });

const INCLUDE_TRADES = { trades: { select: { tradeId: true } } } as const;

// 코드의 (연도, 순번)을 숫자로 읽어 정렬 (문자열 비교는 2026-999 뒤에 2026-1000이 와서 틀림)
const codeOrder = (code: string): [number, number] => {
  const [year, sequence] = code.split('-');

  return [Number(year), Number(sequence)];
};

// 고객은 명부의 '고객' 구분만 고를 수 있다. 숨긴 업체는 새로 고를 수 없지만 이미 쓰고 있다면 유지할 수 있다
const assertClient = async (tx: Prisma.TransactionClient, id: string, currentId: string | null) => {
  const partner = await tx.partner.findFirst({ where: { id, kind: 'CLIENT' } });

  if (!partner) {
    throw invalid('body.clientId', '선택할 수 없는 고객입니다');
  }

  if (!partner.isActive && id !== currentId) {
    throw invalid('body.clientId', '숨긴 고객은 새로 고를 수 없습니다');
  }
};

// 담당자는 같은 회사의 직원이며 퇴사한 직원은 새로 맡길 수 없다 (이미 맡고 있다면 유지)
const assertManager = async (
  tx: Prisma.TransactionClient,
  id: string,
  currentId: string | null,
) => {
  const employee = await tx.employee.findFirst({ where: { id } });

  if (!employee) {
    throw invalid('body.managerId', '선택할 수 없는 담당자입니다');
  }

  if (employee.status === 'LEFT' && id !== currentId) {
    throw invalid('body.managerId', '퇴사한 직원은 담당자로 지정할 수 없습니다');
  }
};

// 공종은 선택 목록의 '공종' 항목만 고를 수 있고, 숨긴 항목은 이미 쓰고 있을 때만 유지할 수 있다
const assertTrades = async (
  tx: Prisma.TransactionClient,
  ids: string[],
  currentIds: ReadonlySet<string>,
) => {
  if (new Set(ids).size !== ids.length) {
    throw invalid('body.tradeIds', '같은 공종을 두 번 고를 수 없습니다');
  }

  const found = await tx.optionItem.findMany({ where: { id: { in: ids }, kind: 'TRADE' } });

  if (found.length !== ids.length) {
    throw invalid('body.tradeIds', '선택할 수 없는 공종이 있습니다');
  }

  if (found.some((item) => !item.isActive && !currentIds.has(item.id))) {
    throw invalid('body.tradeIds', '숨긴 공종은 새로 고를 수 없습니다');
  }
};

/**
 * @description 프로젝트 서비스 (앱 계정으로 자기 회사 범위에서만 조회·수정, 삭제하지 않음)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param now 시계 (코드의 연도 판정용)
 * @returns 프로젝트 서비스
 */
export const createProjectService = (
  app: PrismaClient,
  now: Clock = () => new Date(),
): ProjectService => ({
  list: (companyId, { status, clientId, managerId, tradeId, from, to, q, sort = 'recent' }) =>
    withCompany(app, companyId, async (tx) => {
      const rows = await tx.project.findMany({
        where: {
          status,
          clientId,
          managerId,
          trades: tradeId ? { some: { tradeId } } : undefined,
          // 조회 기간과 겹치는 프로젝트 (시작 ≤ 조회 끝, 종료 ≥ 조회 시작)
          plannedEnd: from ? { gte: toDate(from) } : undefined,
          plannedStart: to ? { lte: toDate(to) } : undefined,
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { code: { contains: q, mode: 'insensitive' } },
                  { siteName: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: INCLUDE_TRADES,
      });

      const byRecent = (a: Row, b: Row) => {
        const [yearA, seqA] = codeOrder(a.code);
        const [yearB, seqB] = codeOrder(b.code);

        return yearB - yearA || seqB - seqA;
      };

      return rows
        .sort((a, b) => {
          if (sort === 'endDate') {
            return a.plannedEnd.getTime() - b.plannedEnd.getTime() || byRecent(a, b);
          }

          if (sort === 'name') {
            return a.name.localeCompare(b.name, 'ko') || byRecent(a, b);
          }

          return byRecent(a, b);
        })
        .map(toSummary);
    }),

  get: (companyId, id) =>
    withCompany(app, companyId, async (tx) => {
      // 다른 회사의 프로젝트는 RLS 때문에 보이지 않아 없는 것과 같은 응답이 됨
      const row = await tx.project.findFirst({ where: { id }, include: INCLUDE_TRADES });

      if (!row) {
        throw new ProjectError('NOT_FOUND');
      }

      return toDetail(row);
    }),

  create: (companyId, input) =>
    withCompany(app, companyId, async (tx) => {
      const tradeIds = input.tradeIds ?? [];

      await assertClient(tx, input.clientId, null);
      await assertManager(tx, input.managerId, null);
      await assertTrades(tx, tradeIds, new Set());

      // 코드 번호는 한 문장으로 원자적으로 올려 동시에 등록해도 겹치지 않음 (실패하면 번호도 함께 되돌아감)
      const year = Number(todayInSeoul(now()).slice(0, 4));
      const [sequence] = await tx.$queryRaw<{ last_number: number }[]>`
        INSERT INTO project_code_sequences (company_id, year, last_number)
        VALUES (${companyId}::uuid, ${year}, 1)
        ON CONFLICT (company_id, year) DO UPDATE SET last_number = project_code_sequences.last_number + 1
        RETURNING last_number`;

      if (!sequence) {
        throw new Error('[project.service] 코드 번호를 만들지 못함');
      }

      const created = await tx.project.create({
        data: {
          companyId,
          code: formatProjectCode(year, sequence.last_number),
          name: input.name,
          siteName: input.siteName,
          siteAddress: input.siteAddress ?? null,
          siteMapUrl: input.siteMapUrl ?? null,
          siteContactName: input.siteContactName ?? null,
          siteContactPhone: input.siteContactPhone ?? null,
          accessMemo: input.accessMemo || null,
          clientId: input.clientId,
          managerId: input.managerId,
          contractDate: toDate(input.contractDate),
          plannedStart: toDate(input.plannedStart),
          plannedEnd: toDate(input.plannedEnd),
          memo: input.memo || null,
        },
      });

      // 복합 키 관계는 중첩 생성을 쓸 수 없어 연결 행을 따로 넣음 (같은 트랜잭션)
      await tx.projectTrade.createMany({
        data: tradeIds.map((tradeId) => ({ companyId, projectId: created.id, tradeId })),
      });

      return toDetail({ ...created, trades: tradeIds.map((tradeId) => ({ tradeId })) });
    }),

  update: (companyId, id, input) =>
    withCompany(app, companyId, async (tx) => {
      const current = await tx.project.findFirst({ where: { id }, include: INCLUDE_TRADES });

      if (!current) {
        throw new ProjectError('NOT_FOUND');
      }

      if (input.clientId !== undefined) {
        await assertClient(tx, input.clientId, current.clientId);
      }

      if (input.managerId !== undefined) {
        await assertManager(tx, input.managerId, current.managerId);
      }

      const currentTradeIds = new Set(current.trades.map((trade) => trade.tradeId));

      if (input.tradeIds !== undefined) {
        await assertTrades(tx, input.tradeIds, currentTradeIds);
      }

      // 한쪽 날짜만 바꿔도 합친 값으로 순서를 확인
      const plannedStart = input.plannedStart ?? fromDate(current.plannedStart);
      const plannedEnd = input.plannedEnd ?? fromDate(current.plannedEnd);

      if (plannedStart > plannedEnd) {
        throw invalid('body.plannedEnd', '종료 예정일은 시작 예정일보다 빠를 수 없습니다');
      }

      if (input.tradeIds !== undefined) {
        await tx.projectTrade.deleteMany({
          where: { projectId: id, tradeId: { notIn: input.tradeIds } },
        });
        await tx.projectTrade.createMany({
          data: input.tradeIds
            .filter((tradeId) => !currentTradeIds.has(tradeId))
            .map((tradeId) => ({ companyId, projectId: id, tradeId })),
          skipDuplicates: true,
        });
      }

      const updated = await tx.project.update({
        where: { companyId_id: { companyId, id } },
        data: {
          name: input.name,
          siteName: input.siteName,
          siteAddress: input.siteAddress,
          siteMapUrl: input.siteMapUrl,
          siteContactName: input.siteContactName,
          siteContactPhone: input.siteContactPhone,
          accessMemo: input.accessMemo === undefined ? undefined : input.accessMemo || null,
          clientId: input.clientId,
          managerId: input.managerId,
          contractDate: input.contractDate ? toDate(input.contractDate) : undefined,
          plannedStart: input.plannedStart ? toDate(input.plannedStart) : undefined,
          plannedEnd: input.plannedEnd ? toDate(input.plannedEnd) : undefined,
          memo: input.memo === undefined ? undefined : input.memo || null,
        },
        include: INCLUDE_TRADES,
      });

      return toDetail(updated);
    }),
});
