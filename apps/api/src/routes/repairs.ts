import {
  projectParamsSchema,
  repairCreateSchema,
  repairLinkParamsSchema,
  repairLinkSchema,
  repairListQuerySchema,
  repairParamsSchema,
  repairRequestDetailSchema,
  repairRequestsResponseSchema,
  repairTransitionSchema,
  repairUpdateSchema,
  repairUsageSchema,
  type RepairCreate,
  type RepairLink,
  type RepairListQuery,
  type RepairTransition,
  type RepairUpdate,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { RepairError, type RepairService } from '../repair/repairService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof RepairError)) {
    return error;
  }

  return error.code === 'NOT_FOUND'
    ? new AppError('NOT_FOUND')
    : new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 보수 요청 라우트, 회사 ID·작성자는 세션에서만 획득, 삭제 API 없이 상태(접수·처리 중·보류·완료)와 이력으로 표현
 * @param registry 라우트 등록소
 * @param repairs 보수 요청 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerRepairRoutes = (registry: RouteRegistry, repairs?: RepairService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, repairs ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/projects/{id}/repair-requests',
      summary: '프로젝트 보수 요청 목록 (번호 큰 것이 먼저, 상태 필터)',
      auth: 'required',
      request: { params: projectParamsSchema, query: repairListQuerySchema },
      response: { status: 200, schema: repairRequestsResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return {
          items: await repairs!.list(
            auth!.companyId,
            (params as { id: string }).id,
            (query as RepairListQuery).status,
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
      path: '/projects/{id}/repair-requests',
      summary: '보수 요청 접수 (보증 중인 프로젝트에서만, 접수 상태로 시작)',
      auth: 'required',
      request: { params: projectParamsSchema, body: repairCreateSchema },
      response: { status: 201, schema: repairRequestDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await repairs!.create(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as RepairCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{id}/after-service-usage',
      summary: '사후 작업으로 쓴 공수·자재 (사후 작업 표시가 된 작업 내역·자재 기록 합계)',
      auth: 'required',
      request: { params: projectParamsSchema },
      response: { status: 200, schema: repairUsageSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await repairs!.afterServiceUsage(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/repair-requests/{id}',
      summary: '보수 요청 상세 (상태 이력, 연결한 작업 내역·자재 기록, 쓴 공수·자재 포함)',
      auth: 'required',
      request: { params: repairParamsSchema },
      response: { status: 200, schema: repairRequestDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await repairs!.get(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/repair-requests/{id}',
      summary: '보수 요청 수정 (완료 전까지만, 접수일·요청자·내용·위치)',
      auth: 'required',
      request: { params: repairParamsSchema, body: repairUpdateSchema },
      response: { status: 200, schema: repairRequestDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await repairs!.update(
          auth!.companyId,
          (params as { id: string }).id,
          body as RepairUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/repair-requests/{id}/status',
      summary: '보수 요청 상태 변경 (보류·완료 되돌리기는 사유 필수, 이력에 남음)',
      auth: 'required',
      request: { params: repairParamsSchema, body: repairTransitionSchema },
      response: { status: 200, schema: repairRequestDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await repairs!.transition(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as RepairTransition,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/repair-requests/{id}/links',
      summary:
        '사후 작업 연결 (사후 작업으로 표시한 같은 프로젝트의 저장된 작업 내역 또는 자재 기록)',
      auth: 'required',
      request: { params: repairParamsSchema, body: repairLinkSchema },
      response: { status: 200, schema: repairRequestDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await repairs!.link(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as RepairLink,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'delete',
      path: '/repair-requests/{id}/links/{linkId}',
      summary: '사후 작업 연결 해제 (연결 기록은 남고 해제 시각만 기록)',
      auth: 'required',
      request: { params: repairLinkParamsSchema },
      response: { status: 200, schema: repairRequestDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      const { id, linkId } = params as { id: string; linkId: string };

      try {
        return await repairs!.unlink(auth!.companyId, id, linkId);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
