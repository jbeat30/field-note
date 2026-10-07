import {
  optionCreateSchema,
  optionItemSchema,
  optionParamsSchema,
  optionReorderSchema,
  optionUpdateSchema,
  optionsResponseSchema,
  successResponseSchema,
  type OptionCreate,
  type OptionReorder,
  type OptionUpdate,
} from '@field-note/shared';

import { OptionError, type OptionService } from '../company/optionService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof OptionError)) {
    return error;
  }

  switch (error.code) {
    case 'NOT_FOUND':
      return new AppError('NOT_FOUND');
    case 'DUPLICATE':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.name', message: '이미 같은 이름이 있습니다' },
      ]);
    case 'LIMIT':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.name', message: '항목은 종류마다 100개까지 만들 수 있습니다' },
      ]);
    case 'ORDER_MISMATCH':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.ids', message: '목록이 바뀌었습니다. 새로 고친 뒤 다시 시도해 주세요' },
      ]);
  }
};

/**
 * @description 선택 목록 관리 라우트 (직종·작업 구분·공종·직원 구분). 회사 ID는 세션에서만 얻는다
 * @param registry 라우트 등록소
 * @param options 선택 목록 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerOptionRoutes = (registry: RouteRegistry, options?: OptionService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, options ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/company/options',
      summary: '선택 목록 전체 조회 (직종·작업 구분·공종·직원 구분, 처음에는 프리셋으로 채움)',
      auth: 'required',
      response: { status: 200, schema: optionsResponseSchema },
    },
    async ({ auth }) => ({ items: await options!.list(auth!.companyId) }),
  );

  add(
    {
      method: 'post',
      path: '/company/options',
      summary: '선택 목록 항목 추가',
      auth: 'required',
      request: { body: optionCreateSchema },
      response: { status: 201, schema: optionItemSchema },
    },
    async ({ auth, body }) => {
      try {
        return await options!.create(auth!.companyId, body as OptionCreate);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  // 정적 경로(order)를 `{id}`보다 먼저 등록해 경로가 겹치지 않게 함
  add(
    {
      method: 'put',
      path: '/company/options/order',
      summary: '선택 목록 순서 변경 (해당 종류의 모든 항목을 원하는 순서로)',
      auth: 'required',
      request: { body: optionReorderSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, body }) => {
      const { kind, ids } = body as OptionReorder;

      try {
        await options!.reorder(auth!.companyId, kind, ids);
      } catch (error) {
        throw toAppError(error);
      }

      return { success: true };
    },
  );

  add(
    {
      method: 'patch',
      path: '/company/options/{id}',
      summary: '선택 목록 항목 이름 변경·숨기기',
      auth: 'required',
      request: { params: optionParamsSchema, body: optionUpdateSchema },
      response: { status: 200, schema: optionItemSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await options!.update(
          auth!.companyId,
          (params as { id: string }).id,
          body as OptionUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
