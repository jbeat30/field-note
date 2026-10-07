import {
  employeeCreateSchema,
  employeeDetailSchema,
  employeeListQuerySchema,
  employeeParamsSchema,
  employeeUpdateSchema,
  employeesResponseSchema,
  type EmployeeCreate,
  type EmployeeListQuery,
  type EmployeeUpdate,
} from '@field-note/shared';

import { EmployeeError, type EmployeeService } from '../employee/employeeService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof EmployeeError)) {
    return error;
  }

  switch (error.code) {
    case 'NOT_FOUND':
      return new AppError('NOT_FOUND');
    case 'LIMIT':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body', message: '직원은 회사마다 500명까지 등록할 수 있습니다' },
      ]);
    case 'INVALID':
      return new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
  }
};

/**
 * @description 직원 카드 라우트. 회사 ID는 세션에서만 얻는다
 * 삭제 API는 없다 (퇴사는 상태 변경, 개인정보 정정·삭제 요청은 익명화로 처리 예정)
 * @param registry 라우트 등록소
 * @param employees 직원 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerEmployeeRoutes = (registry: RouteRegistry, employees?: EmployeeService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, employees ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/employees',
      summary: '직원 목록 (생년월일·연락처 제외, 상태·직종·구분·이름 필터)',
      auth: 'required',
      request: { query: employeeListQuerySchema },
      response: { status: 200, schema: employeesResponseSchema },
    },
    async ({ auth, query }) => ({
      items: await employees!.list(auth!.companyId, query as EmployeeListQuery),
    }),
  );

  add(
    {
      method: 'post',
      path: '/employees',
      summary: '직원 등록 (이름만으로도 가능)',
      auth: 'required',
      request: { body: employeeCreateSchema },
      response: { status: 201, schema: employeeDetailSchema },
    },
    async ({ auth, body }) => {
      try {
        return await employees!.create(auth!.companyId, body as EmployeeCreate);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/employees/{id}',
      summary: '직원 카드 (생년월일·연락처 포함)',
      auth: 'required',
      request: { params: employeeParamsSchema },
      response: { status: 200, schema: employeeDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await employees!.get(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/employees/{id}',
      summary: '직원 정보 수정·상태 변경 (퇴사·재입사 포함)',
      auth: 'required',
      request: { params: employeeParamsSchema, body: employeeUpdateSchema },
      response: { status: 200, schema: employeeDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await employees!.update(
          auth!.companyId,
          (params as { id: string }).id,
          body as EmployeeUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
