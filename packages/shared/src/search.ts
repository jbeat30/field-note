import { z } from 'zod';

// 통합 검색 (서비스 기획서 §14 "찾기"): 프로젝트·직원·메모·자료(문서)·일지를 한 검색창에서 찾는다.
// 검색 범위는 로그인한 회사 하나뿐이며, 직원의 연락처·생년월일·메모처럼 목록에서 가리는 개인정보는 검색 대상이 아니다 (§7.3)
export const SEARCH_HIT_TYPES = ['PROJECT', 'EMPLOYEE', 'MEMO', 'DOCUMENT', 'WORK_LOG'] as const;

export const searchHitTypeSchema = z.enum(SEARCH_HIT_TYPES);

export type SearchHitType = z.infer<typeof searchHitTypeSchema>;

export const SEARCH_HIT_TYPE_LABELS: Record<SearchHitType, string> = {
  PROJECT: '프로젝트',
  EMPLOYEE: '직원',
  MEMO: '메모',
  DOCUMENT: '자료',
  WORK_LOG: '일지',
};

export const SEARCH_QUERY_MAX_LENGTH = 50;
export const SEARCH_GROUP_DEFAULT_LIMIT = 5;
export const SEARCH_GROUP_MAX_LIMIT = 20;
export const SNIPPET_RADIUS = 30;

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, '검색어를 입력해 주세요')
    .max(SEARCH_QUERY_MAX_LENGTH, `검색어는 ${SEARCH_QUERY_MAX_LENGTH}자까지 입력할 수 있습니다`),
  // 프로젝트 안에서만 찾을 때 (메모·자료·일지만 검색)
  projectId: z.uuid().optional(),
  // 종류마다 보여 줄 최대 개수
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(SEARCH_GROUP_MAX_LIMIT)
    .default(SEARCH_GROUP_DEFAULT_LIMIT),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const SEARCH_BADGES = ['SENSITIVE', 'LEFT'] as const;

export const searchHitSchema = z.object({
  type: searchHitTypeSchema,
  id: z.uuid(),
  title: z.string(),
  // 검색어 주변 글 (일지·메모처럼 본문에서 찾았을 때)
  snippet: z.string().nullable(),
  projectId: z.uuid().nullable(),
  projectName: z.string().nullable(),
  // 메모 날짜·일지 작업일·문서 개정일 등 (YYYY-MM-DD)
  date: z.iso.date().nullable(),
  // 민감 자료, 퇴사한 직원처럼 눈에 띄게 알릴 표시
  badge: z.enum(SEARCH_BADGES).nullable(),
});

export type SearchHit = z.infer<typeof searchHitSchema>;

// 종류마다 개수 제한까지의 결과와, 제한 때문에 더 있는지 (더 있으면 검색어를 좁혀 달라고 안내)
export const searchGroupSchema = z.object({
  items: z.array(searchHitSchema),
  hasMore: z.boolean(),
});

export type SearchGroup = z.infer<typeof searchGroupSchema>;

export const searchResponseSchema = z.object({
  q: z.string(),
  projects: searchGroupSchema,
  employees: searchGroupSchema,
  memos: searchGroupSchema,
  documents: searchGroupSchema,
  workLogs: searchGroupSchema,
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

/**
 * @description 본문에서 검색어가 처음 나온 곳 주변만 잘라 보여 줌 (대소문자 무시). 앞뒤가 잘렸으면 말줄임표를 붙이고 줄바꿈은 공백으로 바꾼다
 * @param text 본문
 * @param query 검색어
 * @param radius 검색어 앞뒤로 남길 글자 수
 * @returns 잘라 낸 글 (검색어가 본문에 없으면 본문 앞부분)
 */
export const makeSnippet = (text: string, query: string, radius = SNIPPET_RADIUS) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  const index = flat.toLowerCase().indexOf(query.trim().toLowerCase());
  const start = index < 0 ? 0 : Math.max(0, index - radius);
  const end = Math.min(
    flat.length,
    (index < 0 ? 0 : index + query.trim().length) + radius * (index < 0 ? 2 : 1),
  );

  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
};

/**
 * @description LIKE 검색에서 와일드카드로 해석되는 글자(`%`, `_`)와 이스케이프 글자(`\`)를 일반 글자로 바꿈.
 * 사용자가 "100%"나 "A_B"를 찾을 때 모든 글자와 맞는 검색이 되지 않게 한다
 * @param text 사용자가 입력한 검색어
 * @returns 이스케이프한 검색어
 */
export const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');
