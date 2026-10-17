import {
  REPORT_XLSX_CONTENT_TYPE,
  monthlyCloseSchema,
  monthlyHoursQuerySchema,
  monthlyHoursSchema,
  monthlyReopenSchema,
  successResponseSchema,
  type MonthlyClose,
  type MonthlyHoursQuery,
  type MonthlyReopen,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { MonthlyError, type MonthlyService } from '../monthly/monthlyService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown =>
  error instanceof MonthlyError ? new AppError('VALIDATION_ERROR', [error.detail]) : error;

/**
 * @description 월 공수 확정·월 공수표 라우트, 회사 ID·확정자는 세션에서만 획득, 확정·재오픈 이력 보존과 삭제 API 없음
 * @param registry 라우트 등록소
 * @param monthly 월 공수 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerMonthlyRoutes = (registry: RouteRegistry, monthly?: MonthlyService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, monthly ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/monthly-hours',
      summary:
        '월 공수표 (프로젝트 × 직원별 저장된 작업 내역 공수, 확정 상태·확정 당시 기준값·임시 저장 작업 내역·이력)',
      auth: 'required',
      request: { query: monthlyHoursQuerySchema },
      response: { status: 200, schema: monthlyHoursSchema },
      errors: [],
    },
    async ({ auth, query }) => {
      try {
        return await monthly!.get(auth!.companyId, (query as MonthlyHoursQuery).month);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/monthly-hours/close',
      summary:
        '월 공수 확정 (이번 달까지, 임시 저장 작업 내역이 남아 있으면 확인 필요, 확정 당시 기준값 고정, 이력에 남음)',
      auth: 'required',
      request: { body: monthlyCloseSchema },
      response: { status: 200, schema: monthlyHoursSchema },
      errors: [],
    },
    async ({ auth, body }) => {
      try {
        return await monthly!.close(auth!.companyId, auth!.userId, body as MonthlyClose);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/monthly-hours/reopen',
      summary:
        '월 공수 재오픈 (사유 필수, 이력에 남음). 재오픈하면 그달의 작업 내역을 다시 고칠 수 있다',
      auth: 'required',
      request: { body: monthlyReopenSchema },
      response: { status: 200, schema: monthlyHoursSchema },
      errors: [],
    },
    async ({ auth, body }) => {
      try {
        return await monthly!.reopen(auth!.companyId, auth!.userId, body as MonthlyReopen);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/monthly-hours.xlsx',
      summary: '월 공수표 엑셀 내보내기 (급여·정산 담당에게 전달하는 용도, 내보낸 기록이 남음)',
      auth: 'required',
      request: { query: monthlyHoursQuerySchema },
      response: { status: 200, schema: successResponseSchema },
      file: { contentType: REPORT_XLSX_CONTENT_TYPE },
      errors: [],
    },
    async ({ auth, query }) => {
      try {
        return await monthly!.exportXlsx(
          auth!.companyId,
          auth!.userId,
          (query as MonthlyHoursQuery).month,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
