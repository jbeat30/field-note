import {
  partnerCreateSchema,
  partnerDetailSchema,
  partnerListQuerySchema,
  partnerParamsSchema,
  partnerUpdateSchema,
  partnersResponseSchema,
  type PartnerCreate,
  type PartnerListQuery,
  type PartnerUpdate,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { PartnerError, type PartnerService } from '../partner/partnerService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof PartnerError)) {
    return error;
  }

  switch (error.code) {
    case 'NOT_FOUND':
      return new AppError('NOT_FOUND');
    case 'DUPLICATE':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.name', message: '같은 구분에 이미 같은 상호가 있습니다' },
      ]);
    case 'LIMIT':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body', message: '명부는 회사마다 1000곳까지 등록할 수 있습니다' },
      ]);
  }
};

/**
 * @description 고객·협력업체·자재 공급처 명부 라우트. 회사 ID는 세션에서만 얻는다 (삭제 API 없음, 숨김 처리)
 * @param registry 라우트 등록소
 * @param partners 명부 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerPartnerRoutes = (registry: RouteRegistry, partners?: PartnerService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, partners ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/partners',
      summary: '고객·협력업체·자재 공급처 목록 (연락처·메모 제외, 구분·이름 검색)',
      auth: 'required',
      request: { query: partnerListQuerySchema },
      response: { status: 200, schema: partnersResponseSchema },
    },
    async ({ auth, query }) => ({
      items: await partners!.list(auth!.companyId, query as PartnerListQuery),
    }),
  );

  add(
    {
      method: 'post',
      path: '/partners',
      summary: '명부 등록 (구분과 상호만으로 가능)',
      auth: 'required',
      request: { body: partnerCreateSchema },
      response: { status: 201, schema: partnerDetailSchema },
    },
    async ({ auth, body }) => {
      try {
        return await partners!.create(auth!.companyId, body as PartnerCreate);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/partners/{id}',
      summary: '명부 카드 (연락처·메모 포함)',
      auth: 'required',
      request: { params: partnerParamsSchema },
      response: { status: 200, schema: partnerDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await partners!.get(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/partners/{id}',
      summary: '명부 수정·숨기기 (구분은 바꿀 수 없음)',
      auth: 'required',
      request: { params: partnerParamsSchema, body: partnerUpdateSchema },
      response: { status: 200, schema: partnerDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await partners!.update(
          auth!.companyId,
          (params as { id: string }).id,
          body as PartnerUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
