import {
  auditSummary,
  auditTargetType,
  type AuditLog,
  type AuditLogListQuery,
  type AuditLogsResponse,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class AuditError extends Error {
  constructor(readonly detail: { path: string; message: string }) {
    super(`[audit.service] INVALID ${detail.path}`);
  }
}

export type AuditService = {
  // 감사 기록 조회 (최근순 커서 방식, 행위·날짜 범위로 거름). 조회만 하고 수정·삭제는 없다
  list: (companyId: string, query: AuditLogListQuery) => Promise<AuditLogsResponse>;
};

type Row = Prisma.AuditLogGetPayload<object>;

const encodeCursor = (row: Row) =>
  Buffer.from(JSON.stringify([row.createdAt.toISOString(), row.id])).toString('base64url');

const decodeCursor = (cursor: string): { createdAt: Date; id: string } => {
  try {
    const [createdAt, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as [
      string,
      string,
    ];
    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime()) || typeof id !== 'string') {
      throw new Error('형식 오류');
    }

    return { createdAt: date, id };
  } catch {
    throw new AuditError({ path: 'query.cursor', message: '목록 위치가 올바르지 않습니다' });
  }
};

// 서울 기준 날짜의 시작 시각 (UTC+9)
const seoulStart = (date: string) => new Date(`${date}T00:00:00+09:00`);

const nextDay = (date: string) => new Date(seoulStart(date).getTime() + 86_400_000);

/**
 * @description 감사 기록 조회 서비스 (앱 계정으로 자기 회사 범위에서만 조회). 대상 이름은 조회할 때 찾아 붙이고
 * 대상이 지워졌으면 이름 없이 보여 준다 (기록은 대상과 외래 키로 묶이지 않음)
 * @param app 앱 계정 Prisma 클라이언트
 * @returns 감사 기록 서비스
 */
export const createAuditService = (app: PrismaClient): AuditService => ({
  list: async (companyId, query) => {
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;

    return withCompany(app, companyId, async (tx) => {
      const rows = await tx.auditLog.findMany({
        where: {
          action: query.action,
          createdAt: {
            ...(query.from ? { gte: seoulStart(query.from) } : {}),
            ...(query.to ? { lt: nextDay(query.to) } : {}),
          },
          ...(cursor
            ? {
                AND: [
                  {
                    OR: [
                      { createdAt: { lt: cursor.createdAt } },
                      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                    ],
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        // 다음 페이지가 있는지 알기 위해 한 건 더 읽음
        take: query.limit + 1,
      });
      const page = rows.slice(0, query.limit);
      const idsOf = (type: string) => [
        ...new Set(
          page
            .filter((row) => auditTargetType(row.action, row.detail) === type)
            .map((row) => row.targetId),
        ),
      ];
      const [actors, documents, employees, projects, company] = await Promise.all([
        tx.user.findMany({
          where: { id: { in: [...new Set(page.map((row) => row.actorId))] } },
          select: { id: true, displayName: true },
        }),
        tx.document.findMany({
          where: { id: { in: idsOf('DOCUMENT') } },
          select: { id: true, title: true },
        }),
        tx.employee.findMany({
          where: { id: { in: idsOf('EMPLOYEE') } },
          select: { id: true, name: true },
        }),
        tx.project.findMany({
          where: { id: { in: idsOf('PROJECT') } },
          select: { id: true, name: true },
        }),
        tx.company.findUnique({ where: { id: companyId }, select: { name: true } }),
      ]);
      const names = new Map<string, string>([
        ...documents.map((item) => [item.id, item.title] as const),
        ...employees.map((item) => [item.id, item.name] as const),
        ...projects.map((item) => [item.id, item.name] as const),
      ]);
      const actorNames = new Map(actors.map((item) => [item.id, item.displayName]));
      const items: AuditLog[] = page.map((row) => {
        const targetType = auditTargetType(row.action, row.detail);

        return {
          id: row.id,
          action: row.action,
          actorId: row.actorId,
          actorName: actorNames.get(row.actorId) ?? '(알 수 없음)',
          targetType,
          targetId: row.targetId,
          targetName:
            targetType === 'COMPANY' ? (company?.name ?? null) : (names.get(row.targetId) ?? null),
          summary: auditSummary(row.action, row.detail),
          createdAt: row.createdAt.toISOString(),
        };
      });

      return {
        items,
        nextCursor: rows.length > query.limit ? encodeCursor(page[page.length - 1]!) : null,
      };
    });
  },
});
