import {
  escapeLike,
  makeSnippet,
  type SearchGroup,
  type SearchHit,
  type SearchQuery,
  type SearchResponse,
} from '@field-note/shared';

import type { PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class SearchError extends Error {
  constructor(readonly code: 'NOT_FOUND') {
    super(`[search.service] ${code}`);
  }
}

export type SearchService = {
  // 프로젝트·직원·메모·자료·일지를 한 번에 찾음 (로그인한 회사 안에서만). projectId를 주면 그 프로젝트의 메모·자료·일지만
  search: (companyId: string, query: SearchQuery) => Promise<SearchResponse>;
};

const TITLE_MAX = 40;

// 첫 줄을 제목으로 쓰되 너무 길면 줄임 (메모·일지는 제목이 따로 없음)
const firstLine = (text: string) => {
  const line = (text.split('\n').find((item) => item.trim()) ?? '').trim();

  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX)}…` : line;
};

const isoDate = (value: Date) => value.toISOString().slice(0, 10);

// 종류마다 limit+1건을 읽어 더 있는지 알고 limit건만 돌려줌
const toGroup = (items: SearchHit[], limit: number): SearchGroup => ({
  items: items.slice(0, limit),
  hasMore: items.length > limit,
});

/**
 * @description 통합 검색 서비스 (앱 계정으로 자기 회사 범위에서만 조회하므로 다른 회사 결과는 나올 수 없다).
 * 지운(소프트 삭제) 메모·문서는 제외하고, 직원은 연락처·생년월일·메모가 아니라 이름·직책으로만 찾는다 (서비스 기획서 §7.3)
 * @param app 앱 계정 Prisma 클라이언트
 * @returns 검색 서비스
 */
export const createSearchService = (app: PrismaClient): SearchService => ({
  search: (companyId, { q, projectId, limit }) =>
    withCompany(app, companyId, async (tx) => {
      if (projectId && !(await tx.project.findFirst({ where: { id: projectId } }))) {
        throw new SearchError('NOT_FOUND');
      }

      const take = limit + 1;
      // 검색어의 %·_는 와일드카드가 아니라 일반 글자로 찾음
      const contains = { contains: escapeLike(q), mode: 'insensitive' } as const;

      const projects = projectId
        ? []
        : await tx.project.findMany({
            where: {
              OR: [
                { name: contains },
                { code: contains },
                { siteName: contains },
                { siteAddress: contains },
              ],
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take,
          });
      const employees = projectId
        ? []
        : await tx.employee.findMany({
            where: { OR: [{ name: contains }, { title: contains }] },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            take,
          });
      const memos = await tx.memo.findMany({
        where: { deletedAt: null, content: contains, projectId },
        orderBy: [{ memoDate: 'desc' }, { id: 'desc' }],
        take,
      });
      const documents = await tx.document.findMany({
        where: { deletedAt: null, title: contains, projectId },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take,
      });
      const workLogs = await tx.workLog.findMany({
        where: { projectId, OR: [{ content: contains }, { area: contains }, { notes: contains }] },
        orderBy: [{ workDate: 'desc' }, { id: 'desc' }],
        take,
      });

      // 결과에 붙일 프로젝트 이름
      const ids = [
        ...new Set(
          [...memos, ...documents, ...workLogs]
            .map((row) => row.projectId)
            .filter((id): id is string => id !== null),
        ),
      ];
      const names = new Map(
        (
          await tx.project.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
          })
        ).map((project) => [project.id, project.name]),
      );
      const place = (id: string | null) => ({
        projectId: id,
        projectName: id ? (names.get(id) ?? null) : null,
      });

      return {
        q,
        projects: toGroup(
          projects.map((row) => ({
            type: 'PROJECT' as const,
            id: row.id,
            title: row.name,
            snippet: `${row.code} · ${row.siteName}`,
            projectId: row.id,
            projectName: row.name,
            date: null,
            badge: null,
          })),
          limit,
        ),
        employees: toGroup(
          employees.map((row) => ({
            type: 'EMPLOYEE' as const,
            id: row.id,
            title: row.name,
            snippet: row.title,
            projectId: null,
            projectName: null,
            date: null,
            badge: row.status === 'LEFT' ? ('LEFT' as const) : null,
          })),
          limit,
        ),
        memos: toGroup(
          memos.map((row) => ({
            type: 'MEMO' as const,
            id: row.id,
            title: firstLine(row.content),
            snippet: makeSnippet(row.content, q),
            ...place(row.projectId),
            date: isoDate(row.memoDate),
            badge: null,
          })),
          limit,
        ),
        documents: toGroup(
          documents.map((row) => ({
            type: 'DOCUMENT' as const,
            id: row.id,
            title: row.title,
            snippet: null,
            ...place(row.projectId),
            date: isoDate(row.updatedAt),
            badge: row.isSensitive ? ('SENSITIVE' as const) : null,
          })),
          limit,
        ),
        workLogs: toGroup(
          workLogs.map((row) => {
            // 내용·구역·특이사항 중 검색어가 나온 곳을 발췌
            const text = [row.content, row.area, row.notes].find((value) =>
              value?.toLowerCase().includes(q.toLowerCase()),
            )!;

            return {
              type: 'WORK_LOG' as const,
              id: row.id,
              title: firstLine(row.content) || firstLine(text),
              snippet: makeSnippet(text, q),
              ...place(row.projectId),
              date: isoDate(row.workDate),
              badge: null,
            };
          }),
          limit,
        ),
      } satisfies SearchResponse;
    }),
});
