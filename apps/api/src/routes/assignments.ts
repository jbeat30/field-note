import {
  assignmentCancelSchema,
  assignmentCreateSchema,
  assignmentListQuerySchema,
  assignmentParamsSchema,
  assignmentSchema,
  assignmentUpdateSchema,
  assignmentsResponseSchema,
  projectParamsSchema,
  type AssignmentCancel,
  type AssignmentCreate,
  type AssignmentListQuery,
  type AssignmentUpdate,
} from '@field-note/shared';

import { AssignmentError, type AssignmentService } from '../assignment/assignmentService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof AssignmentError)) {
    return error;
  }

  return error.code === 'NOT_FOUND'
    ? new AppError('NOT_FOUND')
    : new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 투입 라우트 (프로젝트 아래). 회사 ID는 세션에서만 얻는다. 삭제 API는 없고 취소 표시만 한다
 * @param registry 라우트 등록소
 * @param assignments 투입 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerAssignmentRoutes = (
  registry: RouteRegistry,
  assignments?: AssignmentService,
) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, assignments ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/projects/{id}/assignments',
      summary: '프로젝트 투입 목록 (같은 날 다른 프로젝트 겹침·휴직·퇴사 경고 포함)',
      auth: 'required',
      request: { params: projectParamsSchema, query: assignmentListQuerySchema },
      response: { status: 200, schema: assignmentsResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return {
          items: await assignments!.list(
            auth!.companyId,
            (params as { id: string }).id,
            (query as AssignmentListQuery).includeCancelled === 'true',
          ),
        };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/projects/{id}/assignments',
      summary: '투입 등록 (프로젝트 기간 안, 퇴사 직원 불가, 중단 중에는 관리자 확인 필요)',
      auth: 'required',
      request: { params: projectParamsSchema, body: assignmentCreateSchema },
      response: { status: 201, schema: assignmentSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await assignments!.create(
          auth!.companyId,
          (params as { id: string }).id,
          body as AssignmentCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/projects/{id}/assignments/{assignmentId}',
      summary: '투입 기간·계획 공수 수정',
      auth: 'required',
      request: { params: assignmentParamsSchema, body: assignmentUpdateSchema },
      response: { status: 200, schema: assignmentSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      const { id, assignmentId } = params as { id: string; assignmentId: string };

      try {
        return await assignments!.update(
          auth!.companyId,
          id,
          assignmentId,
          body as AssignmentUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/projects/{id}/assignments/{assignmentId}/cancel',
      summary: '투입 취소 (지우지 않고 취소 표시만 남김)',
      auth: 'required',
      request: { params: assignmentParamsSchema, body: assignmentCancelSchema },
      response: { status: 200, schema: assignmentSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      const { id, assignmentId } = params as { id: string; assignmentId: string };

      try {
        return await assignments!.cancel(
          auth!.companyId,
          id,
          assignmentId,
          body as AssignmentCancel,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
