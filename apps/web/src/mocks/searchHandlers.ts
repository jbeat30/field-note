import {
  makeSnippet,
  searchQuerySchema,
  type ErrorCode,
  type SearchGroup,
  type SearchHit,
  type SearchResponse,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';

import { listMockDocuments } from './documentHandlers';
import { listMockMemos } from './memoHandlers';
import { getCurrentAccount, getEmployees, getProjects, getWorkLogs } from './state';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
};

const TITLE_MAX = 40;

// 첫 줄을 제목으로 쓰되 너무 길면 줄임 (서버와 같은 규칙)
const firstLine = (text: string) => {
  const line = (text.split('\n').find((item) => item.trim()) ?? '').trim();

  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX)}…` : line;
};

const toGroup = (items: SearchHit[], limit: number): SearchGroup => ({
  items: items.slice(0, limit),
  hasMore: items.length > limit,
});

/**
 * @description 통합 검색 API 목업 핸들러 (서버와 같은 규칙: 대소문자 무시 부분 일치, 직원은 이름·직책만, 지운 메모·문서 제외, 프로젝트 안 검색은 메모·자료·일지만)
 * @param helpers 공통 오류 응답
 * @returns msw 핸들러 목록
 */
export const createSearchHandlers = ({ apiError }: Helpers) => [
  http.get('/api/v1/search', async ({ request }) => {
    await delay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = searchQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => ({
          path: ['query', ...issue.path].join('.'),
          message: issue.message,
        })),
      );
    }

    const { q, projectId, limit } = parsed.data;
    const projects = getProjects(account);

    if (projectId && !projects.some((project) => project.id === projectId))
      return apiError('NOT_FOUND');

    const needle = q.toLowerCase();
    const has = (value: string | null | undefined) =>
      Boolean(value?.toLowerCase().includes(needle));
    const nameOf = (id: string | null) =>
      id ? (projects.find((project) => project.id === id)?.name ?? null) : null;
    const place = (id: string | null) => ({ projectId: id, projectName: nameOf(id) });
    const inScope = (id: string | null) => !projectId || id === projectId;

    const response: SearchResponse = {
      q,
      projects: toGroup(
        projectId
          ? []
          : projects
              .filter(
                (project) =>
                  has(project.name) ||
                  has(project.code) ||
                  has(project.siteName) ||
                  has(project.siteAddress),
              )
              .map((project) => ({
                type: 'PROJECT' as const,
                id: project.id,
                title: project.name,
                snippet: `${project.code} · ${project.siteName}`,
                projectId: project.id,
                projectName: project.name,
                date: null,
                badge: null,
              })),
        limit,
      ),
      employees: toGroup(
        projectId
          ? []
          : getEmployees(account)
              .filter((employee) => has(employee.name) || has(employee.title))
              .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
              .map((employee) => ({
                type: 'EMPLOYEE' as const,
                id: employee.id,
                title: employee.name,
                snippet: employee.title ?? null,
                projectId: null,
                projectName: null,
                date: null,
                badge: employee.status === 'LEFT' ? ('LEFT' as const) : null,
              })),
        limit,
      ),
      memos: toGroup(
        listMockMemos(account)
          .filter((memo) => inScope(memo.projectId) && has(memo.content))
          .sort((a, b) => b.memoDate.localeCompare(a.memoDate) || b.id.localeCompare(a.id))
          .map((memo) => ({
            type: 'MEMO' as const,
            id: memo.id,
            title: firstLine(memo.content),
            snippet: makeSnippet(memo.content, q),
            ...place(memo.projectId),
            date: memo.memoDate,
            badge: null,
          })),
        limit,
      ),
      documents: toGroup(
        listMockDocuments(account)
          .filter((document) => inScope(document.projectId) && has(document.title))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map((document) => ({
            type: 'DOCUMENT' as const,
            id: document.id,
            title: document.title,
            snippet: null,
            ...place(document.projectId),
            date: document.updatedAt.slice(0, 10),
            badge: document.isSensitive ? ('SENSITIVE' as const) : null,
          })),
        limit,
      ),
      workLogs: toGroup(
        getWorkLogs(account)
          .filter(
            (log) =>
              inScope(log.projectId) && (has(log.content) || has(log.area) || has(log.notes)),
          )
          .sort((a, b) => b.workDate.localeCompare(a.workDate) || b.id.localeCompare(a.id))
          .map((log) => {
            const text = [log.content, log.area, log.notes].find((value) => has(value))!;

            return {
              type: 'WORK_LOG' as const,
              id: log.id,
              title: firstLine(log.content) || firstLine(text),
              snippet: makeSnippet(text, q),
              ...place(log.projectId),
              date: log.workDate,
              badge: null,
            };
          }),
        limit,
      ),
    };

    return HttpResponse.json(response);
  }),
];
