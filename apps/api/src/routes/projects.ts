import {
  projectCreateSchema,
  projectDetailSchema,
  projectListQuerySchema,
  projectParamsSchema,
  projectStatusHistorySchema,
  projectTransitionSchema,
  projectUpdateSchema,
  projectsResponseSchema,
  type ProjectCreate,
  type ProjectListQuery,
  type ProjectTransition,
  type ProjectUpdate,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { ProjectError, type ProjectService } from '../project/projectService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof ProjectError)) {
    return error;
  }

  return error.code === 'NOT_FOUND'
    ? new AppError('NOT_FOUND')
    : new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 프로젝트 라우트. 회사 ID는 세션에서만 얻는다. 삭제 API는 없다 (취소·종료는 상태 전환으로, P1-6)
 * @param registry 라우트 등록소
 * @param projects 프로젝트 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerProjectRoutes = (registry: RouteRegistry, projects?: ProjectService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, projects ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/projects',
      summary: '프로젝트 목록 (상태·고객·담당자·공종·기간·검색 필터와 정렬)',
      auth: 'required',
      request: { query: projectListQuerySchema },
      response: { status: 200, schema: projectsResponseSchema },
    },
    async ({ auth, query }) => ({
      items: await projects!.list(auth!.companyId, query as ProjectListQuery),
    }),
  );

  add(
    {
      method: 'post',
      path: '/projects',
      summary: '프로젝트 등록 (코드 자동 번호, 상태는 예정)',
      auth: 'required',
      request: { body: projectCreateSchema },
      response: { status: 201, schema: projectDetailSchema },
    },
    async ({ auth, body }) => {
      try {
        return await projects!.create(auth!.companyId, body as ProjectCreate);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{id}',
      summary: '프로젝트 기본정보',
      auth: 'required',
      request: { params: projectParamsSchema },
      response: { status: 200, schema: projectDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await projects!.get(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/projects/{id}',
      summary: '프로젝트 기본정보 수정 (코드·상태는 바꿀 수 없음)',
      auth: 'required',
      request: { params: projectParamsSchema, body: projectUpdateSchema },
      response: { status: 200, schema: projectDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await projects!.update(
          auth!.companyId,
          (params as { id: string }).id,
          body as ProjectUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/projects/{id}/status',
      summary: '프로젝트 상태 전환 (예정 → 진행 → 중단·완료, 취소). 날짜·사유와 함께 이력에 남음',
      auth: 'required',
      request: { params: projectParamsSchema, body: projectTransitionSchema },
      response: { status: 200, schema: projectDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await projects!.transition(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as ProjectTransition,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{id}/status-history',
      summary: '프로젝트 상태 변경 이력 (최근이 맨 앞)',
      auth: 'required',
      request: { params: projectParamsSchema },
      response: { status: 200, schema: projectStatusHistorySchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return { items: await projects!.history(auth!.companyId, (params as { id: string }).id) };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
