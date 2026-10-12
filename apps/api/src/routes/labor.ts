import {
  employeeParamsSchema,
  laborCostSchema,
  payRateCreateSchema,
  payRateSchema,
  payRatesResponseSchema,
  projectParamsSchema,
  type PayRateCreate,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { LaborError, type LaborService } from '../labor/laborService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof LaborError)) {
    return error;
  }

  return error.code === 'NOT_FOUND'
    ? new AppError('NOT_FOUND')
    : new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 직원 단가표·프로젝트 인건비 라우트 (민감 정보). 회사 ID·조작자는 세션에서만 얻고,
 * 단가 기록의 수정·삭제 API는 없으며 조회·변경은 모두 감사 기록으로 남는다
 * @param registry 라우트 등록소
 * @param labor 단가·인건비 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerLaborRoutes = (registry: RouteRegistry, labor?: LaborService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, labor ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/employees/{id}/pay-rates',
      summary: '직원 단가 기록 (적용 시작일 최근순, 조회는 감사 기록으로 남음)',
      auth: 'required',
      request: { params: employeeParamsSchema },
      response: { status: 200, schema: payRatesResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return {
          items: await labor!.listRates(
            auth!.companyId,
            auth!.userId,
            (params as { id: string }).id,
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
      path: '/employees/{id}/pay-rates',
      summary:
        '직원 단가 추가 (기존 단가는 고치지 않고 적용 시작일부터 새 단가, 감사 기록으로 남음)',
      auth: 'required',
      request: { params: employeeParamsSchema, body: payRateCreateSchema },
      response: { status: 201, schema: payRateSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await labor!.createRate(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as PayRateCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{id}/labor-cost',
      summary:
        '프로젝트 인건비 최소 추정 (실제 공수 × 근무일 단가, 계획 공수 기준 예상, 조회는 감사 기록으로 남음)',
      auth: 'required',
      request: { params: projectParamsSchema },
      response: { status: 200, schema: laborCostSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await labor!.projectCost(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
