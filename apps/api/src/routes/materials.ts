import {
  materialBalanceResponseSchema,
  materialCreateSchema,
  materialListQuerySchema,
  materialParamsSchema,
  materialRecordBatchResponseSchema,
  materialRecordBatchSchema,
  materialRecordCreateSchema,
  materialRecordListQuerySchema,
  materialRecordParamsSchema,
  materialRecordSchema,
  materialRecordUpdateSchema,
  materialRecordsResponseSchema,
  materialSchema,
  materialUpdateSchema,
  materialsResponseSchema,
  projectFileParamsSchema,
  successResponseSchema,
  type MaterialCreate,
  type MaterialListQuery,
  type MaterialRecordBatch,
  type MaterialRecordCreate,
  type MaterialRecordListQuery,
  type MaterialRecordUpdate,
  type MaterialUpdate,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { MaterialError, type MaterialService } from '../material/materialService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof MaterialError)) {
    return error;
  }

  switch (error.code) {
    case 'NOT_FOUND':
      return new AppError('NOT_FOUND');
    case 'DUPLICATE':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.name', message: '같은 이름과 규격의 자재가 이미 있습니다' },
      ]);
    case 'LIMIT':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body', message: '자재는 회사마다 2000개까지 등록할 수 있습니다' },
      ]);
    case 'INVALID':
      return new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
  }
};

/**
 * @description 사용 자재 라우트. 회사 ID는 세션에서만 얻는다 (자재 목록 관리, 프로젝트별 기록, 잔량)
 * @param registry 라우트 등록소
 * @param materials 자재 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerMaterialRoutes = (registry: RouteRegistry, materials?: MaterialService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, materials ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/materials',
      summary: '자재 목록 (최근 기록한 자재가 먼저, 이름·규격 검색, 숨긴 자재는 기본 제외)',
      auth: 'required',
      request: { query: materialListQuerySchema },
      response: { status: 200, schema: materialsResponseSchema },
    },
    async ({ auth, query }) => ({
      items: await materials!.list(auth!.companyId, query as MaterialListQuery),
    }),
  );

  add(
    {
      method: 'post',
      path: '/materials',
      summary: '자재 추가 (이름과 단위만으로 가능, 입력하다 목록에 없을 때 바로 추가)',
      auth: 'required',
      request: { body: materialCreateSchema },
      response: { status: 201, schema: materialSchema },
    },
    async ({ auth, body }) => {
      try {
        return await materials!.create(auth!.companyId, body as MaterialCreate);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/materials/{id}',
      summary: '자재 수정·숨기기 (기록이 있으면 단위는 바꿀 수 없음)',
      auth: 'required',
      request: { params: materialParamsSchema, body: materialUpdateSchema },
      response: { status: 200, schema: materialSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await materials!.update(
          auth!.companyId,
          (params as { id: string }).id,
          body as MaterialUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/projects/{projectId}/material-records',
      summary: '자재 기록 한 건 (반입·사용·반출·폐기)',
      auth: 'required',
      request: { params: projectFileParamsSchema, body: materialRecordCreateSchema },
      response: { status: 201, schema: materialRecordSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await materials!.createRecord(
          auth!.companyId,
          auth!.userId,
          (params as { projectId: string }).projectId,
          body as MaterialRecordCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/projects/{projectId}/material-records/batch',
      summary: '자재 기록 여러 건 한꺼번에 (목록형 입력, 한 건이라도 잘못되면 전부 저장하지 않음)',
      auth: 'required',
      request: { params: projectFileParamsSchema, body: materialRecordBatchSchema },
      response: { status: 201, schema: materialRecordBatchResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return {
          items: await materials!.createRecords(
            auth!.companyId,
            auth!.userId,
            (params as { projectId: string }).projectId,
            body as MaterialRecordBatch,
          ),
        };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{projectId}/material-records',
      summary: '프로젝트 자재 기록 (날짜 최근순, 날짜·자재·구분 필터, 커서 방식)',
      auth: 'required',
      request: { params: projectFileParamsSchema, query: materialRecordListQuerySchema },
      response: { status: 200, schema: materialRecordsResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return await materials!.listRecords(
          auth!.companyId,
          (params as { projectId: string }).projectId,
          query as MaterialRecordListQuery,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{projectId}/material-balance',
      summary: '프로젝트별 자재 현황 (자재마다 반입·사용·반출·폐기 합계와 잔량, 마이너스 경고)',
      auth: 'required',
      request: { params: projectFileParamsSchema },
      response: { status: 200, schema: materialBalanceResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await materials!.balance(
          auth!.companyId,
          (params as { projectId: string }).projectId,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/material-records/{id}',
      summary: '자재 기록 수정',
      auth: 'required',
      request: { params: materialRecordParamsSchema, body: materialRecordUpdateSchema },
      response: { status: 200, schema: materialRecordSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await materials!.updateRecord(
          auth!.companyId,
          (params as { id: string }).id,
          body as MaterialRecordUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'delete',
      path: '/material-records/{id}',
      summary: '자재 기록 삭제 (소프트 삭제)',
      auth: 'required',
      request: { params: materialRecordParamsSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        await materials!.removeRecord(auth!.companyId, (params as { id: string }).id);

        return { success: true };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
