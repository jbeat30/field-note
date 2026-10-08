import { searchQuerySchema, searchResponseSchema, type SearchQuery } from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { SearchError, type SearchService } from '../search/searchService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

/**
 * @description 통합 검색 라우트. 회사 ID는 세션에서만 얻는다
 * @param registry 라우트 등록소
 * @param search 검색 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerSearchRoutes = (registry: RouteRegistry, search?: SearchService) => {
  registry.add(
    {
      method: 'get',
      path: '/search',
      summary:
        '통합 검색 (프로젝트·직원·메모·자료·일지, 종류마다 최대 개수, projectId로 프로젝트 안에서만 검색)',
      auth: 'required',
      request: { query: searchQuerySchema },
      response: { status: 200, schema: searchResponseSchema },
      errors: ['NOT_FOUND'],
    },
    search
      ? async ({ auth, query }) => {
          try {
            return await search.search(auth!.companyId, query as SearchQuery);
          } catch (error) {
            throw error instanceof SearchError ? new AppError('NOT_FOUND') : error;
          }
        }
      : notImplemented,
  );
};
