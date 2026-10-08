import {
  REPORT_XLSX_CONTENT_TYPE,
  dailyReportParamsSchema,
  dailyReportSchema,
  projectFileParamsSchema,
  reportExportQuerySchema,
  successResponseSchema,
  type ReportExportQuery,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { ReportError, type ReportService } from '../report/reportService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

const toAppError = (error: unknown): unknown =>
  error instanceof ReportError ? new AppError('NOT_FOUND') : error;

/**
 * @description 작업일보·내보내기 라우트. 회사 ID는 세션에서만 얻는다
 * @param registry 라우트 등록소
 * @param reports 보고서 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerReportRoutes = (registry: RouteRegistry, reports?: ReportService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, reports ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/projects/{projectId}/daily-reports/{date}',
      summary: '작업일보 한 장 (그날의 일지·인원·공수·자재·사진, 인쇄·PDF용)',
      auth: 'required',
      request: { params: dailyReportParamsSchema },
      response: { status: 200, schema: dailyReportSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        const { projectId, date } = params as { projectId: string; date: string };

        return await reports!.daily(auth!.companyId, projectId, date);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{projectId}/daily-reports.xlsx',
      summary: '작업일보 엑셀 내보내기 (기간 안의 일지·공수·자재 시트, 내보낸 기록이 남음)',
      auth: 'required',
      request: { params: projectFileParamsSchema, query: reportExportQuerySchema },
      response: { status: 200, schema: successResponseSchema },
      file: { contentType: REPORT_XLSX_CONTENT_TYPE },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return await reports!.exportXlsx(
          auth!.companyId,
          auth!.userId,
          (params as { projectId: string }).projectId,
          query as ReportExportQuery,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
